# MedTracker — Database Design (Supabase / PostgreSQL)

## Overview

- **Database**: PostgreSQL (via Supabase free tier)
- **Extensions**: `pgcrypto` (for `gen_random_uuid()`), `citext` (case-insensitive text)
- **Convention**: All tables use UUID primary keys, `created_at` timestamptz, and soft-delete friendly design
- **User isolation**: Every data table includes `user_id UUID NOT NULL REFERENCES auth.users(id)` to isolate data per user
- **Auth schema**: Supabase manages `auth.users`, `auth.passkeys`, and `auth.mfa_factors` automatically — no manual schema needed for passkeys or TOTP MFA

---

## Entity Relationship Summary

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
|---|---|---|---|
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_settings_user_id ON user_settings (user_id);
```

---

### 2. `medications`

Master list of medications configured by the user.

| Column | Type | Default | Constraints |
|---|---|---|---|---|---|
| id | `uuid` | `gen_random_uuid()` | PK |
| user_id | `uuid` | | NOT NULL, FK -> auth.users(id) ON DELETE CASCADE |
| name | `citext` | | NOT NULL |
| type | `citext` | | CHECK IN (`'tablet'`, `'liquid'`, `'injection'`) |
| strength | `varchar(100)` | | e.g. `"80 mg"` |
| time_of_day | `citext` | | CHECK IN (`'morning'`, `'afternoon'`, `'evening'`) |
| is_active | `boolean` | `true` | |
| deleted_at | `timestamptz` | | nullable — soft delete |
| created_at | `timestamptz` | `now()` | |
| updated_at | `timestamptz` | `now()` | auto-updated by trigger |

```sql
CREATE TABLE medications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        CITEXT NOT NULL,
  type        CITEXT NOT NULL CHECK (type IN ('tablet', 'liquid', 'injection')),
  strength    VARCHAR(100) NOT NULL,
  time_of_day CITEXT NOT NULL CHECK (time_of_day IN ('morning', 'afternoon', 'evening')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_medications_user_id      ON medications (user_id);
CREATE INDEX idx_medications_user_date    ON medications (user_id, created_at);
CREATE INDEX idx_medications_time_of_day  ON medications (time_of_day);
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
| meal_slot | `citext` | | CHECK IN (`'before_breakfast'`, `'before_lunch'`, `'before_dinner'`) |
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
    meal_slot IN ('before_breakfast', 'before_lunch', 'before_dinner')
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
|---|---|---|---|---|---|
| id | `uuid` | `gen_random_uuid()` | PK |
| user_id | `uuid` | | NOT NULL, FK -> auth.users(id) ON DELETE CASCADE |
| entry_date | `date` | | NOT NULL |
| amount_ml | `numeric(5,0)` | | NOT NULL, >= 0 |
| deleted_at | `timestamptz` | | nullable — soft delete |
| created_at | `timestamptz` | `now()` | |

```sql
CREATE TABLE water_intake (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  amount_ml  NUMERIC(5,0) NOT NULL CHECK (amount_ml >= 0),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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

-- Same pattern for ALL 13 tables:
-- medication_doses, medication_intake, blood_sugar, blood_pressure,
-- hba1c, weight_log, water_intake, activity_log, medical_history,
-- quarterly_results, quarterly_result_metrics, user_settings
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
|---|---|---|
| `user_settings` | `user_id` (unique) | Per-user lookup |
| `medications` | `user_id`, `(user_id, created_at)`, `time_of_day`, `is_active` (partial) | User isolation, export sorting, grouping |
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

> **Note**: `(partial)` means the index uses `WHERE deleted_at IS NULL` — only non-deleted rows are indexed for smaller index size.

---

## Security Hardening

### Defense Layers (Defense in Depth)

```
App Layer (Next.js + Drizzle/Prisma ORM)
  │  Parameterized queries → prevents SQL injection
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
| **SQL injection** | Parameterized queries via Drizzle/Prisma ORM | App layer |
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
  meal_slot: z.enum(['before_breakfast', 'before_lunch', 'before_dinner']),
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
