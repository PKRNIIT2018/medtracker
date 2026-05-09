# Supabase Features for MedTracker — Multi-User, Auth, Security & Role-Based Access

## Overview

Supabase is an open-source Firebase alternative that provides a full PostgreSQL database, authentication, real-time subscriptions, and storage. For MedTracker, Supabase powers the entire backend — from user sign-up to data isolation and role-based page access.

This document covers why these features matter, what they offer, how to implement them, and when they should be used.

---

## Table of Contents

1. [Multi-User Architecture](#1-multi-user-architecture)
2. [Authentication Methods](#2-authentication-methods)
3. [Row-Level Security (RLS)](#3-row-level-security-rls)
4. [Role-Based Access Control (RBAC)](#4-role-based-access-control-rbac)
5. [Feature Comparison Matrix](#5-feature-comparison-matrix)
6. [Implementation Guide](#6-implementation-guide)
   - [Phase 0: Create & Configure Supabase Project](#phase-0-create--configure-supabase-project)
   - [Phase 1: Enable Supabase Auth Features](#phase-1-enable-supabase-auth-features)
   - [Phase 2: Database Setup](#phase-2-database-setup)
   - [Phase 3: Next.js Integration](#phase-3-nextjs-integration)
   - [Phase 4: Passkey Setup](#phase-4-passkey-setup)
   - [Phase 5: PIN Setup](#phase-5-pin-setup)
   - [Phase 6: MFA Setup](#phase-6-mfa-setup)
7. [When & Why to Use Each Feature](#7-when--why-to-use-each-feature)

---

## 1. Multi-User Architecture

### What It Is

Supabase manages user accounts in a dedicated `auth.users` table. Every user gets a unique `UUID` that never changes. All application tables reference this UUID via a `user_id` foreign key, creating a clean data ownership model.

```
auth.users (Supabase-managed)
    │
    ├── user_settings          (1 row per user)
    ├── medications            (user's medications only)
    ├── blood_sugar            (user's readings only)
    ├── blood_pressure         (user's readings only)
    └── ... all other tables   (scoped by user_id)
```

### Why To Do It

- **Data privacy** — each user sees only their own health data
- **Future-proofing** — the app can serve family members or caregivers without schema changes
- **Supabase free tier** — supports up to 50,000 monthly active users at no cost
- **Compliance** — user-isolated data is easier to audit for HIPAA/GDPR readiness

### Features & Benefits

| For Users | For Creators (You) |
|---|---|
| Private health data — no one else sees your readings | Zero extra infrastructure — Supabase manages auth |
| Can log in from any device | 50,000 MAU on free tier — scales without cost surprises |
| Data persists across browsers and app reinstalls | Built-in password reset, email verification, rate limiting |
| Account deletion removes all associated data (CASCADE) | SQL-level data isolation — no accidental data leaks |

---

## 2. Authentication Methods

### 2.1 Email + Password

#### What It Is
Standard email + password authentication handled entirely by Supabase Auth. Passwords are hashed with bcrypt server-side. Supabase sends verification emails and password reset emails.

```typescript
// Sign up
await supabase.auth.signUp({ email, password })

// Sign in
await supabase.auth.signInWithPassword({ email, password })

// Reset password
await supabase.auth.resetPasswordForEmail(email)
```

#### Why To Do It
- Universal — every user has an email
- No third-party dependency
- Supabase handles rate limiting, bot detection, and email templates
- Free tier includes custom SMTP (send from your own domain)

#### Features & Benefits
| For Users | For Creators |
|---|---|
| Familiar login flow | Zero email infrastructure to build |
| Password reset via email | Built-in email templates (customizable on Pro) |
| Works on any device | Rate-limited brute force protection |

---

### 2.2 Passkeys (WebAuthn / Biometric)

#### What It Is
Passkeys let users authenticate with their device's built-in biometrics — fingerprint (Touch ID), face recognition (Face ID), or Windows Hello. Supabase added native passkey support in April 2026 via `auth.signInWithPasskey()` and `auth.registerPasskey()`.

Passkeys are:
- **Phishing-resistant** — bound to the app's domain, can't be tricked by fake sites
- **Device-synced** — stored in iCloud Keychain, Google Password Manager, or 1Password
- **Discoverable** — users don't need to remember a username

```typescript
// Register (after initial login)
await supabase.auth.registerPasskey()

// Login (one tap)
await supabase.auth.signInWithPasskey()
```

#### Why To Do It
- Fastest login experience — one tap, no typing
- More secure than passwords (FIDO2/WebAuthn standard)
- Reduces password reset support requests
- Supabase manages the credential storage server-side

#### Features & Benefits
| For Users | For Creators |
|---|---|
| One-tap login with fingerprint or face | 5 lines of code to implement |
| No passwords to remember | Supabase stores credentials securely |
| Works across devices via cloud sync | No SMS costs (unlike OTP) |
| More secure than SMS 2FA | Phishing-resistant by design |

#### When To Use
- **Primary login method** for mobile users (PWA, Capacitor)
- **Secondary method** alongside email/password for convenience
- **Health apps** where quick access during emergencies matters

---

### 2.3 App PIN (4-Digit)

#### What It Is
A client-side convenience lock. After logging in with email/password or passkey, the user sets a 4-digit PIN. On subsequent app opens, the PIN pad appears instead of the full login screen.

**Important**: The PIN is **not** Supabase Auth — it's a local convenience layer:

```
PIN hash stored in Browser IndexedDB (bcrypt hashed)
     │
     ▼
Never sent to Supabase server
     │
     ▼
If forgotten → re-authenticate with email/password
```

```typescript
// Set PIN (after login)
const salt = await bcrypt.genSalt(10)
const hash = await bcrypt.hash('1234', salt)
await indexedDB.put('pin', { hash })

// Verify
const hash = await indexedDB.get('pin')
const valid = await bcrypt.compare(enteredPin, hash)
```

#### Why To Do It
- Fastest unlock — 4 taps vs typing full email + password
- Works offline (stored locally)
- Familiar pattern (banking apps, phone lock screen)
- Can be bypassed with passkey if both are enabled

#### Features & Benefits
| For Users | For Creators |
|---|---|
| Instant app access | ~30 lines of code (IndexedDB + bcrypt) |
| No network required to unlock | No server cost — all local |
| Familiar PIN pad UX | PIN is never transmitted, zero liability |

#### When To Use
- **Frequent-use apps** (health trackers opened multiple times daily)
- **Offline scenarios** (no internet but need to log meds)
- **Complement to passkey** (PIN as fallback when biometric fails)

#### When NOT To Use
- As the sole authentication method (PIN alone is weak)
- For financial transactions or sensitive medical data viewing without re-auth

---

### 2.4 TOTP Multi-Factor Authentication (MFA)

#### What It Is
Time-based One-Time Password (TOTP) via authenticator apps (Google Authenticator, Authy, 1Password, etc.). After email/password or passkey login, the user must enter a 6-digit code that changes every 30 seconds.

```typescript
// Enroll
const { data, error } = await supabase.auth.mfa.enroll({
  factorType: 'totp',
})

// Show QR code (data.totp.qr_code)
// User scans with authenticator app

// Verify enrollment
await supabase.auth.mfa.verify({
  factorId: data.id,
  challengeId: challenge.id,
  code: userEnteredCode,
})

// Challenge on login
const challenge = await supabase.auth.mfa.challenge({
  factorId: factor.id,
})
await supabase.auth.mfa.verify({
  factorId: factor.id,
  challengeId: challenge.id,
  code: userEnteredCode,
})

// Remember device (skip MFA for N days)
// Implemented via a cookie or local flag
```

#### Why To Do It
- Protection against credential theft (password leak alone isn't enough)
- Regulatory compliance (HIPAA recommends MFA for health data access)
- User peace of mind for sensitive health records

#### Features & Benefits
| For Users | For Creators |
|---|---|
| Extra layer of security for health data | Built into Supabase Auth — no integration cost |
| Works with any authenticator app | 10 lines of code for enrollment |
| Remember-device option avoids daily prompts | Free on all Supabase plans |

#### When To Use
- **Health applications** storing sensitive data (blood work, conditions, surgeries)
- **Users who want maximum security** (opt-in, not forced)
- **Compliance requirements** (HIPAA, GDPR data access controls)

#### When NOT To Use
- As the only opt-in — some users find MFA friction annoying
- Without "remember device" — daily MFA prompts cause app abandonment

---

## 3. Row-Level Security (RLS)

### What It Is

PostgreSQL Row-Level Security lets you define SQL policies that control which rows a user can see, insert, update, or delete. Supabase automatically forwards the authenticated user's ID as `auth.uid()`.

```sql
-- A user can only see their own medications
CREATE POLICY "users_own_medications"
  ON medications
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### Why To Do It

- **Defense in depth** — even if a bug exposes data in the app, RLS blocks it at the database
- **No accidental data leaks** — a miswritten API query can't return another user's rows
- **Zero trust** — every query is scoped to the authenticated user automatically
- **Audit trail** — all access is logged and traceable

### Features & Benefits

| For Users | For Creators |
|---|---|
| Absolute data isolation — your health data stays yours | Write queries without `WHERE user_id = ?` everywhere |
| Even a server bug can't leak your data | RLS applies to ALL access (API, direct SQL, analytics tools) |
| | One policy per table, applied once |
| | Supabase Studio UI lets you test policies visually |

### RLS Policy Template (Apply to Every Table)

```sql
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_medications_all"
  ON medications FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

Repeat for: `medication_doses`, `medication_intake`, `blood_sugar`, `blood_pressure`, `hba1c`, `weight_log`, `water_intake`, `activity_log`, `medical_history`, `quarterly_results`, `quarterly_result_metrics`, `user_settings`.

---

## 4. Role-Based Access Control (RBAC)

### What It Is

RBAC extends RLS by assigning roles (e.g., `admin`, `user`, `viewer`) to users and restricting what they can see or do based on that role. In a health tracking app, roles enable scenarios like:

- A **doctor** viewing a patient's exported data read-only
- A **family caregiver** logging medications on behalf of someone
- An **admin** managing the app settings

### Role Model for MedTracker

For the current single-user-focused app, RBAC is **optional but architecturally prepared**. Here's how roles can work:

| Role | Permissions | Use Case |
|---|---|---|
| `owner` | Full CRUD on all data | Primary user managing their health |
| `caregiver` | Read + write medications and vitals; no settings | Family member assisting with tracking |
| `viewer` | Read-only access to reports | Doctor reviewing exported data |
| `admin` | Manage app-wide settings (future) | Application administration |

### Implementation

#### 1. Add Role to User Profile

```sql
-- Option A: Custom profile table
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role    CITEXT NOT NULL DEFAULT 'owner'
    CHECK (role IN ('owner', 'caregiver', 'viewer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Option B: Custom claim (Supabase Auth hook)
-- Use a Supabase Edge Function or Auth Hook to add app_metadata.role
```

#### 2. Role-Based RLS Policies

```sql
-- Owner: full access
CREATE POLICY "owner_all"
  ON medications FOR ALL
  USING (
    user_id = auth.uid()
    AND auth.jwt() ->> 'role' = 'owner'
  );

-- Caregiver: read + write (but not delete)
CREATE POLICY "caregiver_insert"
  ON medications FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'caregiver');

CREATE POLICY "caregiver_select"
  ON medications FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('owner', 'caregiver', 'viewer'));

-- Viewer: read-only
CREATE POLICY "viewer_select"
  ON medications FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('owner', 'viewer'));
```

#### 3. Role-Based Route Protection (Next.js)

```typescript
// middleware.ts
export async function middleware(req: NextRequest) {
  const { data: { session } } = await supabase.auth.getSession()

  // Get role from JWT or user_profiles table
  const role = session?.user?.app_metadata?.role ?? 'owner'

  // Admin-only routes
  if (req.nextUrl.pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Viewer cannot access write routes
  if (role === 'viewer' && isWriteRoute(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/', req.url))
  }
}
```

#### 4. Role-Based UI (Client-side)

```typescript
// components/RoleGate.tsx
'use client'
import { useUser } from '@/providers/auth-provider'

export function RoleGate({
  role,
  children,
}: {
  role: string | string[]
  children: React.ReactNode
}) {
  const { user } = useUser()
  const userRole = user?.app_metadata?.role ?? 'owner'
  const allowed = Array.isArray(role) ? role.includes(userRole) : userRole === role

  if (!allowed) return null
  return <>{children}</>
}
```

```tsx
// Usage
<RoleGate role="owner">
  <DeleteMedicationButton />
</RoleGate>
<RoleGate role={['owner', 'caregiver']}>
  <MarkMedicationTaken />
</RoleGate>
```

### Why To Do It

- **Delegated care** — family members can help track medications
- **Doctor access** — share read-only access with healthcare providers
- **Future expansion** — the architecture is ready when multi-role needs arise
- **Audit logging** — track who accessed or modified what

### When To Use

| Scenario | Implement RBAC? |
|---|---|
| Single user tracking own health | Not needed (use simple RLS) |
| User + family caregiver | Yes — add `caregiver` role |
| User sharing with doctor | Yes — add `viewer` role |
| Commercial health app | Yes — full role hierarchy |
| Enterprise with compliance needs | Yes — roles for audit trails |

---

## 5. Feature Comparison Matrix

### Auth Methods

| Feature | Email + Password | Passkey (Biometric) | App PIN | TOTP MFA |
|---|---|---|---|---|
| **Setup effort** | 5 min (built-in) | 1 hour | 30 min | 30 min |
| **Security level** | Medium | High | Low (local only) | Very High |
| **User speed** | Slow (typing) | Instant (one tap) | Instant (4 taps) | Medium (open app + type code) |
| **Works offline** | No | No | Yes | No |
| **Supabase cost** | Free | Free | Free (client-side) | Free |
| **Phishing resistant** | No | Yes | N/A (local) | No |
| **Best for** | First-time setup | Daily quick login | Frequent unlocks | Sensitive data protection |

### Access Control

| Feature | RLS (Basic) | RBAC (Roles) |
|---|---|---|
| **What it does** | User sees only own rows | Different users see different actions per row |
| **Complexity** | Low — one policy per table | Medium — policies per role per table |
| **When needed** | Always (every multi-user app) | When users need different permission levels |
| **Performance** | No overhead (indexed) | No overhead (indexed) |
| **Audit capability** | Policy-level | Role-level |

---

## 6. Implementation Guide

### Phase 0: Create & Configure Supabase Project

#### Step 0.1: Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click **Start your project** → sign up with GitHub or email
3. Free tier includes: 2 active projects, 500 MB database, 50,000 MAU, 5 GB egress

#### Step 0.2: Create a New Project

1. In the Supabase Dashboard, click **New project**
2. Fill in:
   - **Name**: `medtracker`
   - **Database Password**: generate a strong password and save it
   - **Region**: choose the closest to your users (e.g., `us-east-1` or `eu-west-2`)
   - **Pricing Plan**: **Free** (no time limit, 2 projects max)
3. Click **Create new project** — wait ~2 minutes for provisioning

#### Step 0.3: Get API Keys

Once the project is ready:

1. Go to **Project Settings** (gear icon) → **API**
2. Copy these two values into your `.env.local`:

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- `Project URL` — the unique endpoint for your project
- `anon` key — public, safe for client-side use (RLS protects your data)

> **Security note**: The `anon` key is safe to expose to the browser because RLS policies prevent unauthorized access. The `service_role` key must NEVER be exposed client-side — use it only in server-side code or Edge Functions.

#### Step 0.4: Run Database Schema

1. Go to **SQL Editor** in the Supabase Dashboard
2. Open the full schema from [`DB_DESIGN.md`](./DB_DESIGN.md)
3. Paste and run the SQL — this creates all 13 tables with `user_id` foreign keys
4. Verify in **Table Editor** that all tables appear

Key schema commands to run:

```sql
-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- 2. Create all tables (copy from DB_DESIGN.md)
--    Every table includes: user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE

-- 3. Enable RLS on every table
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_doses ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_sugar ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_pressure ENABLE ROW LEVEL SECURITY;
ALTER TABLE hba1c ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarterly_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarterly_result_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for each table
CREATE POLICY "user_medications_all"
  ON medications FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ... repeat for all 13 tables (see DB_DESIGN.md for full list)
```

#### Step 0.5: Enable Auth Features in Dashboard

Go to **Authentication** → **Settings** and configure:

| Feature | Where | Action |
|---|---|---|
| Email + Password | Auth > Settings > Providers | Enabled by default |
| Confirm email | Auth > Settings > Email | Toggle "Confirm email" ON |
| Passkeys / WebAuthn | Auth > Passkeys | Toggle "Enable Passkeys" ON, set Site URL |
| TOTP MFA | Auth > MFA | Toggle "Enable MFA" ON |
| Site URL | Auth > Settings > General | Set to `http://localhost:3000` (dev) / `https://your-app.vercel.app` (prod) |
| Redirect URLs | Auth > Settings > General | Add `http://localhost:3000/auth/callback` and production equivalent |

#### Step 0.6: Configure Email Templates (Optional)

1. Auth > Settings > Email Templates
2. Customize: Confirmation, Invite, Magic Link, Reset Password, Change Email
3. Free tier uses Supabase's built-in SMTP. For custom branding, upgrade to Pro ($25/mo)

#### Step 0.7: (Optional) Enable OAuth Providers

1. Auth > Settings > Providers
2. Enable Google / GitHub / Apple
3. Follow the provider's instructions to get Client ID and Secret
4. This gives users the option to sign in with existing accounts

#### Step 0.8: Verify Setup

Test the full flow in the browser:

1. Start your Next.js dev server: `npm run dev`
2. Open `http://localhost:3000/signup`
3. Create an account with email + password
4. Check email for confirmation link
5. Log in
6. Go to Supabase Dashboard → **Authentication** → **Users** to confirm the user exists
7. Go to **Table Editor** → `user_settings` to confirm the row was auto-created

#### Step 0.9: Seed Your Database (Development)

Run in SQL Editor to create test data for development:

```sql
-- Insert test user settings
INSERT INTO user_settings (user_id, sugar_unit, daily_water_goal_ml)
VALUES ('<your-test-user-uuid>', 'mg/dL', 2000);

-- Insert sample medications
INSERT INTO medications (user_id, name, type, strength, time_of_day)
VALUES
  ('<your-test-user-uuid>', 'Metformin', 'tablet', '500 mg', 'morning'),
  ('<your-test-user-uuid>', 'Vitamin D', 'tablet', '1000 IU', 'morning'),
  ('<your-test-user-uuid>', 'Aspirin', 'tablet', '81 mg', 'evening');

-- Insert sample blood sugar readings
INSERT INTO blood_sugar (user_id, reading_date, meal_slot, level_mgdl, notes)
VALUES
  ('<your-test-user-uuid>', CURRENT_DATE, 'before_breakfast', 95, 'Fasting'),
  ('<your-test-user-uuid>', CURRENT_DATE, 'before_lunch', 120, 'Skipped snack');
```

---

### Phase 1: Enable Supabase Auth Features

In the **Supabase Dashboard** → **Authentication** → **Settings**:

```
Enable:
  [x] Email + Password (default)
  [x] Passkeys / WebAuthn  (new — enable in Auth > Passkeys)
  [x] MFA (TOTP)           (enable in Auth > MFA)

Optional:
  [ ] Google / Apple / GitHub OAuth (add if desired)
```

### Phase 2: Database Setup

```sql
-- 1. Create user_settings with PIN fields
CREATE TABLE user_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  app_pin_hash    TEXT,
  app_pin_enabled BOOLEAN NOT NULL DEFAULT false,
  -- ... other settings fields ...
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add user_id to all data tables (see DB_DESIGN.md)
ALTER TABLE medications ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Enable RLS on all tables
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
CREATE POLICY "user_medications_all"
  ON medications FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
-- ... repeat for all tables

-- 5. (Optional) Create profile table for RBAC
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role    CITEXT NOT NULL DEFAULT 'owner'
    CHECK (role IN ('owner', 'caregiver', 'viewer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Phase 3: Next.js Integration

```bash
npm install @supabase/ssr @supabase/supabase-js bcryptjs @simplewebauthn/browser
```

Key files to create:
- `src/middleware.ts` — route protection
- `src/providers/auth-provider.tsx` — session context
- `src/lib/pin-storage.ts` — IndexedDB PIN storage
- `src/app/login/page.tsx` — login with email + passkey option
- `src/app/pin/page.tsx` — PIN unlock screen
- `src/app/settings/security/page.tsx` — passkey + PIN + MFA management

### Phase 4: Passkey Setup

```typescript
// Register passkey (after login)
async function registerPasskey() {
  const { error } = await supabase.auth.registerPasskey()
  if (error) console.error('Passkey registration failed', error)
  else toast.success('Passkey registered!')
}

// Login with passkey
async function loginWithPasskey() {
  const { error } = await supabase.auth.signInWithPasskey()
  if (error) console.error('Passkey login failed', error)
}
```

### Phase 5: PIN Setup

```typescript
// lib/pin-storage.ts (see full implementation in DESIGN.md)
// Uses IndexedDB + bcryptjs — PIN never leaves the device

// Set PIN
import { setPinHash, verifyPin } from '@/lib/pin-storage'

await setPinHash('1234')

// Verify on unlock
const valid = await verifyPin('1234')
```

### Phase 6: MFA Setup

```typescript
// Settings page — Enable MFA
async function enableMfa() {
  // 1. Enroll
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
  })
  // 2. Show QR code to user (data.totp.qr_code)
  // 3. Verify with code from authenticator app
  await supabase.auth.mfa.verify({
    factorId: data.id,
    challengeId: challenge.id,
    code: userCode,
  })
}
```

---

## 7. When & Why to Use Each Feature

### Decision Matrix

| Scenario | Auth Method | Data Isolation | Roles |
|---|---|---|---|
| Personal health tracker | Email + password + PIN | RLS (basic) | Not needed |
| Family member helps track meds | Email + password + passkey | RLS + RBAC | Add `caregiver` role |
| Sharing reports with doctor | Email + password + viewer account | RLS + RBAC | Add `viewer` role |
| High-security health data | All methods + MFA | RLS (strict) | Consider RBAC |
| Commercial health app | All methods | RLS + RBAC | Full role hierarchy |

### When to Skip Features

- **Skip MFA** if the app only tracks water intake and steps (low sensitivity)
- **Skip passkey** if targeting only desktop web (less natural than on mobile)
- **Skip RBAC** if it's genuinely single-user and will never need shared access
- **Skip PIN** if users always have network and prefer full login each time

### Security Recommendations by Data Sensitivity

| Data Type | Sensitivity | Recommended Auth |
|---|---|---|
| Water intake, steps, calories | Low | PIN or passkey |
| Medications, dosages | Medium | Passkey + email/password |
| Blood sugar, blood pressure | High | Passkey + email/password |
| Lab results, conditions, surgeries | Very High | Passkey + MFA |

---

## Summary

| Feature | Effort | Security Impact | User Experience Impact |
|---|---|---|---|
| **Multi-user (RLS)** | Medium (add user_id to all tables) | 🔴 Critical — prevents data leaks | Invisible to users |
| **Email + password** | Low (Supabase built-in) | 🟡 Baseline | Standard login flow |
| **Passkey (biometric)** | Low (Supabase native API) | 🟢 High — phishing resistant | Excellent — one tap |
| **App PIN** | Low (IndexedDB + bcryptjs) | 🟢 Good convenience layer | Excellent — 4 taps |
| **TOTP MFA** | Low (Supabase built-in) | 🟢 Very High | Moderate — extra step |
| **RBAC (roles)** | Medium (profile table + policies) | 🟢 High for delegation | Transparent |

---

## Referenced Documents

| Document | Description |
|---|---|
| [`REQUIREMENTS.md`](./REQUIREMENTS.md) | Full user requirements & implementation tasks |
| [`DB_DESIGN.md`](./DB_DESIGN.md) | PostgreSQL schema, indexes, RLS policies |
| [`DESIGN.md`](./DESIGN.md) | Application architecture, components, cross-platform strategy |
| Supabase Docs | [Auth](https://supabase.com/docs/guides/auth), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Passkeys](https://supabase.com/docs/guides/auth/passkeys) |
