# MedTracker — User Walkthrough

## Scope

This document covers every screen, field, validation rule, and user scenario in the MedTracker application. Each section follows the same structure:

```
Screen name
  → Navigation path
  → Fields (type, validation rules)
  → Validations (required, format, range, length)
  → Happy path
  → Error states
  → Edge cases
  → Empty state
```

---

## Table of Contents

1. [Authentication](#1-authentication)
   - 1.1 Sign Up
   - 1.2 Login (Email + Password)
   - 1.3 Login (Passkey / Biometric)
   - 1.4 PIN Unlock
   - 1.5 TOTP MFA Challenge
   - 1.6 Password Reset
2. [Dashboard](#2-dashboard)
3. [Medication Tracking](#3-medication-tracking)
   - 3.1 Medication List
   - 3.2 Add Medication
   - 3.3 Mark Intake (Taken / Skipped / Rescheduled)
4. [Blood Sugar Measurement](#4-blood-sugar-measurement)
5. [Vitals Logging](#5-vitals-logging)
   - 5.1 Blood Pressure
   - 5.2 HbA1c
   - 5.3 Weight
6. [Water Intake](#6-water-intake)
7. [Activity Logging](#7-activity-logging)
8. [Medical History](#8-medical-history)
9. [Quarterly Results](#9-quarterly-results)
10. [Settings](#10-settings)
    - 10.1 General Settings
    - 10.2 Security Settings (Passkey, PIN, MFA)
11. [Reports & Export](#11-reports--export)
12. [Global Scenarios](#12-global-scenarios)

---

## 1. Authentication

### 1.1 Sign Up

**Navigation**: `/signup` (public route)

**Fields**:

| Field | Type | Placeholder | Validation Rules |
|---|---|---|---|
| Email | `email` | `user@example.com` | Required, valid email format, max 255 chars |
| Password | `password` | `········` | Required, min 8 chars, max 128 chars, must contain: 1 uppercase, 1 lowercase, 1 number |
| Confirm Password | `password` | `········` | Required, must match Password |
| Register Passkey | `checkbox` | | Optional, shown after valid form entry |

**Validations**:

| Rule | Error Message |
|---|---|
| Email empty | "Email is required" |
| Invalid email format | "Please enter a valid email address" |
| Password < 8 chars | "Password must be at least 8 characters" |
| Password no uppercase | "Password must contain at least one uppercase letter" |
| Password no number | "Password must contain at least one number" |
| Passwords don't match | "Passwords do not match" |
| Email already registered | "An account with this email already exists" (Supabase error) |
| Network error | "Unable to connect. Check your internet connection." |

**Scenarios**:

| Scenario | Flow |
|---|---|
| ✅ **Happy path** | Fill email + password + confirm → Submit → Supabase creates user → "Check your email for confirmation link" toast → Redirect to `/login` |
| ✅ **Happy path (nopasskey)** | Same as above, no passkey registration |
| ❌ **Email already exists** | Submit → "An account with this email already exists" inline error → Form stays populated |
| ❌ **Weak password** | Submit → Field-level error on Password field → Focus remains on field |
| ❌ **Mismatched confirm** | Submit → "Passwords do not match" on Confirm field → Both password fields retain values |
| ❌ **Network failure** | Submit → Spinner for 10s → "Unable to connect" toast → Form stays populated |
| ⚠️ **Unconfirmed email access** | User tries to login before confirming email → "Please confirm your email before signing in" message |
| ⚠️ **Supabase free tier limit** | If Supabase project paused (7 days inactivity) → "Service temporarily unavailable. Please try again later." |

---

### 1.2 Login (Email + Password)

**Navigation**: `/login` (public route)

**Fields**:

| Field | Type | Placeholder | Validation Rules |
|---|---|---|---|
| Email | `email` | `user@example.com` | Required, valid email format |
| Password | `password` | `········` | Required, min 1 char (server validates actual match) |

**Validations**:

| Rule | Error Message |
|---|---|
| Email empty | "Email is required" |
| Invalid email format | "Please enter a valid email address" |
| Password empty | "Password is required" |
| Invalid credentials | "Invalid email or password" |
| Email not confirmed | "Please confirm your email before signing in" |

**Scenarios**:

| Scenario | Flow |
|---|---|
| ✅ **Happy path** | Enter email + password → Click "Sign In" → Supabase validates → Session created → Redirect to `/` (or `/pin` if PIN enabled, or MFA challenge if MFA enabled) |
| ✅ **First login ever** | Login → `user_settings` row auto-created → Redirect to `/` → Show onboarding prompt: "Set up quick login?" with options: Register Passkey, Set PIN, Skip |
| ❌ **Wrong password** | Submit → "Invalid email or password" inline error → Password field cleared, email retained |
| ❌ **Account doesn't exist** | Submit → "Invalid email or password" (same message — no user enumeration) |
| ❌ **Too many attempts** | Supabase rate limits → "Too many login attempts. Please try again later." with retry timer |
| ⚠️ **Session expired** | User returns after long absence → Supabase session cookie expired → Redirected to `/login` automatically by middleware |
| ⚠️ **Supabase project paused** | "Service temporarily unavailable. Please try again later." (free tier inactivity pause) |

---

### 1.3 Login (Passkey / Biometric)

**Navigation**: `/login` → "Login with Passkey" button

**Precondition**: User must have registered a passkey in Settings.

**Fields**: None — triggers browser biometric prompt.

**Scenarios**:

| Scenario | Flow |
|---|---|
| ✅ **Happy path** | Click "Login with Passkey" → Browser shows Face ID / Touch ID / Windows Hello prompt → User authenticates → `supabase.auth.signInWithPasskey()` → Session created → Redirect to `/` |
| ✅ **First time passkey + PIN** | Login with passkey → PIN not yet verified → Redirect to `/pin` for PIN unlock |
| ❌ **No passkey registered** | Click "Login with Passkey" → "No passkey found. Please sign in with email and register a passkey in Settings." → Falls back to email/password form |
| ❌ **Biometric cancelled** | User cancels Face ID/Touch ID prompt → "Passkey login cancelled" toast → Stays on login page |
| ❌ **Biometric failed** | Fingerprint not recognized / Face ID timeout → "Passkey authentication failed" toast → Retry option |
| ❌ **Device doesn't support WebAuthn** | Button hidden entirely (feature-detect via `PublicKeyCredential` API) |
| ⚠️ **Multiple passkeys** | Browser shows passkey picker if multiple are registered — user selects one |

---

### 1.4 PIN Unlock

**Navigation**: `/pin` (authenticated, pre-PIN-verified)

**Precondition**: User has `app_pin_enabled = true` in settings AND `pinVerified = false` in client state.

**Fields**:

| Field | Type | Placeholder | Validation Rules |
|---|---|---|---|
| Digit 1 | `password` (inputmode: numeric) | `●` | Required, exactly 1 digit |
| Digit 2 | `password` (inputmode: numeric) | `●` | Required, exactly 1 digit |
| Digit 3 | `password` (inputmode: numeric) | `●` | Required, exactly 1 digit |
| Digit 4 | `password` (inputmode: numeric) | `●` | Required, exactly 1 digit |

Alternative: Single masked input `●●●●` accepting exactly 4 digits.

**Validations**:

| Rule | Error Message |
|---|---|
| Less than 4 digits entered | "Please enter all 4 digits" (no submit until complete) |
| Wrong PIN | "Incorrect PIN. Try again." (after 3 failures: "Too many attempts. Sign in again.") |
| 5 consecutive failures | PIN locked — user must re-authenticate with email/password (clears PIN from IndexedDB) |

**Scenarios**:

| Scenario | Flow |
|---|---|
| ✅ **Happy path** | 4-digit PIN entered → Hash verified against IndexedDB → `pinVerified = true` in Zustand → Redirect to `/` |
| ✅ **Passkey bypass** | "Use Passkey" link on PIN screen → Biometric prompt → If success, set `pinVerified = true` → Dashboard |
| ❌ **Wrong PIN (1-2 attempts)** | "Incorrect PIN. Try again." → Input cleared → User retries |
| ❌ **Wrong PIN (3rd attempt)** | "Too many incorrect attempts. Sign in again." → `app_pin_enabled` reset to `false` in settings → Redirect to `/login` |
| ❌ **PIN forgotten** | "Forgot PIN?" link → Re-authenticate with email/password → PIN reset prompt on success |
| ❌ **IndexedDB cleared** | PIN hash lost → User is treated as having no PIN set → Redirect to `/` directly → PIN setup prompt in Settings |
| ⚠️ **No PIN set but redirected to `/pin`** | Should never happen — middleware skips `/pin` redirect when PIN is disabled |

---

### 1.5 TOTP MFA Challenge

**Navigation**: After email/password or passkey login, if MFA is enabled.

**Fields**:

| Field | Type | Placeholder | Validation Rules |
|---|---|---|---|
| 6-digit code | `text` (inputmode: numeric) | `------` | Required, exactly 6 digits |

**Validations**:

| Rule | Error Message |
|---|---|
| Empty | "Please enter the 6-digit code" |
| Not 6 digits | "Code must be exactly 6 digits" |
| Invalid code | "Invalid code. Try again." |
| Code expired | "Code expired. A new code has been sent." (re-challenge) |
| Too many failures | "Too many attempts. Please sign in again." → Redirect to `/login` |

**Scenarios**:

| Scenario | Flow |
|---|---|
| ✅ **Happy path** | Enter 6-digit TOTP from authenticator app → Verify → Session marked as MFA-verified → "Remember this device for 30 days" checkbox (if checked, set cookie to skip MFA next time) → Redirect to `/` |
| ❌ **Wrong code** | "Invalid code. Try again." → Input cleared → New code from authenticator app |
| ❌ **Code expired** | User takes too long → "Code expired. Tap to generate a new challenge." → Re-challenge |
| ⚠️ **Lost authenticator device** | "Lost access to your authenticator app?" → Recovery codes (if saved during enrollment) OR contact support (if recovery codes lost, account recovery via Supabase) |

---

### 1.6 Password Reset

**Navigation**: `/login` → "Forgot password?" → `/reset-password`

**Fields**:

| Field | Type | Placeholder | Validation Rules |
|---|---|---|---|
| Email | `email` | `user@example.com` | Required, valid email format |

**Scenarios**:

| Scenario | Flow |
|---|---|
| ✅ **Happy path** | Enter email → "If an account exists, a reset link has been sent." toast (same message regardless of whether email exists — prevents enumeration) |
| ❌ **Email not found** | Same message: "If an account exists, a reset link has been sent." |
| ❌ **Network error** | "Unable to send reset email. Check your connection." |

**Post-reset (from email link)**:

| Field | Type | Validation Rules |
|---|---|---|
| New Password | `password` | Required, min 8, same rules as signup |
| Confirm Password | `password` | Must match |

| Scenario | Flow |
|---|---|
| ✅ Reset success | New password submitted → Supabase updates → "Password updated successfully" → Redirect to `/login` |
| ❌ Weak new password | Field-level validation error |
| ❌ Expired reset link | "This reset link has expired. Please request a new one." → Redirect to `/reset-password` |

---

## 2. Dashboard

**Navigation**: `/` (protected)

**Layout**: Mobile: single column scroll. Desktop: 2-3 column grid.

### Widget: Medication Summary

| Field | Display Type | Source |
|---|---|---|
| Taken count | Badge with number | `medication_intake` WHERE `taken_date = today` AND `status = 'taken'` |
| Total count | Badge with number | COUNT of active `medication_doses` |
| Adherence % | Percentage with color (green > 80%, yellow > 50%, red < 50%) | This week's taken/total |
| Upcoming doses | List: time + medication name | Today's doses not yet taken |

### Widget: Water Progress

| Field | Display Type | Source |
|---|---|---|
| Current intake | Number (ml) | SUM of today's `water_intake.amount_ml` |
| Daily goal | Number (ml) | `user_settings.daily_water_goal_ml` |
| Progress bar | Circular SVG (green if >=90%, yellow >=50%, red <50%) | current / goal |

### Widget: Vitals Snapshot

| Field | Display Type | Source |
|---|---|---|
| Latest blood sugar | Value + meal slot label + timestamp | Latest `blood_sugar` row |
| Latest BP | Systolic/Diastolic + timestamp | Latest `blood_pressure` row |
| Latest HbA1c | Percentage + date | Latest `hba1c` row |
| Latest weight | kg + date | Latest `weight_log` row |

### Widget: Daily Summary

| Field | Display Type | Source |
|---|---|---|
| Steps | Number | Latest `activity_log.steps` |
| Calories | Number (kcal) | Latest `activity_log.calories_burned` |
| Date | Date label | `activity_log.entry_date` |

### Quick Actions (FAB)

| Button | Action | Navigation |
|---|---|---|
| + Record Sugar | Open sugar log | Bottom sheet or `/vitals/sugar` |
| + Log Meds | Mark medication taken | Bottom sheet (quick toggle) or `/medications` |
| + Add Water | Log water intake | Increment +250ml directly (with undo toast) |
| + Log Activity | Record steps/calories | Bottom sheet or `/activity` |

### Scenarios

| Scenario | Flow |
|---|---|
| ✅ **All data populated** | All widgets render with real data. FAB visible on mobile. |
| ⚠️ **No data today** | Medication: "No medications scheduled for today" with "Add medication" link. Water: "0 / 2000 ml". Vitals: "--". Activity: "--". Empty states use skeleton loading pattern on first fetch. |
| ⚠️ **Partial data** | Some widgets show data, others show "--" or empty state. Each widget is independent. |
| ⚠️ **Real-time update** | When user logs medication in another tab/widget, Dashboard auto-reflects via Supabase Realtime subscription. |
| ⚠️ **Realtime disconnect** | Realtime subscription fails → Dashboard falls back to TanStack Query's `refetchInterval` (every 30s) + pull-to-refresh. Subtle "offline" banner shown. |

---

## 3. Medication Tracking

### 3.1 Medication List

**Navigation**: `/medications` (protected)

**Layout**: Grouped by time of day — Morning / Afternoon / Evening. Expandable sections.

**Each medication card displays**:

| Field | Type | Source |
|---|---|---|
| Name | Text | `medications.name` |
| Type + Strength | Badge "Tablet · 80 mg" | `medications.type`, `medications.strength` |
| Doses | List with time + toggle | `medication_doses.dose_time` |
| Taken status | Toggle checkbox per dose | `medication_intake.status` for today |

**Scenarios**:

| Scenario | Flow |
|---|---|
| ✅ **Medications exist** | Grouped sections render with dose times and toggle buttons. Taken doses show checkmark + strikethrough. |
| ✅ **Toggle taken** | Tap toggle → Optimistic UI update → `medication_intake` INSERT/UPDATE → Toast "Metformin marked as taken" with Undo option (5s) |
| ✅ **Undo toggle** | Tap Undo → DELETE medication_intake row → Toggle reverts |
| ⚠️ **No medications** | Empty state: "No medications added yet. Add your first medication." with large CTA button → `/medications/add` |
| ⚠️ **Edit mode** | Long-press or tap "Edit" button → Delete icon appears on each medication → Tap delete → Confirm dialog "Delete Metformin?" → `medications.deleted_at = now()` (soft delete) → Card fades out |
| ⚠️ **All doses taken** | Section header shows "✅ All taken" badge. Progress bar at 100%. |
| ❌ **Delete fails** | "Could not delete medication. Please try again." toast |

### 3.2 Add Medication

**Navigation**: `/medications/add` (protected)

**Fields**:

| Field | Type | Placeholder | Validation Rules |
|---|---|---|---|
| Name | `text` | `e.g. Metformin` | Required, max 200 chars, auto-suggest from previous entries |
| Type | `select` | | Required: `Tablet`, `Liquid`, `Injection` |
| Strength | `text` | `e.g. 80 mg` | Required, max 100 chars |
| Time of Day | `select` | | Required: `Morning`, `Afternoon`, `Evening` |
| Doses | `dynamic list` | | At least 1 dose required |
| → Dose Time | `time` | `--:-- --` | Required, valid time |
| → Amount | `text` | `e.g. 1 tablet` | Required, max 100 chars |
| + Add Another Dose | `button` | | Max 5 doses per medication |

**Auto-suggest behavior**: On typing in Name field, query previous `medications.name` for same user. Show dropdown of up to 5 matches. Selecting fills Type, Strength, and Doses from the selected medication (user can modify).

**Validations**:

| Rule | Error Message |
|---|---|
| Name empty | "Medication name is required" |
| Name > 200 chars | "Name must be 200 characters or less" |
| Type not selected | "Please select a medication type" |
| Strength empty | "Strength is required" |
| Time of day not selected | "Please select time of day" |
| No doses | "At least one dose is required" |
| Dose time empty | "Please select a dose time" |
| Dose amount empty | "Please enter a dose amount" |
| > 5 doses | "Maximum 5 doses per medication" (button disabled) |

**Scenarios**:

| Scenario | Flow |
|---|---|
| ✅ **Happy path (single dose)** | Fill name → Select type → Enter strength → Select time → Add one dose → Submit → `medications` + `medication_doses` INSERT → Toast "Metformin added" → Redirect to `/medications` |
| ✅ **Happy path (multiple doses)** | Same but add 2-5 doses with different times → All INSERTED → Redirect |
| ✅ **Auto-suggest** | Type "M" → Dropdown shows "Metformin", "Metoprolol" → Select → Form auto-fills → User adjusts dose time → Submit |
| ❌ **Validation errors** | Submit with empty fields → First invalid field is focused → Inline errors shown |
| ⚠️ **Duplicate medication name** | Allowed (same name, different strength/dose is a valid use case) |
| ⚠️ **Cancel / back** | "Discard changes?" confirmation dialog if form is dirty |

---

### 3.3 Mark Intake (Taken / Skipped / Rescheduled)

**Navigation**: `/medications` or Dashboard quick-action

**Fields** (shown in bottom sheet or inline):

| Field | Type | Options |
|---|---|---|
| Status | `select` | `Taken`, `Skipped`, `Rescheduled` |
| Time taken | `time` | Auto-filled to current time, editable |
| Notes | `textarea` | Optional, max 1000 chars |

**Scenarios**:

| Scenario | Flow |
|---|---|
| ✅ **Mark as taken** | Tap toggle → Default status "Taken" with current time → INSERT `medication_intake` → Visual checkmark |
| ✅ **Mark as skipped** | Tap toggle → Select "Skipped" → Optional reason in notes → INSERT → Dose shown as greyed out with "Skipped" label |
| ✅ **Reschedule** | Tap toggle → Select "Rescheduled" → Pick new time → INSERT with `rescheduled` status + original time in notes → Dose shown at new time slot |
| ❌ **Double tap / duplicate** | Unique index `(user_id, medication_id, dose_id, taken_date)` prevents duplicate → "Already logged" toast |
| ✅ **Edit existing entry** | Tap already-toggled dose → Update modal → Change status from "Taken" to "Skipped" → UPDATE row |
| ✅ **Undo** | Tap undo in toast → DELETE row → Toggle reverts to unchecked |

---

## 4. Blood Sugar Measurement

**Navigation**: `/vitals/sugar` (protected)

**Fields**:

| Field | Type | Placeholder | Validation Rules |
|---|---|---|---|
| Date | `date` | Today (auto-filled) | Required, cannot be future date |
| Time | `time` | Current time (auto-filled) | Required |
| Meal Slot | `select` | | Required: `Before Breakfast`, `Before Lunch`, `Before Dinner` |
| Level | `number` (inputmode: decimal) | `e.g. 95` | Required, 0 - 999.9 |
| Unit | `badge` (read-only) | `mg/dL` | From `user_settings.sugar_unit` |
| Notes | `textarea` | `What did you eat? Any symptoms?` | Optional, max 1000 chars |

**Validations**:

| Rule | Error Message |
|---|---|
| Date empty | "Date is required" |
| Future date | "Date cannot be in the future" |
| Meal slot not selected | "Please select a meal slot" |
| Level empty | "Blood sugar level is required" |
| Level < 0 | "Level cannot be negative" |
| Level > 999.9 | "Please check your reading — level seems too high" |
| Level is not a number | "Please enter a valid number" |
| Notes > 1000 chars | "Notes must be 1000 characters or less" |

**History list**: Below the form, show recent entries grouped by meal slot:

```
Before Breakfast — Today
  95 mg/dL · 7:30 AM · "Felt fine"
  102 mg/dL · 7:45 AM · "Ate late last night"

Before Lunch — Today
  120 mg/dL · 12:15 PM · "Skipped breakfast"

Before Dinner — Yesterday
  110 mg/dL · 6:30 PM · "Walked after dinner"
```

**Scenarios**:

| Scenario | Flow |
|---|---|
| ✅ **Happy path** | Date auto-filled → Select meal slot → Enter level → Add notes → Submit → INSERT `blood_sugar` → "Logged ✓" toast → Entry appears in history list |
| ✅ **Quick-log from Dashboard** | Dashboard FAB → Select meal slot → Enter level → Submit → Toast → Dashboard updates |
| ✅ **Multiple entries same meal slot** | Allowed (e.g., pre- and post-meal comparison). Each has its own timestamp. |
| ❌ **Level too high warning** | Enter 500+ → Warning: "Please check your reading — level seems unusually high. If correct, tap Save again." → Double confirmation |
| ⚠️ **No entries yet** | Empty state: "No blood sugar readings yet. Log your first reading before a meal." with calendar illustration |
| ⚠️ **Edit/delete** | Swipe left on history entry → Delete with confirmation → Soft delete (`deleted_at = now()`) |
| ⚠️ **Unit conversion** | If user changes unit in Settings from `mg/dL` to `mmol/L`, all displayed values convert. Stored as `mg/dL` always — conversion is display-only. |
| ⚠️ **Missed reminder** | If notification triggers but user doesn't log before next meal slot, the missed slot shows a "Log late" option in the list |

---

## 5. Vitals Logging

### 5.1 Blood Pressure

**Navigation**: `/vitals/pressure` (protected)

**Fields**:

| Field | Type | Placeholder | Validation Rules |
|---|---|---|---|
| Date | `date` | Today | Required, not future |
| Time | `time` | Now | Required |
| Systolic | `number` | `e.g. 120` | Required, 50-300 |
| Diastolic | `number` | `e.g. 80` | Required, 30-200 |
| Heart Rate | `number` | `e.g. 72` | Optional, 30-250 |
| Notes | `textarea` | `Feeling dizzy, etc.` | Optional, max 1000 chars |

**Validations**:

| Rule | Error Message |
|---|---|
| Systolic < 50 or > 300 | "Systolic must be between 50 and 300" |
| Diastolic < 30 or > 200 | "Diastolic must be between 30 and 200" |
| Diastolic > Systolic | "Diastolic cannot be higher than systolic" |
| Heart rate < 30 or > 250 | "Heart rate must be between 30 and 250" |
| Heart rate not integer | "Heart rate must be a whole number" |

**Color coding** (based on AHA guidelines):

| Systolic | Diastolic | Color |
|---|---|---|
| < 120 | < 80 | 🟢 Normal |
| 120-129 | < 80 | 🟡 Elevated |
| 130-139 | 80-89 | 🟠 Stage 1 High |
| >= 140 | >= 90 | 🔴 Stage 2 High |
| > 180 | > 120 | 🆘 Emergency (with alert: "Seek medical attention") |

**Scenarios**:

| Scenario | Flow |
|---|---|
| ✅ **Normal reading** | Enter 118/76 → Green indicator → Submit → INSERT → History updates |
| ✅ **Elevated reading** | Enter 125/78 → Yellow indicator → "Your blood pressure is elevated. Monitor regularly." note below form |
| ⚠️ **Emergency reading** | Enter 190/130 → Red alert: "This reading indicates a hypertensive crisis. Please seek emergency medical attention immediately." → Still allows save (for record) but with prominent warning |
| ⚠️ **No entries** | "No blood pressure readings yet. Log your first reading." |

### 5.2 HbA1c

**Navigation**: `/vitals/hba1c` (protected)

**Fields**:

| Field | Type | Placeholder | Validation Rules |
|---|---|---|---|
| Date | `date` | Today | Required, not future |
| Percentage | `number` | `e.g. 5.7` | Required, 0.0 - 20.0 |
| Notes | `textarea` | Optional | Optional, max 1000 chars |

**Validations**:

| Rule | Error Message |
|---|---|
| < 0 or > 20 | "HbA1c must be between 0% and 20%" |
| Not a number | "Please enter a valid percentage" |

**Color coding**:

| Range | Color | Label |
|---|---|---|
| < 5.7% | 🟢 Normal |
| 5.7% - 6.4% | 🟡 Prediabetes |
| >= 6.5% | 🔴 Diabetes |

**Scenarios**:

| Scenario | Flow |
|---|---|
| ✅ **Normal** | Enter 5.3% → Green → "Normal range" |
| ✅ **Diabetic range** | Enter 7.2% → Red → "This indicates diabetes. Consult your doctor." |
| ⚠️ **No entries** | "No HbA1c readings yet. Typically tested every 3 months." |

### 5.3 Weight

**Navigation**: `/vitals/weight` (protected)

**Fields**:

| Field | Type | Placeholder | Validation Rules |
|---|---|---|---|
| Date | `date` | Today | Required, not future |
| Weight | `number` | `e.g. 72.5` | Required, 20.0 - 500.0 |
| Notes | `textarea` | Optional | Optional, max 1000 chars |

**Validations**:

| Rule | Error Message |
|---|---|
| < 20 or > 500 | "Please enter a valid weight" |
| Not a number | "Please enter a valid number" |

**Trend indicator**: Show arrow + change since last entry:

```
72.5 kg  →  73.0 kg  →  71.8 kg  →  72.1 kg
                                   ▲ -0.7 kg from last
```

**Scenarios**:

| Scenario | Flow |
|---|---|
| ✅ **Normal** | Enter 72.5 → Submit → Appears in trend chart |
| ⚠️ **Weight unchanged** | Enter same weight as last entry → "Weight unchanged from last reading (March 5)" |
| ⚠️ **No entries** | "No weight readings yet. Start tracking your weight." |

---

## 6. Water Intake

**Navigation**: `/water` (protected)

**Quick-log from Dashboard**: FAB → "+ Add Water" → instantly adds 250ml with toast "250ml added" + Undo.

**Fields** (main screen):

| Field | Type | Placeholder | Validation Rules |
|---|---|---|---|
| Preset buttons | `button` group | Glass (250ml), Bottle (500ml), Large Bottle (750ml) | None — instant add |
| Custom amount | `number` (inputmode: numeric) | `ml` | Optional, 1-5000, must be multiple of 50 |
| Daily Goal | `number` (from modal) | `2000` | Editable in Settings or via tap on goal |

**Display**:

| Element | Type | Calculation |
|---|---|---|
| Progress circle | SVG circular | `SUM(amount_ml) / daily_goal` |
| Current intake | Large number + "ml" | `SUM(amount_ml)` for today |
| Goal | Text | `user_settings.daily_water_goal_ml` |
| Recent entries | List with time + amount | Today's `water_intake` rows |

**Scenarios**:

| Scenario | Flow |
|---|---|
| ✅ **Quick add** | Tap "Glass" → INSERT 250ml → Progress animates → Toast "250ml added" with Undo |
| ✅ **Custom amount** | Enter 330ml → Tap "Add" → INSERT → Progress updates |
| ✅ **Goal reached** | Progress hits 100% → Confetti animation + "Daily goal reached!" toast |
| ✅ **Goal exceeded** | Progress > 100% → Bar turns blue/purple to indicate exceeded |
| ❌ **Invalid custom** | Enter -50 → "Amount must be greater than 0" |
| ❌ **Custom > 5000** | "Maximum 5000ml at once" |
| ⚠️ **No entries today** | Progress at 0% → "No water logged today. Tap a preset to start." |
| ⚠️ **Change goal** | Tap goal number → Modal with number input → Save → `user_settings` UPDATE |

---

## 7. Activity Logging

**Navigation**: `/activity` (protected)

**Fields**:

| Field | Type | Placeholder | Validation Rules |
|---|---|---|---|
| Date | `date` | Today | Required, not future |
| Steps | `number` (inputmode: numeric) | `e.g. 8000` | Optional, 0-999999, integer only |
| Calories Burned | `number` (inputmode: numeric) | `e.g. 400` | Optional, 0-99999, integer only |
| Notes | `textarea` | Optional | Optional, max 1000 chars |

**Validations**:

| Rule | Error Message |
|---|---|
| Steps not integer | "Steps must be a whole number" |
| Steps > 999999 | "That's more steps than physically possible in a day!" |
| Calories not integer | "Calories must be a whole number" |
| Calories > 99999 | "Please check your calorie entry" |
| Neither steps nor calories entered | "Please enter steps, calories, or both" |
| Duplicate date | Alert: "You already logged activity for this date. Update existing entry?" → Option to UPDATE or CANCEL |

**Scenarios**:

| Scenario | Flow |
|---|---|
| ✅ **Happy path** | Enter steps + calories → Submit → INSERT → "Activity logged for May 9" toast |
| ✅ **Steps only** | Enter 8000 steps, leave calories empty → Partial INSERT → OK |
| ✅ **Calories only** | Same — partial entry allowed |
| ❌ **Both empty** | "Please enter steps, calories, or both" → Form not submitted |
| ❌ **Already logged today** | Submit → "You already logged activity for today. Update?" → Yes = UPDATE row, No = stay |
| ⚠️ **No entries** | "No activity logged yet. Record your first steps." |

---

## 8. Medical History

**Navigation**: `/medical-history` (protected)

**Layout**: Segmented control with 3 tabs: Conditions, Surgeries, Allergies. Each tab shows its own list.

### Add Entry

**Fields**:

| Field | Type | Placeholder | Validation Rules |
|---|---|---|---|
| Category | `select` (set by active tab) | | Pre-filled, hidden |
| Title | `text` | `e.g. Type 2 Diabetes` | Required, max 300 chars |
| Description | `textarea` | `Diagnosed in 2022...` | Optional, max 2000 chars |
| Event Date | `date` | | Optional, must be past date |

**Validations**:

| Rule | Error Message |
|---|---|
| Title empty | "Title is required" |
| Title > 300 chars | "Title must be 300 characters or less" |
| Future date | "Date must be in the past" |
| Description > 2000 chars | "Description must be 2000 characters or less" |

**Scenarios**:

| Scenario | Flow |
|---|---|
| ✅ **Add condition** | Tab "Conditions" → Tap FAB → Fill title "Type 2 Diabetes" → Description "Diagnosed 2022" → Date → Submit → INSERT → Card appears in list |
| ✅ **Add surgery** | Tab "Surgeries" → FAB → Fill → Submit |
| ✅ **Add allergy** | Tab "Allergies" → FAB → Fill → Submit |
| ⚠️ **Delete** | Swipe left on card → "Delete [title]?" → Confirm → `deleted_at = now()` |
| ⚠️ **Empty tab** | "No conditions recorded." AND "No surgeries recorded." AND "No allergies recorded." — one per tab |
| ⚠️ **All tabs empty** | Each tab shows its own empty state independently |

---

## 9. Quarterly Results

**Navigation**: `/quarterly` (protected)

### Add Result

**Fields**:

| Field | Type | Placeholder | Validation Rules |
|---|---|---|---|
| Quarter Label | `select` | | Required: Auto-generated `Q1 2026`, `Q2 2026`, etc. |
| Result Date | `date` | Today | Required, not future |
| Notes | `textarea` | Optional | Optional, max 1000 chars |
| Metrics (dynamic list) | | | At least 1 metric required |
| → Metric Name | `select` | `e.g. HbA1c` | Required, from preset list: HbA1c, Total Cholesterol, HDL, LDL, Triglycerides, Fasting Glucose, Vitamin D, TSH, Creatinine, eGFR + custom entry option |
| → Value | `number` | | Required, 0-99999 |
| → Unit | `text` | Auto-filled from metric preset | Optional, max 50 chars |
| → Normal Range | `text` | Auto-filled from metric preset | Optional, max 100 chars |
| + Add Another Metric | `button` | | Max 20 per result |

**Metric presets**:

| Metric | Default Unit | Default Normal Range |
|---|---|---|
| HbA1c | % | < 5.7% |
| Total Cholesterol | mg/dL | < 200 |
| HDL | mg/dL | > 40 |
| LDL | mg/dL | < 100 |
| Triglycerides | mg/dL | < 150 |
| Fasting Glucose | mg/dL | 70-100 |
| Vitamin D | ng/mL | 30-100 |
| TSH | mIU/L | 0.4-4.0 |
| Creatinine | mg/dL | 0.6-1.2 |
| eGFR | mL/min/1.73m² | > 60 |

**Scenarios**:

| Scenario | Flow |
|---|---|
| ✅ **Add with all metrics** | Select quarter → Date → Add 3 metrics → Submit → INSERT `quarterly_results` + 3x `quarterly_result_metrics` → Card appears in list |
| ✅ **Compare with previous** | Viewing a result → "Compare with previous" button → Side-by-side table of same metrics across quarters |
| ⚠️ **No results** | "No quarterly results yet. Add your first lab results." |
| ⚠️ **Missing metric in previous quarter** | Previous quarter didn't have that metric → Shows "--" in comparison |
| ⚠️ **Delete result** | Swipe or menu → "Delete Q1 2026 results?" → Soft delete with confirmation → All child metrics cascade |
| ⚠️ **Out-of-range highlight** | Metric value outside normal_range → Red highlight with warning icon |

---

## 10. Settings

### 10.1 General Settings

**Navigation**: `/settings` (protected)

**Fields**:

| Section | Field | Type | Validation |
|---|---|---|---|
| Units | Sugar Unit | `select`: `mg/dL`, `mmol/L` | Required |
| Goals | Daily Water Goal | `number` (ml) | 500-10000, step 100 |
| Reminders | Medication Reminder | `toggle` | On/Off |
| | Sugar Reminder | `toggle` | On/Off |
| | Water Reminder | `toggle` | On/Off |
| | Reminder Window Start | `time` | Must be before End |
| | Reminder Window End | `time` | Must be after Start |
| Appearance | Theme | `select`: `System`, `Light`, `Dark` | Required |
| Data | Export All Data | `button` | Triggers full CSV download |
| | Delete Account | `button` (danger) | Confirmation: "Delete all data? This cannot be undone." → Must type "DELETE" to confirm |

**Scenarios**:

| Scenario | Flow |
|---|---|
| ✅ **Change unit** | Switch from `mg/dL` to `mmol/L` → All displayed sugar values convert (values in DB unchanged) → "Unit updated" toast |
| ✅ **Change water goal** | Enter 3000ml → Save → Dashboard water widget updates immediately |
| ❌ **Invalid water goal** | Enter 100 → "Minimum goal is 500ml" |
| ❌ **Reminder window inverted** | Start: 22:00, End: 08:00 → "Reminder start must be before end" |
| ⚠️ **Delete account** | Tap Delete → Type "DELETE" → Confirm → Supabase `auth.users` row deleted → CASCADE deletes all user data → Toast "Account deleted" → Redirect to `/signup` |

### 10.2 Security Settings

**Navigation**: `/settings/security` (protected)

#### Passkey Management

| Field | Type | Action |
|---|---|---|
| Registered Passkeys | List with name + created date | Show all passkeys from `auth.passkeys` |
| Register New Passkey | `button` | Triggers `supabase.auth.registerPasskey()` → biometric prompt |
| Delete Passkey | `button` per item | "Remove this passkey?" confirmation → `auth.passkey.delete()` |

**Scenarios**:

| Scenario | Flow |
|---|---|
| ✅ **Register passkey** | Tap "Register" → Face ID prompt → "Passkey registered successfully" |
| ✅ **Delete passkey** | Tap delete → Confirm → Removed |
| ❌ **Registration fails** | "Could not register passkey. Your device may not support passkeys." |
| ⚠️ **No passkeys** | "No passkeys registered. Add biometric login for one-tap access." |

#### PIN Management

| Field | Type | Validation |
|---|---|---|
| Enable PIN | `toggle` | |
| Set/Change PIN | 4x `password` fields | Current PIN (if changing), New PIN 4 digits, Confirm PIN must match |
| Disable PIN | `button` | Requires current PIN to disable |

**Scenarios**:

| Scenario | Flow |
|---|---|
| ✅ **Enable PIN** | Toggle On → Enter 4 digits → Confirm → Hash stored in IndexedDB + `app_pin_enabled = true` in DB → "PIN enabled" |
| ✅ **Change PIN** | Enter old PIN → Enter new 4 digits → Confirm → Hash updated |
| ❌ **Wrong current PIN (change)** | "Current PIN is incorrect" |
| ❌ **PIN doesn't match confirm** | "PINs do not match" |
| ❌ **PIN not 4 digits** | "PIN must be exactly 4 digits" |
| ✅ **Disable PIN** | Toggle Off → Enter current PIN → Hash removed + `app_pin_enabled = false` → "PIN disabled" |

#### MFA Management

| Field | Type | Action |
|---|---|---|
| Enable MFA | `button` | Opens enrollment flow |
| QR Code | `image` (rendered from `data.totp.qr_code`) | Scan with authenticator app |
| Verification Code | `text` (6 digits) | Enter code from authenticator to verify |
| Disable MFA | `button` | Requires current TOTP code |
| Recovery Codes | `text` list | Show once on enrollment, ask user to save |

**Scenarios**:

| Scenario | Flow |
|---|---|
| ✅ **Enable MFA** | Tap "Enable" → QR code shown → Scan with Google Authenticator → Enter 6-digit code → "MFA enabled" |
| ❌ **Wrong verification code** | "Invalid code. Try again." |
| ⚠️ **Lost recovery codes** | "Recovery codes were shown once during setup. If lost, disable and re-enable MFA." |
| ✅ **Disable MFA** | Enter current TOTP code → "MFA disabled" |

---

## 11. Reports & Export

**Navigation**: `/reports` (protected)

### Filters

| Field | Type | Validation |
|---|---|---|
| Date Range From | `date` | Required, not future |
| Date Range To | `date` | Required, must be >= From |
| Data Types | `checkbox group` | At least one: `Blood Sugar`, `Blood Pressure`, `Medications`, `HbA1c`, `Weight`, `Water`, `Activity`, `Medical History`, `Quarterly Results` |
| Meal Slot (optional) | `select` | Filter: All / Before Breakfast / Before Lunch / Before Dinner |

**Validations**:

| Rule | Error Message |
|---|---|
| From > To | "From date must be before To date" |
| Future date | "Date cannot be in the future" |
| No data types selected | "Select at least one data type to include" |
| No data in range | "No data found for the selected filters" |

### Export Actions

| Action | Format | Implementation |
|---|---|---|
| Download CSV | `.csv` | Client-side via PapaParse, blob download |
| Download PDF | `.pdf` | Serverless function with PDFKit, stream response |
| Share | System share sheet | Capacitor Share plugin or Web Share API |

### Preview

Below filters, show a preview table of the first 10 rows matching the filter. Row count badge: "Showing 10 of 47 matching entries."

**Scenarios**:

| Scenario | Flow |
|---|---|
| ✅ **Generate CSV** | Select Jan 1 - Mar 31 → Check Sugar + BP → Download CSV → Parsed data with headers: Date, Time, Type, Value, Notes → Saved to device |
| ✅ **Generate PDF** | Select same range → Download PDF → Full report with chart images, tables, header/footer → Print-friendly or share |
| ❌ **No data in range** | "No data found for January 1 - March 31" → Export buttons disabled |
| ❌ **PDF generation fails** | "Could not generate PDF. Please try again." → Fallback to CSV |
| ⚠️ **Large date range** | If > 1000 rows, show warning: "Large data set. PDF may take longer. Consider narrowing date range." |
| ⚠️ **Share on web** | Use Web Share API → Native share sheet with PDF/CSV attached |
| ⚠️ **Share on Capacitor** | Use `@capacitor/share` → Same native sheet |

---

## 12. Global Scenarios

These apply to every screen in the application.

### Session Expiry

| Scenario | Flow |
|---|---|
| ⚠️ **Session expires mid-use** | User is typing a form → Supabase cookie expires → Next API call returns 401 → AuthProvider detects → "Session expired. Please sign in again." dialog → On dismiss, redirect to `/login` → Form data is **not** saved (warn user before redirect) |
| Prevention | Middleware checks session on every route navigation. TanStack Query retry with 401 detection. |

### Network Offline

| Scenario | Flow |
|---|---|
| ⚠️ **Offline on app open** | Service worker serves cached shell → TanStack Query loads last-cached data → Banner: "You're offline. Showing last synced data." → All mutation buttons disabled with tooltip: "Connect to internet to save" |
| ⚠️ **Offline mid-session** | Network drops → Banner appears → Mutations queued in IndexedDB → When online: replay queue → Success: clear banner. Fail: "Some changes couldn't be saved" with retry button |
| ❌ **Offline + PIN unlock** | PIN works (stored in IndexedDB, no network needed) |

### Supabase Project Paused (Free Tier)

| Scenario | Flow |
|---|---|
| ⚠️ **Project paused (7 days idle)** | Any API call returns error → Banner: "Service unavailable. Tap to retry." → User taps → Ping Supabase → If resumed, continue. If not, "Please visit Supabase Dashboard to unpause your project." |
| Prevention | Add a daily cron job (Vercel Cron or GitHub Action) that hits a Supabase endpoint to prevent inactivity pause. |

### Data Deletion (Account)

| Scenario | Flow |
|---|---|
| ✅ **Delete account** | Settings → "Delete Account" → Type "DELETE" → Confirm → Supabase Auth DELETE user → CASCADE deletes all tables → Redirect to `/signup` → All data permanently gone |
| ❌ **Network fail during delete** | "Could not delete account. Please try again." — user still logged in |

### Concurrency

| Scenario | Flow |
|---|---|
| ⚠️ **Same user on two devices** | User logs sugar reading on phone → Supabase Realtime pushes update → Dashboard on laptop auto-updates within 1s |
| ⚠️ **Same user, same screen, two tabs** | No conflict — each tab operates independently. TanStack Query with `staleTime: 0` ensures fresh data on focus. |
| ❌ **Two tabs, same form submit** | Second submit hits unique constraint → "Already logged" toast — no data corruption |

---

## Appendix: Validation Rules Cheat Sheet

| Field Pattern | Validation Rule | Applied To |
|---|---|---|
| Email | Required, valid format (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`), max 255 chars | Login, Signup, Reset |
| Password | Min 8, max 128, 1 uppercase, 1 lowercase, 1 number | Signup, Reset |
| Date | Required, not future | Blood Sugar, BP, HbA1c, Weight, Activity, Quarterly |
| Time | Required, valid 24h format | Blood Sugar, BP, Medication Doses |
| Numeric value | Required, >= 0, max range per field | Sugar, BP, Weight, Water, HbA1c, Activity |
| Text length | Max 1000 chars (notes), max 300 (titles), max 2000 (descriptions) | All text fields |
| At least one | At least 1 dose, at least 1 metric, at least 1 data type | Medication, Quarterly, Reports |
| Unique per day | `(user_id, medication_id, dose_id, taken_date)` | Medication Intake |
| PIN | Exactly 4 digits, numeric only | PIN Setup, PIN Unlock |
| TOTP | Exactly 6 digits, numeric only | MFA Enrollment, MFA Challenge |
| Enums | Must be from predefined list | Meal Slot, Med Type, Time of Day, Category, Theme, Unit |
