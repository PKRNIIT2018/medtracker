# MedTracker - Application Requirements & Implementation Plan

## Overview
A multi-user medication & health tracking application built with Next.js, hosted on Vercel with Supabase (free tier) for database and authentication. Each user has private data isolated via Row-Level Security. All tracked data is structured for easy export to share with doctors during visits.

> **Database design**: See [`DB_DESIGN.md`](./DB_DESIGN.md) for the full PostgreSQL schema, indexes, and RLS policies.
> **Application design**: See [`DESIGN.md`](./DESIGN.md) for architecture, components, and cross-platform strategy.

### Core Design Goals
- **Doctor-ready exports**: Every data point (sugar, pressure, medication intake, quarterly results) can be exported as a clean weekly or monthly report for physician review
- **Meal-timed sugar logging**: Blood sugar is always recorded relative to meals (before breakfast/lunch/dinner) with optional notes for context
- **Proactive reminders**: Notifications prompt the user to log sugar readings before each meal
- **Quick & secure access**: Multiple login methods — email/password, biometric (fingerprint/Face ID via passkeys), 4-digit app PIN, and TOTP MFA for extra security

---

## User Requirements

### 1. Medication Tracking
- Medication list grouped by time of day (Morning / Afternoon / Evening)
- Add medication with full form:
  - Name with auto-suggest from previously entered names
  - Type selector (Tablet / Liquid / Injection)
  - Strength input (e.g., "80 mg")
  - Multiple dose entries per medication (time picker + amount)
- One-tap toggle to mark as taken
- Remove medication with confirmation dialog
- Edit mode toggle to reveal delete buttons
- View medication history (daily/weekly/monthly views)

### 2. Blood Sugar Measurement (Meal-Timed)
- Log blood sugar readings with timestamp tied to a meal slot: **Before Breakfast**, **Before Lunch**, **Before Dinner**
- Dedicated prompt/notification to record intake before each meal slot
- Notes section per entry to record food eaten, activity, stress, illness, or any other context relevant for doctor review
- View readings grouped by meal slot for pattern analysis

### 3. Vitals Logging
- **Blood Pressure**: Systolic / Diastolic (mmHg) with optional heart rate
- **Blood Sugar**: Level (mg/dL) tied to meal slot (before breakfast/lunch/dinner) with notes
- **HbA1c**: Percentage (%) — logged ad-hoc or as part of quarterly results
- **Weight**: kg with date stamp
- Date picker per log entry
- Flat list view sorted newest first
- Edit mode with per-entry delete
- Empty state messaging

### 4. Water Tracking
- Log water intake via preset buttons: Glass (250ml), Bottle (500ml), Large Bottle (750ml)
- Circular progress visualization against daily goal
- Editable goal via modal (enter liters)
- Real-time current intake display in ml

### 5. Activity Logging
- Manual entry for steps taken and calories burned (kcal)
- Number-only input sanitization
- Save with success confirmation
- View daily/weekly activity summary on Dashboard

### 6. Medical History
- Record and categorize entries into:
  - Medical Conditions
  - Surgeries
  - Allergies
- Date picker (past dates only)
- Add/delete entries per category
- Empty state messaging per category

### 7. Quarterly Results
- Upload or record lab/test results on a quarterly basis
- Store key metrics (HbA1c, cholesterol, etc.)
- Compare against previous quarters

### 8. Settings Page
- Manage medication list (name, dosage, frequency, schedule)
- Set medication reminders/alerts
- Configure measurement units (mg/dL vs mmol/L for sugar, mmHg for pressure)
- Set daily water intake goal
- User preferences (theme, notification preferences)
- **Security settings**:
  - Register / manage passkeys (fingerprint, Face ID)
  - Enable / change / disable 4-digit app PIN
  - Enable / disable TOTP Multi-Factor Authentication
  - View active sessions / logout from other devices

### 9. Alerts & Reminders
- Push/email reminders for medication times
- **Meal-time reminders**: Notification to record blood sugar before breakfast, before lunch, and before dinner
- Overdue medication alerts
- Missed dose tracking
- Optional water intake reminders

### 10. Dashboard / Home View
- Today's medication schedule with taken/total count
- Water intake circular progress bar (current vs goal)
- Vitals snapshot — latest BP, blood sugar, HbA1c, weight
- Daily summary — steps and calories burned
- Quick-add floating action buttons for: vitals, water, medication intake, activity
- Adherence summary (percentage of doses taken on time)
- Navigate to detail screens on card tap

