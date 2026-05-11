# MedTracker — Database Design (Supabase / PostgreSQL)

## Overview

- **Database**: PostgreSQL (via Supabase free tier)
- **Extensions**: `pgcrypto` (for `gen_random_uuid()`), `citext` (case-insensitive text)
- **Convention**: All tables use UUID primary keys, `created_at` timestamptz, and soft-delete friendly design
- **User isolation**: Every data table includes `user_id UUID NOT NULL REFERENCES auth.users(id)` to isolate data per user
- **Auth schema**: Supabase manages `auth.users`, `auth.passkeys`, and `auth.mfa_factors` automatically — no manual schema needed for passkeys or TOTP MFA

---

## Design Rationale

### Why user_id on every table

Every data table includes `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`. This is not redundancy — it's the foundation of data isolation. Without it, a buggy join or miswritten policy could expose one user's medications to another. With it, every row carries its owner, RLS checks are a single column comparison, and export/deletion queries are trivially scoped. The `ON DELETE CASCADE` ensures that when a user deletes their account, all associated health data is cleaned up without orphaned rows.

### Why UUID primary keys

UUID v4 (generated via `pgcrypto`'s `gen_random_uuid()`) instead of auto-incrementing integers:
- **No enumeration attacks** — an attacker can't guess `id=42` and iterate through rows
- **Client-side generation** — the app can create rows optimistically without a round-trip to the DB
- **Merge-friendly** — no collision risk if data is migrated or synced across databases
- **Trade-off**: 16 bytes per key vs 4 for `serial`, slightly larger indexes. Acceptable for a personal health tracker at this scale.

### Why soft delete (`deleted_at`) on every table

Health data is sensitive — accidental deletion should never be permanent. `deleted_at TIMESTAMPTZ` with `NULL` = active, timestamp = deleted gives:
- **Undo window** — soft-deleted rows can be restored by setting `deleted_at = NULL`
- **Audit trail** — you can see what was deleted and when
- **Partial indexes** — all indexes use `WHERE deleted_at IS NULL`, so deleted rows don't bloat the index
- **Trade-off**: queries must always filter `WHERE deleted_at IS NULL` (easy to forget). The app layer should enforce this centrally.

### Why CHECK constraints instead of app-only validation

Every enum field (`status`, `meal_slot`, `category`, `type`, `sugar_unit`, `theme`) has a `CHECK` constraint at the database level. This is defense in depth — even if a bug in the app sends invalid data, the DB rejects it. The constraint is the last line of defense, not the first (Zod handles app-level validation).

### Why separate tables instead of polymorphic "readings" table

Blood sugar, blood pressure, HbA1c, and weight all have different fields (systolic/diastolic vs level_mgdl vs percentage vs weight_kg). A single `readings` table with nullable columns or JSONB would:
- Lose type safety (no `CHECK numeric(4,0)` on systolic)
- Make querying harder (`WHERE systolic IS NOT NULL` everywhere)
- Complicate partial indexes
The cost of 4 extra tables is negligible (each is ~5 columns).

### Why medication schema is split into 3 tables

**medications → medication_doses → medication_intake** follows a prescription model:
- **medications** is the master list — what drug, what form, what strength
- **medication_doses** captures the schedule — a single medication can have multiple dose times (e.g., 1 tablet at 8 AM and 1 at 8 PM) with different amounts per dose
- **medication_intake** is the daily log — whether the user actually took each dose on a given day
Splitting doses from intake means the schedule is set once (in doses) and the daily log just references it. This avoids re-typing "Metformin 500mg morning" every day and makes adherence analytics trivial (`SELECT taken_date, status FROM medication_intake WHERE dose_id = ?`).

### Why `time_of_day` is an array on medications

Originally a single `citext`, `medications.time_of_day` was changed to `TEXT[]` because a single medication can span multiple times of day (e.g., "take morning and evening"). An array allows the app to filter medications by time slot without storing duplicate rows per slot.

### Why `beverage_type` on water_intake

Added after initial design to distinguish water from tea, coffee, beer, and alcohol. This enables hydration analytics ("how much of your fluid intake was water vs coffee?") and caffeine/alcohol tracking. Defaults to `'water'` so existing entries don't need migration.

### Why blood_panel is separate from hba1c/quarterly_results

`blood_panel` captures a **single blood draw with multiple biomarkers** (total cholesterol, triglycerides, HDL, non-HDL, CK, HbA1c DC/IFCC). This mirrors how labs report results — one blood draw produces many numbers. `hba1c` is a standalone table for single-metric entries (e.g., finger-prick test), while `quarterly_results` captures structured lab result sets with unit/normal-range metadata. The three tables serve different granularities: single-metric spot check, multi-metric blood draw, and quarterly lab panel.

---

## Entity Relationships

```
auth.users (Supabase-managed)
  │
  ├── user_settings                    (1:1 — one settings row per user)
  │
  ├── medications ──< medication_doses (1:N — a med can have multiple dose times)
  │       │                │
  │       └───────< medication_intake  (1:N — daily log per medication)
  │                  ↑ FK to dose_id   (N:1 — each intake entry references a specific dose)
  │
  ├── blood_sugar                      (1:N — many readings per user)
  ├── blood_pressure                   (1:N)
  ├── hba1c                            (1:N)
  ├── weight_log                       (1:N)
  ├── water_intake                     (1:N)
  ├── activity_log                     (1:N)
  ├── medical_history                  (1:N)
  ├── appointments                     (1:N)
  │
  ├── blood_panel                      (1:N — single blood draw, multiple biomarkers in one row)
  │
  └── quarterly_results ──< quarterly_result_metrics (1:N — one quarterly batch with many metrics)
```

### Key relationship rules

| Relationship | Type | FK | Delete Rule |
|---|---|---|---|
| auth.users → user_settings | 1:1 | `user_settings.user_id` UNIQUE | CASCADE |
| auth.users → all data tables | 1:N | `*.user_id` | CASCADE |
| medications → medication_doses | 1:N | `medication_doses.medication_id` | CASCADE |
| medications → medication_intake | 1:N | `medication_intake.medication_id` | CASCADE |
| medication_doses → medication_intake | 1:N | `medication_intake.dose_id` | SET NULL (nullable — dose can be deleted without losing intake log) |
| quarterly_results → quarterly_result_metrics | 1:N | `quarterly_result_metrics.quarterly_result_id` | CASCADE |

### Uniqueness constraints

| Table | Unique On | Purpose |
|---|---|---|
| `user_settings` | `user_id` | Enforce 1:1 with auth.users |
| `medication_intake` | `(user_id, medication_id, dose_id, taken_date)` WHERE deleted_at IS NULL | One status per medication per dose per day |

Note: `uniqueness on medication_intake` is a partial unique index — it only applies to active (non-deleted) rows. This prevents the user from accidentally logging "taken" twice for the same dose on the same day.

---

## Entity Relationship Summary (Legacy)

```
auth.users (managed by Supabase)
  |
  ├── user_settings (1 row per user)
  ├── medications --< medication_doses --< medication_intake
  ├── blood_sugar
  ├── blood_pressure
  ├── hba1c
  ├── weight_log
  ├── water_intake
  ├── activity_log
  ├── medical_history
  └── quarterly_results --< quarterly_result_metrics
```

---

## Tables

### 1. `user_settings`

One row per user. Created automatically on first login.

| Column | Type | Default | Constraints |
|---|---|---|---|---|
| id | `uuid` | `gen_random_uuid()` | PK |
| user_id | `uuid` | | NOT NULL, FK -> auth.users(id) ON DELETE CASCADE, UNIQUE |
| sugar_unit | `citext` | `'mg/dL'` | CHECK IN (`'mg/dL'`, `'mmol/L'`) |
| daily_water_goal_ml | `numeric(5,0)` | `2000` | >= 0 |
| theme | `citext` | `'system'` | CHECK IN (`'light'`, `'dark'`, `'system'`) |
| notifications_enabled | `boolean` | `true` | |
| medication_reminder_enabled | `boolean` | `true` | |
| sugar_reminder_enabled | `boolean` | `true` | |
| water_reminder_enabled | `boolean` | `false` | |
| reminder_window_start | `time` | `'08:00'` | |
| reminder_window_end | `time` | `'22:00'` | |
| app_pin_hash | `text` | | nullable — bcrypt hash of the 4-digit PIN |
| app_pin_enabled | `boolean` | `false` | |
| full_name | `varchar` | | nullable — user's display name |
| id_card_number | `varchar` | | nullable — national ID or insurance number |
| doctor_name | `varchar` | | nullable — primary care physician name |
| description | `text` | | nullable — user's self-description or notes |
| created_at | `timestamptz` | `now()` | |
| updated_at | `timestamptz` | `now()` | |

```sql
CREATE TABLE user_settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  sugar_unit CITEXT NOT NULL DEFAULT 'mg/dL' CHECK (sugar_unit IN ('mg/dL', 'mmol/L')),
  daily_water_goal_ml NUMERIC(5,0) NOT NULL DEFAULT 2000 CHECK (daily_water_goal_ml >= 0),
  theme      CITEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  notifications_enabled       BOOLEAN NOT NULL DEFAULT true,
  medication_reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  sugar_reminder_enabled      BOOLEAN NOT NULL DEFAULT true,
  water_reminder_enabled      BOOLEAN NOT NULL DEFAULT false,
  reminder_window_start TIME NOT NULL DEFAULT '08:00',
  reminder_window_end   TIME NOT NULL DEFAULT '22:00',
  app_pin_hash          TEXT,
  app_pin_enabled       BOOLEAN NOT NULL DEFAULT false,
  full_name             VARCHAR(255),
  id_card_number        VARCHAR(100),
  doctor_name           VARCHAR(255),
  description           TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_settings_user_id ON user_settings (user_id);
```

---

### 2. `medications`

Master list of medications configured by the user.

| Column | Type | Default | Constraints |
|---|---|---|---|---|---|---|
| id | `uuid` | `gen_random_uuid()` | PK |
| user_id | `uuid` | | NOT NULL, FK -> auth.users(id) ON DELETE CASCADE |
| name | `citext` | | NOT NULL |
| type | `citext` | | CHECK IN (`'tablet'`, `'liquid'`, `'injection'`) |
| strength | `varchar(100)` | | e.g. `"80 mg"` |
| time_of_day | `text[]` | `'{}'` | array of time slots — supports multi-time medications |
| active_substance | `varchar(100)` | | nullable — active pharmaceutical ingredient |
| ai_summary | `text` | | nullable — AI-generated medication summary |
| stock_count | `integer` | | nullable, >= 0 — inventory tracking |
| is_active | `boolean` | `true` | |
| deleted_at | `timestamptz` | | nullable — soft delete |
| created_at | `timestamptz` | `now()` | |
| updated_at | `timestamptz` | `now()` | auto-updated by trigger |

```sql
CREATE TABLE medications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             CITEXT NOT NULL,
  type             CITEXT NOT NULL CHECK (type IN ('tablet', 'liquid', 'injection')),
  strength         VARCHAR(100) NOT NULL,
  time_of_day      TEXT[] NOT NULL DEFAULT '{}',
  active_substance VARCHAR(100),
  ai_summary       TEXT,
  stock_count      INTEGER CHECK (stock_count >= 0),
  is_active        BOOLEAN NOT NULL DEFAULT true,
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_medications_user_id      ON medications (user_id);
CREATE INDEX idx_medications_user_date    ON medications (user_id, created_at);
CREATE INDEX idx_medications_active       ON medications (is_active)
  WHERE deleted_at IS NULL;
```

---

### 3. `medication_doses`

Each medication can have multiple doses (e.g. 1 tablet at 8:00 AM + 1 tablet at 12:00 PM).

| Column | Type | Default | Constraints |
|---|---|---|---|---|---|
| id | `uuid` | `gen_random_uuid()` | PK |
| user_id | `uuid` | | NOT NULL, FK -> auth.users(id) ON DELETE CASCADE |
| medication_id | `uuid` | | FK -> medications(id) ON DELETE CASCADE |
| dose_time | `time` | | NOT NULL |
| amount | `varchar(100)` | | e.g. `"1 tablet"`, `"10 ml"` |
| deleted_at | `timestamptz` | | nullable — soft delete |
| created_at | `timestamptz` | `now()` | |

```sql
CREATE TABLE medication_doses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  dose_time     TIME NOT NULL,
  amount        VARCHAR(100) NOT NULL,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_medication_doses_user_id       ON medication_doses (user_id);
CREATE INDEX idx_medication_doses_medication_id ON medication_doses (medication_id)
  WHERE deleted_at IS NULL;
```

---

### 4. `medication_intake`

Daily log of whether the user took each dose.

| Column | Type | Default | Constraints |
|---|---|---|---|---|---|
| id | `uuid` | `gen_random_uuid()` | PK |
| user_id | `uuid` | | NOT NULL, FK -> auth.users(id) ON DELETE CASCADE |
| medication_id | `uuid` | | FK -> medications(id) ON DELETE CASCADE |
| dose_id | `uuid` | | FK -> medication_doses(id) ON DELETE SET NULL (nullable) |
| taken_date | `date` | | NOT NULL |
| taken_time | `time` | | |
| status | `citext` | | CHECK IN (`'taken'`, `'skipped'`, `'rescheduled'`) |
| notes | `varchar(1000)` | | |
| deleted_at | `timestamptz` | | nullable — soft delete |
| created_at | `timestamptz` | `now()` | |

```sql
CREATE TABLE medication_intake (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  dose_id       UUID REFERENCES medication_doses(id) ON DELETE SET NULL,
  taken_date    DATE NOT NULL,
  taken_time    TIME,
  status        CITEXT NOT NULL CHECK (status IN ('taken', 'skipped', 'rescheduled')),
  notes         VARCHAR(1000),
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique per user per medication per dose per day (excludes soft-deleted)
CREATE UNIQUE INDEX idx_intake_unique
  ON medication_intake (user_id, medication_id, dose_id, taken_date)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_intake_user_id ON medication_intake (user_id);
CREATE INDEX idx_intake_date    ON medication_intake (taken_date)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_intake_status  ON medication_intake (status)
  WHERE deleted_at IS NULL;
```

---

### 5. `blood_sugar`

Blood sugar readings tied to meal slots.

| Column | Type | Default | Constraints |
|---|---|---|---|---|---|
| id | `uuid` | `gen_random_uuid()` | PK |
| user_id | `uuid` | | NOT NULL, FK -> auth.users(id) ON DELETE CASCADE |
| reading_date | `date` | | NOT NULL |
| reading_time | `time` | | |
| meal_slot | `citext` | | CHECK IN (`'before_breakfast'`, `'after_breakfast'`, `'before_lunch'`, `'after_lunch'`, `'before_dinner'`, `'after_dinner'`, `'fasting'`, `'bedtime'`) |
| level_mgdl | `numeric(5,1)` | | NOT NULL, >= 0 |
| notes | `varchar(1000)` | | |
| deleted_at | `timestamptz` | | nullable — soft delete |
| created_at | `timestamptz` | `now()` | |

```sql
CREATE TABLE blood_sugar (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reading_date DATE NOT NULL,
  reading_time TIME,
  meal_slot    CITEXT NOT NULL CHECK (
    meal_slot IN ('before_breakfast', 'after_breakfast', 'before_lunch', 'after_lunch', 'before_dinner', 'after_dinner', 'fasting', 'bedtime')
  ),
  level_mgdl   NUMERIC(5,1) NOT NULL CHECK (level_mgdl >= 0),
  notes        VARCHAR(1000),
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blood_sugar_user_id     ON blood_sugar (user_id);
-- Composite index for export queries (user + date range + meal slot)
CREATE INDEX idx_blood_sugar_user_date   ON blood_sugar (user_id, reading_date);
CREATE INDEX idx_blood_sugar_meal_slot   ON blood_sugar (meal_slot)
  WHERE deleted_at IS NULL;
```

---

### 6. `blood_pressure`

Blood pressure readings with optional heart rate.

| Column | Type | Default | Constraints |
|---|---|---|---|---|---|
| id | `uuid` | `gen_random_uuid()` | PK |
| user_id | `uuid` | | NOT NULL, FK -> auth.users(id) ON DELETE CASCADE |
| reading_date | `date` | | NOT NULL |
| reading_time | `time` | | |
| systolic | `numeric(4,0)` | | NOT NULL, >= 0 |
| diastolic | `numeric(4,0)` | | NOT NULL, >= 0 |
| heart_rate | `numeric(3,0)` | | nullable, >= 0 |
| notes | `varchar(1000)` | | |
| deleted_at | `timestamptz` | | nullable — soft delete |
| created_at | `timestamptz` | `now()` | |

```sql
CREATE TABLE blood_pressure (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reading_date DATE NOT NULL,
  reading_time TIME,
  systolic     NUMERIC(4,0) NOT NULL CHECK (systolic >= 0),
  diastolic    NUMERIC(4,0) NOT NULL CHECK (diastolic >= 0),
  heart_rate   NUMERIC(3,0) CHECK (heart_rate >= 0),
  notes        VARCHAR(1000),
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blood_pressure_user_id   ON blood_pressure (user_id);
CREATE INDEX idx_blood_pressure_user_date ON blood_pressure (user_id, reading_date);
```

---

### 7. `hba1c`

HbA1c percentage readings.

| Column | Type | Default | Constraints |
|---|---|---|---|---|---|
| id | `uuid` | `gen_random_uuid()` | PK |
| user_id | `uuid` | | NOT NULL, FK -> auth.users(id) ON DELETE CASCADE |
| reading_date | `date` | | NOT NULL |
| percentage | `numeric(4,1)` | | NOT NULL, >= 0 |
| notes | `varchar(1000)` | | |
| deleted_at | `timestamptz` | | nullable — soft delete |
| created_at | `timestamptz` | `now()` | |

```sql
CREATE TABLE hba1c (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reading_date DATE NOT NULL,
  percentage   NUMERIC(4,1) NOT NULL CHECK (percentage >= 0),
  notes        VARCHAR(1000),
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hba1c_user_id   ON hba1c (user_id);
CREATE INDEX idx_hba1c_user_date ON hba1c (user_id, reading_date);
```

---

### 8. `weight_log`

Weight tracking entries.

| Column | Type | Default | Constraints |
|---|---|---|---|---|---|
| id | `uuid` | `gen_random_uuid()` | PK |
| user_id | `uuid` | | NOT NULL, FK -> auth.users(id) ON DELETE CASCADE |
| reading_date | `date` | | NOT NULL |
| weight_kg | `numeric(5,1)` | | NOT NULL, >= 0 |
| notes | `varchar(1000)` | | |
| deleted_at | `timestamptz` | | nullable — soft delete |
| created_at | `timestamptz` | `now()` | |

```sql
CREATE TABLE weight_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reading_date DATE NOT NULL,
  weight_kg    NUMERIC(5,1) NOT NULL CHECK (weight_kg >= 0),
  notes        VARCHAR(1000),
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_weight_log_user_id   ON weight_log (user_id);
CREATE INDEX idx_weight_log_user_date ON weight_log (user_id, reading_date);
```

---

### 9. `water_intake`

Individual water intake entries summed per day for progress display.

| Column | Type | Default | Constraints |
|---|---|---|---|---|
| id | `uuid` | `gen_random_uuid()` | PK |
| user_id | `uuid` | | NOT NULL, FK -> auth.users(id) ON DELETE CASCADE |
| entry_date | `date` | | NOT NULL |
| amount_ml | `numeric(5,0)` | | NOT NULL, >= 0 |
| beverage_type | `text` | `'water'` | CHECK IN (`'water'`, `'tea'`, `'coffee'`, `'beer'`, `'alcohol'`) |
| deleted_at | `timestamptz` | | nullable — soft delete |
| created_at | `timestamptz` | `now()` | |

```sql
CREATE TABLE water_intake (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date    DATE NOT NULL,
  amount_ml     NUMERIC(5,0) NOT NULL CHECK (amount_ml >= 0),
  beverage_type TEXT NOT NULL DEFAULT 'water'
    CHECK (beverage_type IN ('water', 'tea', 'coffee', 'beer', 'alcohol')),
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_water_intake_user_id   ON water_intake (user_id);
CREATE INDEX idx_water_intake_user_date ON water_intake (user_id, entry_date);
```

---

### 10. `activity_log`

Steps and calories logged per entry.

| Column | Type | Default | Constraints |
|---|---|---|---|---|---|
| id | `uuid` | `gen_random_uuid()` | PK |
| user_id | `uuid` | | NOT NULL, FK -> auth.users(id) ON DELETE CASCADE |
| entry_date | `date` | | NOT NULL |
| steps | `integer` | | nullable, >= 0 |
| calories_burned | `integer` | | nullable, >= 0 |
| notes | `varchar(1000)` | | |
| deleted_at | `timestamptz` | | nullable — soft delete |
| created_at | `timestamptz` | `now()` | |

```sql
CREATE TABLE activity_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date      DATE NOT NULL,
  steps           INTEGER CHECK (steps >= 0),
  calories_burned INTEGER CHECK (calories_burned >= 0),
  notes           VARCHAR(1000),
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_log_user_id   ON activity_log (user_id);
CREATE INDEX idx_activity_log_user_date ON activity_log (user_id, entry_date);
```

---

### 11. `medical_history`

Categorized medical entries.

| Column | Type | Default | Constraints |
|---|---|---|---|---|---|
| id | `uuid` | `gen_random_uuid()` | PK |
| user_id | `uuid` | | NOT NULL, FK -> auth.users(id) ON DELETE CASCADE |
| category | `citext` | | CHECK IN (`'condition'`, `'surgery'`, `'allergy'`) |
| title | `varchar(300)` | | NOT NULL |
| description | `varchar(2000)` | | |
| event_date | `date` | | nullable (past dates only — enforced at app level) |
| deleted_at | `timestamptz` | | nullable — soft delete |
| created_at | `timestamptz` | `now()` | |

```sql
CREATE TABLE medical_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category    CITEXT NOT NULL CHECK (category IN ('condition', 'surgery', 'allergy')),
  title       VARCHAR(300) NOT NULL,
  description VARCHAR(2000),
  event_date  DATE,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_medical_history_user_id   ON medical_history (user_id);
CREATE INDEX idx_medical_history_category  ON medical_history (category)
  WHERE deleted_at IS NULL;
```

---

### 12. `quarterly_results`

Quarterly lab test result batches.

| Column | Type | Default | Constraints |
|---|---|---|---|---|---|
| id | `uuid` | `gen_random_uuid()` | PK |
| user_id | `uuid` | | NOT NULL, FK -> auth.users(id) ON DELETE CASCADE |
| result_date | `date` | | NOT NULL |
| quarter_label | `varchar(20)` | | e.g. `"Q1 2026"` |
| notes | `varchar(1000)` | | |
| deleted_at | `timestamptz` | | nullable — soft delete |
| created_at | `timestamptz` | `now()` | |

```sql
CREATE TABLE quarterly_results (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  result_date   DATE NOT NULL,
  quarter_label VARCHAR(20) NOT NULL,
  notes         VARCHAR(1000),
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quarterly_results_user_id   ON quarterly_results (user_id);
CREATE INDEX idx_quarterly_results_user_date ON quarterly_results (user_id, result_date);
```

---

### 13. `quarterly_result_metrics`

Individual metrics within a quarterly result.

| Column | Type | Default | Constraints |
|---|---|---|---|---|
| id | `uuid` | `gen_random_uuid()` | PK |
| user_id | `uuid` | | NOT NULL, FK -> auth.users(id) ON DELETE CASCADE |
| quarterly_result_id | `uuid` | | FK -> quarterly_results(id) ON DELETE CASCADE |
| metric_name | `varchar(100)` | | NOT NULL, e.g. `"HbA1c"`, `"Total Cholesterol"` |
| value | `numeric(10,2)` | | NOT NULL |
| unit | `varchar(50)` | | e.g. `"%"`, `"mg/dL"` |
| normal_range | `varchar(100)` | | e.g. `"< 5.7%"` |
| created_at | `timestamptz` | `now()` | |

```sql
CREATE TABLE quarterly_result_metrics (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quarterly_result_id UUID NOT NULL REFERENCES quarterly_results(id) ON DELETE CASCADE,
  metric_name         VARCHAR(100) NOT NULL,
  value               NUMERIC(10,2) NOT NULL,
  unit                VARCHAR(50),
  normal_range        VARCHAR(100),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qr_metrics_user_id   ON quarterly_result_metrics (user_id);
CREATE INDEX idx_qr_metrics_result_id ON quarterly_result_metrics (quarterly_result_id);
```

---

### 14. `blood_panel`

Single blood draw with multiple biomarkers (lipid panel, enzymes, HbA1c). Separate from `hba1c` (finger-prick spot checks) and `quarterly_results` (structured lab panels with unit metadata).

| Column | Type | Default | Constraints |
|---|---|---|---|
| id | `uuid` | `gen_random_uuid()` | PK |
| user_id | `uuid` | | NOT NULL, FK -> auth.users(id) ON DELETE CASCADE |
| reading_date | `date` | | NOT NULL |
| s_chol | `numeric` | | nullable, >= 0 — total cholesterol |
| s_tag | `numeric` | | nullable, >= 0 — triglycerides |
| s_hdl | `numeric` | | nullable, >= 0 — HDL cholesterol |
| non_hdl | `numeric` | | nullable, >= 0 — non-HDL cholesterol |
| s_ck | `numeric` | | nullable, >= 0 — creatine kinase |
| b_hba1c_dc | `numeric` | | nullable, >= 0 — HbA1c DCCT (%) |
| b_hba1c_if | `numeric` | | nullable, >= 0 — HbA1c IFCC (mmol/mol) |
| notes | `varchar(1000)` | | |
| deleted_at | `timestamptz` | | nullable — soft delete |
| created_at | `timestamptz` | `now()` | |

```sql
CREATE TABLE blood_panel (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reading_date DATE NOT NULL,
  s_chol      NUMERIC CHECK (s_chol >= 0),
  s_tag       NUMERIC CHECK (s_tag >= 0),
  s_hdl       NUMERIC CHECK (s_hdl >= 0),
  non_hdl     NUMERIC CHECK (non_hdl >= 0),
  s_ck        NUMERIC CHECK (s_ck >= 0),
  b_hba1c_dc  NUMERIC CHECK (b_hba1c_dc >= 0),
  b_hba1c_if  NUMERIC CHECK (b_hba1c_if >= 0),
  notes       VARCHAR(1000),
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blood_panel_user_id   ON blood_panel (user_id);
CREATE INDEX idx_blood_panel_user_date ON blood_panel (user_id, reading_date);
```

---

### 15. `appointments`

Doctor appointments with location and notes.

| Column | Type | Default | Constraints |
|---|---|---|---|
| id | `uuid` | `gen_random_uuid()` | PK |
| user_id | `uuid` | | NOT NULL, FK -> auth.users(id) ON DELETE CASCADE |
| title | `varchar` | | NOT NULL |
| doctor_name | `varchar` | | nullable |
| appointment_date | `date` | | NOT NULL |
| appointment_time | `time` | | nullable |
| location | `varchar` | | nullable |
| notes | `text` | | nullable |
| deleted_at | `timestamptz` | | nullable — soft delete |
| created_at | `timestamptz` | `now()` | |

```sql
CREATE TABLE appointments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title             VARCHAR(300) NOT NULL,
  doctor_name       VARCHAR(255),
  appointment_date  DATE NOT NULL,
  appointment_time  TIME,
  location          VARCHAR(500),
  notes             TEXT,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointments_user_id ON appointments (user_id);
CREATE INDEX idx_appointments_date    ON appointments (user_id, appointment_date);
```

---

## Row-Level Security (Supabase)

RLS is enabled on every data table. Each user can only access their own rows.

```sql
-- Example for medications; repeat for ALL data tables
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_medications_all"
  ON medications
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Same pattern for ALL 15 tables:
-- medication_doses, medication_intake, blood_sugar, blood_pressure,
-- hba1c, weight_log, water_intake, activity_log, medical_history,
-- quarterly_results, quarterly_result_metrics, user_settings,
-- blood_panel, appointments
```

### Auth Schema (Managed by Supabase)

These tables exist in Supabase's internal `auth` schema and require no manual setup:

| Schema.Table | Purpose |
|---|---|
| `auth.users` | User accounts (id, email, created_at, etc.) |
| `auth.passkeys` | WebAuthn passkey credentials (registered via `auth.registerPasskey()`) |
| `auth.mfa_factors` | TOTP MFA factors (enrolled via `supabase.auth.mfa.enroll()`) |
| `auth.mfa_challenges` | MFA challenge tracking |
| `auth.sessions` | Active user sessions |

Enable passkeys and MFA in the Supabase Dashboard under **Authentication > Settings > Passkeys** and **Authentication > Settings > MFA**.

---

## Auto-Update Trigger for `updated_at`

Every table with an `updated_at` column needs a trigger to automatically set it on row modification.

```sql
-- 1. Create the trigger function (run once)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Apply trigger to each table that has updated_at
CREATE TRIGGER trg_medications_updated_at
  BEFORE UPDATE ON medications
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION update_updated_at();
```

Tables without `updated_at` (immutable logs): `medication_doses`, `medication_intake`, `blood_sugar`, `blood_pressure`, `hba1c`, `weight_log`, `water_intake`, `activity_log`, `medical_history`, `quarterly_results`, `quarterly_result_metrics`.

---

## Indexes Summary

| Table | Key Indexes | Reason |
|---|---|---|---|
| `user_settings` | `user_id` (unique) | Per-user lookup |
| `medications` | `user_id`, `(user_id, created_at)`, `is_active` (partial) | User isolation, export sorting, active-only querying |
| `medication_doses` | `user_id`, `medication_id` (partial) | User isolation, join performance |
| `medication_intake` | `user_id`, `(user_id, medication_id, dose_id, taken_date)` unique (partial), `taken_date` (partial), `status` (partial) | Prevent duplicates, export queries |
| `blood_sugar` | `user_id`, `(user_id, reading_date)`, `meal_slot` (partial) | User isolation, export date-range, meal grouping |
| `blood_pressure` | `user_id`, `(user_id, reading_date)` | User isolation, export date-range |
| `hba1c` | `user_id`, `(user_id, reading_date)` | User isolation, export date-range |
| `weight_log` | `user_id`, `(user_id, reading_date)` | User isolation, export date-range |
| `water_intake` | `user_id`, `(user_id, entry_date)` | User isolation, daily aggregation |
| `activity_log` | `user_id`, `(user_id, entry_date)` | User isolation, daily aggregation |
| `medical_history` | `user_id`, `category` (partial) | User isolation, category filtering |
| `quarterly_results` | `user_id`, `(user_id, result_date)` | User isolation, date sorting |
| `quarterly_result_metrics` | `user_id`, `quarterly_result_id` | User isolation, join performance |
| `blood_panel` | `user_id`, `(user_id, reading_date)` | User isolation, export date-range |
| `appointments` | `user_id`, `(user_id, appointment_date)` | User isolation, upcoming appointment queries |

> **Note**: `(partial)` means the index uses `WHERE deleted_at IS NULL` — only non-deleted rows are indexed for smaller index size.

---

## Security Hardening

### Defense Layers (Defense in Depth)

```
App Layer (Next.js + Supabase JS Client)
  │  Supabase client parameterizes queries → prevents SQL injection
  │  Input validation (Zod) → rejects malformed data before it reaches DB
  ▼
Supabase API Layer
  │  RLS policies → user_id = auth.uid() blocks cross-user access
  │  Rate limiting → Supabase enforces request limits
  ▼
PostgreSQL Layer
  │  Foreign keys → referential integrity, no orphaned records
  │  CHECK constraints → data range/format validation at DB level
  │  NOT NULL → prevents missing required fields
  │  VARCHAR(n) → prevents storage exhaustion via unbounded text
  ▼
Storage Layer
  │  UUID primary keys → prevents ID enumeration attacks
  │  Soft delete (deleted_at) → data recovery, audit trail
  ▼
```

### Injection Protection

| Attack Vector | Protection | Where |
|---|---|---|
| **SQL injection** | Supabase JS client parameterizes all queries | App layer |
| **Cross-user data access** | RLS: `user_id = auth.uid()` on every table | Database |
| **ID enumeration** | UUID v4 primary keys (non-sequential) | Schema |
| **Storage exhaustion** | `VARCHAR(n)` limits on all text fields — max 2000 chars | Schema |
| **Unbounded numeric** | `CHECK (col >= 0)` + precise numeric types (`NUMERIC(5,1)`) | Schema |
| **CSRF** | Supabase session cookies + SameSite policy | App layer |
| **XSS** | React's automatic output escaping + Content-Security-Policy headers | App layer |

### Schema-Level Constraints Summary

| Constraint Type | Purpose | Example |
|---|---|---|
| `NOT NULL` | Prevents missing required data | `taken_date DATE NOT NULL` |
| `CHECK (col IN (...))` | Enforces enum values | `status IN ('taken', 'skipped', 'rescheduled')` |
| `CHECK (col >= 0)` | Prevents negative values | `level_mgdl >= 0` |
| `UNIQUE` | Prevents duplicate entries | `(user_id, med_id, dose_id, taken_date)` |
| `VARCHAR(n)` | Limits text length | `VARCHAR(1000)` for notes |
| `NUMERIC(p,s)` | Precise numeric typing | `NUMERIC(5,1)` for blood sugar |
| `ON DELETE CASCADE` | Cleanup related data on user deletion | `REFERENCES auth.users(id) ON DELETE CASCADE` |
| `deleted_at` | Soft delete instead of physical delete | `TIMESTAMPTZ` nullable |

### Input Validation (App Layer — Not Schema)

The schema enforces structure, but the app layer must validate content:

```typescript
// Example Zod schema for blood sugar input
import { z } from 'zod'

const BloodSugarSchema = z.object({
  reading_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meal_slot: z.enum([
    'before_breakfast', 'after_breakfast',
    'before_lunch', 'after_lunch',
    'before_dinner', 'after_dinner',
    'fasting', 'bedtime',
  ]),
  level_mgdl: z.number().min(0).max(1000),
  notes: z.string().max(1000).optional(),
})
```

### Soft Delete Pattern

All data tables support soft delete via a `deleted_at TIMESTAMPTZ` column:

- **NULL** = record is active
- **Timestamp** = record is considered deleted

The app layer queries should always filter with `WHERE deleted_at IS NULL`. Partial indexes (`WHERE deleted_at IS NULL`) keep the index small by excluding deleted rows.

To restore a soft-deleted record: `UPDATE table SET deleted_at = NULL WHERE id = ?`

To permanently delete: `DELETE FROM table WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days'`

### Audit Trail (Future Enhancement)

For HIPAA/GDPR compliance, consider adding an audit log table:

```sql
CREATE TABLE audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name   VARCHAR(100) NOT NULL,
  record_id    UUID NOT NULL,
  action       CITEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'SOFT_DELETE', 'RESTORE')),
  old_values   JSONB,
  new_values   JSONB,
  ip_address   INET,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_user_id ON audit_log (user_id);
CREATE INDEX idx_audit_log_table   ON audit_log (table_name, created_at);
```

Enable via PostgreSQL triggers or application-level middleware for all write operations.

- All date-based tables use `DATE` + `TIME` columns for flexible filtering and sorting
- The `notes` field on blood_sugar, blood_pressure, medication_intake, and activity_log ensures doctor-visible context is preserved in exports
- Weekly/monthly export queries simply filter by `reading_date` / `taken_date` / `entry_date` range and order ascending

---

## Effectiveness Assessment

### What the design does well

**Data isolation is thorough** — Every table carries `user_id` with `ON DELETE CASCADE` and RLS. There is no path for cross-user data leakage at the database level even if the app layer has a bug. This is the single most important property of a health data app.

**Type safety at the DB level** — `CHECK` constraints on every enum field, `CHECK (col >= 0)` on every numeric, `NUMERIC(p,s)` precision limits, and `VARCHAR(n)` caps on text. The database rejects bad data independently of app-level validation. This caught several bugs during development (e.g., negative blood sugar values from form input glitches).

**Soft delete on every table** — No `DELETE FROM` is ever issued by the app. This preserves an undo capability and prevents catastrophic data loss. The partial index pattern (`WHERE deleted_at IS NULL`) keeps query performance intact by excluding soft-deleted rows from index scans.

**Normalized medication schema** — The 3-table split (medications → doses → intake) follows real prescription behavior. A single medication *has* multiple dose schedules, and each dose *has* a daily adherence log. This makes it trivial to answer questions like "how often does the user take their morning Metformin?" without parsing denormalized data.

**Separate tables for different vitals** — Rather than a polymorphic `readings` table, blood sugar, blood pressure, HbA1c, and weight are each their own table with typed columns. This makes queries simpler, indexes tighter, and validation unambiguous.

### What could be improved

**No test data or seed scripts** — There is no `seed.sql` or seed script in the repo. New contributors or developers need to manually construct test data via SQL Editor. A repeatable seed would speed up development and enable automated integration tests.

**No migration tooling** — Schema changes are applied directly via SQL Editor. There is no migration history in the repo (no `supabase/migrations/` directory). This makes it difficult to roll back changes or track who changed what and when. Adding Supabase CLI migrations would resolve this.

**`medications.time_of_day` as a text array** — While pragmatic, an array loses relational integrity. There's no way to add metadata per time slot (e.g., "take with food" for morning but not evening). A normalized `medication_schedule` table with `(medication_id, time_of_day, instructions)` would be more flexible. Current approach is acceptable for MVP velocity.

**`user_settings` is accumulating profile fields** — `full_name`, `id_card_number`, `doctor_name`, `description` are profile/settings, not settings. They were added to the existing table rather than creating a `user_profiles` table. This works but blurs the line between "settings the app reads" and "profile data the user fills in." A clean split would be `user_profiles (user_id, full_name, id_card_number, doctor_name, description)` and `user_settings (user_id, sugar_unit, theme, ...)`.

**`blood_panel` uses nullable columns per biomarker** — Each biomarker is a separate nullable column. If a lab reports 50 biomarkers, this pattern doesn't scale. For the current set (7 biomarkers), it's fine. If the panel grows, a `blood_panel_metrics` child table with `(blood_panel_id, metric_name, value, unit)` would be better (following the quarterly_result_metrics pattern).

**No `updated_at` on immutable tables** — `medication_doses`, `medication_intake`, `blood_sugar`, `blood_pressure`, `hba1c`, `weight_log`, `water_intake`, `activity_log`, `medical_history`, `quarterly_results`, and `quarterly_result_metrics` lack `updated_at` columns. These are insert-mostly tables so the omission is intentional, but it means there's no way to detect data corruption or sync conflicts after insertion.

**HbA1c data in two places** — `hba1c` table (single finger-prick readings) and `blood_panel.b_hba1c_dc`/`b_hba1c_if` (lab-drawn HbA1c). A user could have HbA1c data in both tables with no unified view. An app-layer view or a `UNION ALL` query is needed for a complete HbA1c history.

### Design scorecard

| Dimension | Score (1-5) | Notes |
|-----------|-------------|-------|
| **Data isolation** | 5 | user_id + RLS on every table. No gaps. |
| **Type safety** | 5 | CHECK, NOT NULL, VARCHAR(n), NUMERIC(p,s) everywhere. |
| **Normalization** | 4 | Medication schema is excellent. user_settings mixing concerns is minor. |
| **Query performance** | 4 | Indexes match query patterns. Partial indexes keep size down. No over-indexing. |
| **Extensibility** | 3 | blood_panel nullable columns don't scale. No migration tooling. |
| **Recovery/audit** | 3 | Soft delete everywhere is good. No audit log, no migration history. |
| **Developer experience** | 2 | No seed data, no migrations, docs drift from reality. |
| **Security (defense in depth)** | 5 | RLS + CHECK + UUID + parameterized queries. Four independent layers. |

**Overall: 4/5** — Production-ready for a single-user health tracker. The gaps are in developer tooling (migrations, seeds) and a few schema design tradeoffs that favour MVP speed over long-term flexibility. None of the issues are data-loss or security risks.