### 11. History & Reports (Doctor-Ready Exports)
- Filterable timeline of all activity — filter by date range, meal slot, medication, reading type, category
- Weekly/monthly adherence reports
- Sugar/pressure trend charts grouped by meal slot
- **Export to CSV/PDF** formatted for doctor visits:
  - Sugar readings sorted by date with meal slot and notes
  - Pressure readings with date/time and notes
  - Medication adherence summary
  - Water intake logs
  - Activity logs (steps/calories)
  - Quarterly lab results
- Print-friendly report layout

---

### 12. Authentication & Quick Login

#### 12.1 Sign Up & Login
- Email + password registration and login via Supabase Auth
- Login page at `/login`, signup page at `/signup`
- Password reset flow (forgot password)
- Session persists across browser restarts (Supabase cookie-based session)

#### 12.2 Passkey (Biometric) Login
- Register device passkey (fingerprint, Face ID, Touch ID, Windows Hello) via Supabase WebAuthn API
- One-tap "Login with Passkey" button on the login screen
- Manage registered passkeys in Settings (list, rename, delete)
- Passkeys sync across devices via iCloud Keychain / Google Password Manager
- Falls back to email/password if passkey is unavailable

#### 12.3 App PIN (4-Digit)
- Set a 4-digit PIN after initial login
- On subsequent app opens, show PIN pad before granting access
- PIN is hashed and stored locally in the browser (IndexedDB) — never sent to server
- Option to bypass PIN with passkey (if both are enabled)
- Change / disable PIN in Settings
- If PIN is forgotten, user must re-authenticate with email/password

#### 12.4 Multi-Factor Authentication (TOTP)
- Enable TOTP MFA via authenticator app (Google Authenticator, Authy, etc.) using Supabase MFA
- QR code scan + verification code on setup
- MFA challenge shown after successful email/password or passkey login
- Remember device for N days to avoid repeated MFA prompts
- Disable MFA in Settings (requires current TOTP code)

#### 12.5 Auth Flow Priority
```
1. Open app → Check session
2. If session exists → Check PIN enabled? → Show PIN pad → Dashboard
3. If no session → Show login screen
   ├── Login with Passkey (biometric prompt)
   ├── Login with Email + Password
   └── Sign up
4. After login → MFA enabled? → Show TOTP challenge → Dashboard
5. First login → Prompt to set up passkey and/or PIN
```
- **Multi-user** — each user signs up, logs in, and sees only their own data (isolated via Supabase RLS)
- **Responsive** — works on mobile and desktop
- **Offline-resilient** — basic functionality without network, PIN unlock works offline
- **Fast loads** — leverage Next.js SSR/ISR where applicable
- **Export-first design** — all data schemas and UI are designed with weekly/monthly doctor-report export as a primary use case
- **Multiple auth methods** — email/password, passkey (WebAuthn biometric), app PIN, and TOTP MFA

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL — free tier) |
| ORM | Drizzle ORM or Prisma |
| Auth | Supabase Auth (email/password, passkeys/WebAuthn, TOTP MFA) |
| Passkey client | `@simplewebauthn/browser` + `@supabase/supabase-js` |
| Charts | Recharts or Chart.js |
| Alerts | Vercel Cron Jobs + Supabase Edge Functions / Web Push API |
| Deployment | Vercel |

---

## Implementation Tasks (Session Plan)

### Phase 1: Project Setup
- [ ] Initialize Next.js project with TypeScript and Tailwind
- [ ] Set up Supabase project and get API keys
- [ ] Configure Drizzle ORM / Prisma schema
- [ ] Set up Supabase Auth (email/password, passkeys, MFA enabled in Supabase dashboard)
- [ ] Set up `@supabase/ssr` for cookie-based session management
- [ ] Set up project folder structure (features-based)
- [ ] Create Next.js middleware for route protection

### Phase 2: Database Schema
- [ ] Add `user_id UUID REFERENCES auth.users(id)` to all data tables
- [ ] Define `medications` table (with type, strength, time-of-day grouping, multiple dose entries)
- [ ] Define `medication_intake` table
- [ ] Define `blood_sugar` table (with `meal_slot` enum: before_breakfast, before_lunch, before_dinner; and `notes` field)
- [ ] Define `blood_pressure` table
- [ ] Define `hba1c` table
- [ ] Define `weight_log` table
- [ ] Define `water_intake` table (with daily goal config)
- [ ] Define `activity_log` table (steps, calories)
- [ ] Define `medical_history` table (for conditions, surgeries, allergies)
- [ ] Define `quarterly_results` table
- [ ] Define `user_settings` table (include `app_pin_hash`, `app_pin_enabled` fields)
- [ ] Set up RLS policies on all tables (user_id = auth.uid())
- [ ] Enable Supabase MFA (TOTP) in project settings
- [ ] Enable Supabase passkeys (WebAuthn) in project settings

### Phase 3: Core Pages & API Routes
- [ ] Login page (`/login`) — email/password + passkey login buttons
- [ ] Signup page (`/signup`) — email/password registration
- [ ] Password reset page (`/reset-password`)
- [ ] Auth callback page (`/auth/callback`) — handles OAuth/passkey redirects
- [ ] Dashboard page (`/`) — protected route
- [ ] Medication tracker page (`/medications`)
- [ ] Add medication page (`/medications/add`)
- [ ] Vitals page (`/vitals`) — sugar, BP, HbA1c, weight
- [ ] Water tracking page (`/water`)
- [ ] Activity logging page (`/activity`)
- [ ] Medical history page (`/history`)
- [ ] Quarterly results page (`/quarterly`)
- [ ] Settings page (`/settings`)
- [ ] Reports & export page (`/reports`)
- [ ] API routes for all CRUD operations

### Phase 4: Features
- [ ] Auth setup: Supabase SSR client, middleware, session provider
- [ ] Login page UI (email/password field + passkey login button)
- [ ] Signup page UI
- [ ] 4-digit PIN lock screen (local, stored in IndexedDB)
- [ ] Passkey registration flow (register during onboarding, manage in Settings)
- [ ] TOTP MFA enrollment flow (QR code scan, verification code)
- [ ] Medication intake recording UI with one-tap toggle, grouped by time of day
- [ ] Add medication form with auto-suggest, type selector, strength, multiple dose entries
- [ ] Sugar measurement form with meal-slot selector (before breakfast/lunch/dinner) and notes field
- [ ] Pressure, HbA1c, weight measurement forms
- [ ] Water intake tracking with preset buttons and progress visualization
- [ ] Activity logging form (steps, calories)
- [ ] Medical history entry form (conditions, surgeries, allergies)
- [ ] Quarterly result entry form
- [ ] Medication management in Settings
- [ ] Alert/reminder system (cron + notification) including meal-time sugar reminders
- [ ] Dashboard widgets (medication summary, water progress, vitals snapshot, daily summary, quick-action FABs)

### Phase 5: Data Visualization
- [ ] Water intake circular progress bar on Dashboard
- [ ] Sugar trend chart per meal slot (before breakfast/lunch/dinner) with range markers
- [ ] Pressure trend chart (systolic/diastolic overlay)
- [ ] Weight trend chart
- [ ] Activity summary (steps/calories) daily/weekly bar chart
- [ ] Adherence bar chart (daily/weekly)
- [ ] Quarterly comparison table/chart
- [ ] Export-to-CSV/PDF report generation with doctor-friendly formatting

### Phase 6: Polish & Deploy
- [ ] Responsive design pass
- [ ] Error handling & loading states
- [ ] Seed data script for development
- [ ] Configure Supabase Auth settings (passkeys, MFA, email templates) in dashboard
- [ ] Deploy to Vercel
- [ ] Configure Vercel Cron Jobs (or Supabase Edge Functions) for reminders

---

## Folder Structure (Proposed)

```
medtracker/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Dashboard (protected)
│   │   ├── layout.tsx
│   │   ├── login/page.tsx        # Login (email/password + passkey)
│   │   ├── signup/page.tsx       # Sign up
│   │   ├── reset-password/page.tsx
│   │   ├── auth/callback/page.tsx # OAuth/passkey callback
│   │   ├── pin/page.tsx           # PIN unlock screen
│   │   ├── medications/
│   │   │   └── add/
│   │   ├── vitals/               # Sugar, BP, HbA1c, Weight
│   │   ├── water/
│   │   ├── activity/
│   │   ├── medical-history/
│   │   ├── quarterly/
│   │   ├── reports/              # Export & reports
│   │   └── settings/
│   ├── components/
│   │   ├── ui/                   # Reusable UI primitives
│   │   ├── dashboard/            # Dashboard-specific widgets
│   │   ├── forms/                # All input forms
│   │   └── charts/               # Chart components
│   ├── middleware.ts            # Route protection (redirect if unauthenticated)
│   ├── db/
│   │   ├── schema.ts
│   │   └── index.ts
│   ├── lib/
│   │   ├── supabase.ts          # Supabase SSR client
│   │   ├── utils.ts
│   │   ├── constants.ts
│   │   └── pin-storage.ts       # PIN hash read/write to IndexedDB
│   ├── providers/
│   │   ├── auth-provider.tsx    # Session context
│   │   ├── pin-provider.tsx     # PIN lock state context
│   │   └── query-provider.tsx
│   └── types/
├── public/
├── drizzle.config.ts
├── next.config.ts
├── package.json
└── tailwind.config.ts
```
