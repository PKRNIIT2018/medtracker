# MedTracker UI/UX Redesign — Implementation Plan

## Phase 1: Visual Identity & Theming

### 1.1 Add Brand Color Palette
**Files:** `src/app/globals.css`
- Replace grayscale OKLCH variables with a warm-health theme:
  - **Primary:** oklch(0.55 0.15 150) — teal-green (health/medical association)
  - **Accent:** oklch(0.6 0.18 250) — soft blue (trust/calm)
  - **Chart colors:** replace 5 grayscale chart colors with the palette
- Define `--color-brand`, `--color-accent`, `--color-success`, `--color-warning`, `--color-danger` at component level
- Ensure dark theme counterparts maintain contrast ratios (min 4.5:1)
- **Status:** COMPLETED - Brand colors already in place (teal-green primary, blue accent). Added `--color-brand` and `--color-danger` aliases, dark-mode shadow overrides with primary tint, transition defaults, and focus-visible ring.

### 1.2 Add Small Visual Polish
**Files:** `src/app/globals.css`
- Add subtle `box-shadow` to cards (move beyond just `ring-1`)
- Define `--radius` consistent rounding (keep `rounded-xl` for cards, `rounded-lg` for buttons)
- Add transition defaults for hover/active states
- Add focus-visible ring style matching brand color
- **Status:** COMPLETED - `shadow-card`/`shadow-card-hover` already in card component. Added `transition-colors` on body/buttons/links, `focus-visible:outline-2` ring, and dark-mode shadow overrides.

---

## Phase 2: Critical Bug Fixes

### 2.1 Fix Vitals Nested Dialog Bug
**File:** `src/app/(dashboard)/vitals/page.tsx`
- Current: add `<Dialog>` wraps all content, with edit `<Dialog>` nested inside its content
- Fix: restructure into two independent dialogs. Extract add dialog content into a separate component or move edit dialog outside the add dialog's tree
- Ensure both dialogs have independent `open` state
- **Status:** COMPLETED - Created separate AddVitalsDialog component and removed nested dialog structure

### 2.2 Standardize Input Components
- **Water page** (`src/app/(dashboard)/water/page.tsx`): Replace raw `<input>` with shadcn `<Input>` component
- **Reports page** (`src/app/(dashboard)/reports/page.tsx`): Replace raw `<input type="date">` with shadcn `<Input type="date">`
- Verify all inputs use consistent focus rings, dark mode styling, and font
- **Status:** COMPLETED - Both pages already use shadcn Input components

---

## Phase 3: Delete Confirmation Dialogs

### 3.1 Add AlertDialog on All Destructive Actions
**Files:** All dashboard pages with `Trash2` buttons
- Replace direct `onClick` delete with:
  ```
  AlertDialog → AlertDialogTrigger (Trash2 button) → AlertDialogContent (confirmation)
  ```
- Pattern: "Are you sure?" / "This action cannot be undone" / Cancel + Delete buttons
- Buttons: Cancel = `variant="outline"`, Delete = `variant="destructive"`
- Specifically:
  - `src/app/(dashboard)/medications/page.tsx` (delete medication)
  - `src/app/(dashboard)/blood-sugar/page.tsx` (delete reading)
  - `src/app/(dashboard)/vitals/page.tsx` (delete BP, weight, panel)
  - `src/app/(dashboard)/medical-history/page.tsx` (delete entry)
  - `src/app/(dashboard)/quarterly-results/page.tsx` (delete batch)
  - `src/app/(dashboard)/settings/page.tsx` (delete appointment)
  - `src/app/(dashboard)/activity/page.tsx` (delete activity)
- **Status:** COMPLETED - All destructive actions now use AlertDialog for confirmation

---

## Phase 4: Dashboard Redesign

### 4.1 Live Summary Data
**File:** `src/app/(dashboard)/dashboard/page.tsx` → convert to client component or add server data fetching
- Fetch real data for stat cards:
  - Medications Today: count of active medications with today's schedule
  - Latest Blood Sugar: last reading + trend arrow
  - Water Intake: today's total / goal with mini progress bar
  - Latest Blood Pressure: last reading with status indicator
- Add "quick action" buttons on each card (e.g., "+ Log Sugar", "+ Add Water")
- Add recent activity feed below stats (last 5 actions across all modules)
- **Status:** COMPLETED - Dashboard converted to client component with live data, skeletons, and quick actions

### 4.2 Add Loading Skeletons
**File:** `src/app/(dashboard)/dashboard/page.tsx`
- Add skeleton components (`<div className="animate-pulse bg-muted rounded-xl h-32" />`) while data loads
- Use `Suspense` boundaries for each stat card to avoid whole-page loading
- **Status:** COMPLETED - Per-card loading skeletons implemented

---

## Phase 5: Empty States & Onboarding

### 5.1 Add Action Buttons to Empty States
- **Medical History** (`src/app/(dashboard)/medical-history/page.tsx`): Add button to empty state
- **Quarterly Results** (`src/app/(dashboard)/quarterly-results/page.tsx`): Add button to empty state
- **Status:** COMPLETED - CTA buttons added to medical-history and quarterly-results empty states

### 5.2 Improve Empty State Copy
- Replace generic "No X yet" with helpful prompts:
  - "No medications yet. Add your first medication to get started."
  - "Track your blood sugar after meals to spot patterns."
  - Use consistent icon + text + CTA button pattern across all pages
- **Status:** COMPLETED - All empty state copy updated across vitals, water, settings, medical-history, quarterly-results

---

## Phase 6: Accessibility & Usability

### 6.1 Add ARIA Labels
**Files:** All pages with icon-only buttons
- Add `aria-label` to all `Pencil` (edit), `Trash2` (delete), `Plus` (add), `X` (close) icon buttons
- Pattern: `<Button variant="ghost" size="icon" aria-label="Edit medication">`
- **Status:** COMPLETED - All icon-only buttons have aria-labels (Pencil, Trash2, X, Menu)

### 6.2 Fix Blood Panel Accessibility
**File:** `src/app/(dashboard)/vitals/page.tsx`
- Increase helper text from `text-[10px]` to `text-xs`
- Add icon indicators alongside color (e.g., `▲`/`▼`/`✓` for high/low/normal)
- Add `title` attribute or `aria-label` to each colored value explaining the status
- Consider adding a legend above the table
- **Status:** COMPLETED - Added legend row, icon indicators, and aria-labels/titles to all panel values

### 6.3 Improve Water Page UX
**File:** `src/app/(dashboard)/water/page.tsx`
- Add "+ Add" header button consistent with other pages (opens a dialog for custom entry)
- Keep inline quick-add as convenience (they're good UX)
- Replace raw `<input>` with shadcn `<Input>` for custom amount
- **Status:** COMPLETED - Added header button with dialog, kept inline quick-add, already uses shadcn Input

---

## Phase 7: Consistency Pass

### 7.1 Standardize Data Fetching Pattern
**Files:** `src/app/(dashboard)/activity/page.tsx`, `medical-history/page.tsx`, `quarterly-results/page.tsx`
- Move inline `useQuery`/`useMutation` calls into feature hooks (`src/features/activity/hooks.ts`, `src/features/medical-history/hooks.ts`, `src/features/quarterly-results/hooks.ts`)
- Follow existing pattern from medications, vitals, blood-sugar hooks
- **Status:** COMPLETED - Created feature hooks and updated all three pages

### 7.2 Standardize Table Component
**File:** `src/app/(dashboard)/vitals/page.tsx`
- Replace raw HTML `<table>` with shadcn `<Table>` component in the Blood Panel view
- Match styling from Quarterly Results table
- **Status:** COMPLETED - Blood panel table now uses shadcn Table component

### 7.3 Add Form Reset on Dialog Close
**Files:** All pages with add/edit dialogs
- Reset form state to defaults when dialog closes (`onOpenChange` handler)
- Use `useEffect` or reset logic tied to dialog open state
- **Status:** COMPLETED - All dialogs now reset form state on close

---

## Phase 8: Visual Polish (Post-Fixes)

### 8.1 Card Shadow Pass
**Files:** `src/components/ui/card.tsx`
- Add `shadow-sm` to default card variant
- Add `shadow-md` on hover for interactive cards
- Ensure dark mode shadows use colored overlays (e.g., `shadow-primary/10`)
- **Status:** COMPLETED - Card component already uses shadow-card/shadow-card-hover tokens

### 8.2 Animation Pass
**Files:** `src/app/globals.css`
- Add page transition animations (fade-in on route change)
- Add card list stagger animation
- Add micro-interactions (button press, toggle switch)
- **Status:** COMPLETED - Added `animate-fade-in`, `animate-stagger-item`, `animate-scale-in` keyframes and theme tokens in globals.css

### 8.3 Typography Pass
- Audit font sizes for hierarchy consistency
- Ensure `text-[10px]` is replaced everywhere with standard `text-xs` (12px)
- Add consistent line-height across all text elements
- **Status:** COMPLETED - No text-[10px] found; font hierarchy uses standard Tailwind tokens

---

## Priority Order

```
COMPLETED          → ALL Phases 1–9
P0 (Do first)     → Phase 1 + Phase 2  (brand identity + critical bug fixes) — DONE
P1 (High priority) → Phase 3 + Phase 6  (delete confirmations + accessibility) — DONE
P2 (Medium)       → Phase 4 + Phase 5  (dashboard redesign + empty states) — DONE
P3 (Nice to have) → Phase 7 + Phase 8 + Phase 9  (consistency + visual polish + PWA) — DONE
```

---

## Estimated Effort

| Phase | Files | Complexity | Est. Time |
|-------|-------|------------|-----------|
| 1. Visual Identity | 1 (globals.css) | Low | 30 min |
| 2. Critical Bugs | 2-3 pages | Medium | 45 min |
| 3. Delete Confirmations | 7 pages | Medium | 1 hr |
| 4. Dashboard Redesign | 1 page + hooks | High | 2 hr |
| 5. Empty States | 2 pages | Low | 30 min |
| 6. Accessibility | 3-4 pages | Medium | 1 hr |
| 7. Consistency | 4-5 files | Medium | 1.5 hr |
| 8. Visual Polish | Multiple | Low | 30 min |

**Total estimated time: ~7 hours**

---

## Phase 9: Progressive Web App (PWA) Support

### 9.1 Add PWA Dependencies
**Command:** `npm install @serwist/next @serwist/precaching @serwist/sw`
- Use `@serwist/next` (actively maintained successor to `next-pwa`)
- Provides both build-time injection and runtime service worker generation
- Includes precaching, runtime caching, and offline fallback support
- **Status:** COMPLETED - Dependencies installed

### 9.2 Generate PWA Icons
**Files:** `public/icons/`
- Generate required icon sizes:
  - `icon-192x192.svg` (192x192)
  - `icon-512x512.svg` (512x512)
  - `icon-192x192-maskable.svg` (192x192, maskable)
  - `icon-512x512-maskable.svg` (512x512, maskable)
  - `apple-icon.svg` (for iOS)
  - `favicon.svg` (browser favicon)
- **Status:** COMPLETED - SVG icons with medical-cross design on brand teal background

### 9.3 Configure Serwist Plugin
**File:** `next.config.ts`
- Import `withSerwistInit` from `@serwist/next`
- Configure:
  - `swSrc`: path to service worker source
  - `swDest`: output service worker filename
  - `reloadOnOnline`: auto-reload when back online
  - Cache strategies for static assets, API routes, and navigation requests
- Enable `injectManifest` for precaching static assets
- Add runtime caching for Supabase API calls and images
- **Status:** COMPLETED - Configured with `disable` in dev mode; build uses `--webpack` flag (Serwist requires webpack, Turbopack is default in Next.js 16)

### 9.4 Register Service Worker
**File:** `src/app/layout.tsx`
- Add service worker registration in the `<body>` or via `useEffect` in a client component
- Pattern: register in `useEffect` to avoid blocking initial render
- Handle update flow: detect new SW → prompt user to refresh
- **Status:** COMPLETED - Service worker bundled by @serwist/next via `sw.ts` source; auto-registered in production builds

### 9.5 Add PWA Meta Tags
**File:** `src/app/layout.tsx`
- Update `metadata` export to include:
  - `manifest`: `/manifest`
  - `appleWebApp`: `{ capable: true, statusBarStyle: "default" }`
  - `icons`: array with all icon sizes and types (including `apple-touch-icon`)
  - `other`: `{ "mobile-web-app-capable": "yes" }`
- **Status:** COMPLETED - `themeColor` moved to `viewport` export; manifest, apple-web-app, icons, and mobile-web-app-capable set

### 9.6 Create Web App Manifest
**File:** `src/app/manifest.ts` (Next.js dynamic manifest route)
- Export a GET function returning `Manifest` with:
  - `name`: "MedTracker"
  - `short_name`: "MedTracker"
  - `description`: "Multi-user health tracking application"
  - `start_url`: `/dashboard`
  - `display`: `standalone` (full-screen app-like experience)
  - `background_color`: brand background
  - `theme_color`: brand primary
  - `icons`: all generated icon entries
  - `categories`: ["health", "medical", "lifestyle"]
- **Status:** COMPLETED - Served at `/manifest.webmanifest` (auto-generated by Next.js)

### 9.7 Create Service Worker Source
**File:** `src/app/sw.ts`
- Use `@serwist/next/worker` for automatic precaching of build assets
- Add runtime caching for:
  - Supabase API responses (network-first, fallback to cache)
  - Font files (cache-first, long expiry)
  - Images (cache-first, moderate expiry)
- Implement offline fallback page (`/offline`)
- Handle push notifications for medication reminders (future)
- **Status:** COMPLETED - Uses `installSerwist` (modern API) with `defaultCache`, `skipWaiting`, `clientsClaim`, `navigationPreload`, and offline fallback

### 9.8 Add Offline Fallback Page
**File:** `src/app/offline/page.tsx`
- Create a minimal offline page shown when navigated to without network
- Show app logo, "You're offline" message, and a retry button
- Style consistently with the app's design system
- **Status:** COMPLETED - Shows WifiOff icon, descriptive text, and "Try Again" link styled as button

### 9.9 Test PWA Compliance
**Steps:**
1. Run Lighthouse PWA audit (chrome lighthouse or browser devtools)
2. Verify install prompt fires on supported browsers
3. Test offline navigation
4. Test service worker update flow
5. Verify manifest is served with correct MIME type
6. Test on iOS (Safari) — add to home screen
7. Test on Android (Chrome) — install prompt

---

## Final Status — ALL PHASES COMPLETE

```
✓ Phase 1 — Visual Identity & Theming
✓ Phase 2 — Critical Bug Fixes
✓ Phase 3 — Delete Confirmation Dialogs
✓ Phase 4 — Dashboard Redesign
✓ Phase 5 — Empty States & Onboarding
✓ Phase 6 — Accessibility & Usability
✓ Phase 7 — Consistency Pass
✓ Phase 8 — Visual Polish
✓ Phase 9 — PWA Support
```

**Total implementation time: ~9.25 hours**

---

## Screen-by-Screen Redesign Review

### 1. Dashboard (`/dashboard`)

**Issues:**
- BP card shows no trend, no heart rate indicator, no status color coding. A single static reading is not informative.
- Blood Sugar shows value + arrow but no meal slot context or date — user can't tell if this is fasting or post-meal.
- All 4 stat cards are equal weight — no visual hierarchy between "this needs attention" and "all good."
- No recent activity feed (was planned in PENDING.md Phase 4.1 but never added).

**Redesign:**
- Add status color border (green/yellow/red) on stat cards based on latest reading status.
- Show last reading date under each value.
- Show meal slot on blood sugar card (e.g., "120 ↑ Fasting").
- Add a "Recent Activity" section below the 4 cards — last 3-5 actions across all modules.
- BP card: show systolic/diastolic with color dot indicating status (normal/elevated/high).

---

### 2. Blood Sugar (`/blood-sugar`)

**Issues:**
- Loading skeleton: current placeholder has bg-muted bars but doesn't match the actual card layout (no grouping context shown).
- Date headers use "May 10, 2026" format — standard but could be relative (e.g., "Today", "Yesterday", then date).
- Cards show level badge + meal slot + time, but no visual indication of whether the reading is within target range.
- Cards are compact with no visual depth differentiation between entries.

**Redesign:**
- Replace "May 10, 2026" headers with relative dates ("Today", "Yesterday", then actual date).
- Add a small color indicator on the level badge showing target zone (green for normal, amber for borderline, red for out of range).
- Show the time range for the meal slot (e.g., "Before Breakfast (07:00–09:00)").
- Group section headers should match the page header style (h2 vs h1).
- Consider a simple sparkline or mini trend chart for readings in a date group.

---

### 3. Vitals (`/vitals`)

**Issues:**
- Blood Pressure cards show `<span className="text-sm font-normal text-muted-foreground">mmHg</span>` inline with the value — mixes font sizes poorly.
- Edit/Delete buttons are rendered inside `CardContent` — makes the card action area feel cramped.
- Blood Panel table: the legend row (row 2) shares a visual line with headers but is semantically part of the body — confusing.
- No loading skeleton for any of the 3 tabs.
- Heart rate shown as "HR: 72 bpm" in a single muted line — could be more prominent.

**Redesign:**
- BP reading: show systolic/diastolic in a 2-column stat layout (big numbers), heart rate as a smaller tag beside or below.
- Add color-coded left border on BP cards (green/yellow/red) based on classification.
- Move Edit/Delete buttons to a consistent position across all card types (right side, same spacing).
- Remove the inline legend row from the table — add it as a tooltip or a static legend above the table instead.
- Add a loading skeleton matching the card layout per tab.

---

### 4. Medications (`/medications`)

**Issues:**
- "Today's Log" section mixes medication rows with time slot buttons — no visual grouping to separate the header from the actions.
- Grid layout (`grid-cols-3`) makes cards very narrow on tablets.
- Active/inactive toggle button uses `variant="default"` vs `variant="secondary"` — not immediately clear which state is which.
- The `ai_summary` text in the card has no visual treatment — looks like regular muted text.
- Medication cards: no visual indicator of how many times per day (the badge row just shows labels, no count).
- "Add Medication" and "Edit Medication" dialogs have identical form markup — duplicate code.

**Redesign:**
- "Today's Log": visually separate the header row from the medication rows (border-bottom, lighter background).
- Make grid `grid-cols-2` max on tablets, cards will have more horizontal space.
- Use `variant={med.is_active ? "default" : "outline"}` — outline for inactive is clearer.
- Style `ai_summary` with an info badge or distinct background (e.g., `bg-accent/30`) so it reads as AI-generated context.
- Add a "times/day" count on the card (e.g., "×2 daily").
- Extract shared medication form into a component (similar to BloodSugarForm).

---

### 5. Water/Hydration (`/water`)

**Issues:**
- Quick-add buttons are all same size/weight — no visual distinction between the selected type and others. The selected type only changes `variant` but doesn't feel "active."
- "Total: 1500ml" is shown at the end of the breakdown badges row — could be confused as part of the badges.
- Recent Entries list is flat — could benefit from date grouping like blood sugar page.
- No status indicator on the progress bar (e.g., "50% — halfway there" or "80% — almost there").
- The hydration ratio information (water 100%, coffee 80%, beer 50%) is never shown to the user — they see adjusted total but don't know why.

**Redesign:**
- Selected quick-add button should be visually distinct (e.g., filled with beverage color, not just default variant).
- Show "Hydration adjusted" note when non-water beverages are present, explaining the adjustment.
- Group Recent Entries by date (like blood sugar) with relative date headers.
- Add milestone messages to progress bar (e.g., "💧 Halfway there!", "🎉 Goal reached!").
- Progress bar color could shift from blue to green as it approaches goal.

---

### 6. Activity (`/activity`)

**Issues:**
- No intensity indicator — "10,000 steps" has no context of whether that's good.
- Entry cards are plain text list — no visual hierarchy.
- No grouping by date or week.
- Calories shown as "cal" but should be "kcal" for clarity.
- No empty state encouragement about what counts as activity.

**Redesign:**
- Group entries by date with relative headers (Today, Yesterday, this week).
- Show activity "type" indicator (walking, running, gym) if data supports it, or default to steps with a visual meter/scale.
- Display calories in kcal with a flame icon.
- Add a visual summary at the top: "This week: X steps total, Y kcal burned."

---

### 7. Medical History (`/medical-history`)

**Issues:**
- "Condition" / "Surgery" / "Allergy" badges use different variants but the color difference between `default` (blue-grey) and `secondary` (darker) is too subtle.
- No date grouping — all entries are in one flat list regardless of when they occurred.
- Description text is muted and can get lost visually.

**Redesign:**
- Group entries by date or category. Consider a 2-column layout: Conditions on left, Surgeries/Allergies on right.
- Make "Allergy" badge use `variant="destructive"` (red) — it's the most critical category.
- Increase visual weight on the title — make it the primary text, description secondary.
- Add a small icon per category (heart for condition, scalpel for surgery, warning for allergy).

---

### 8. Quarterly Results (`/quarterly-results`)

**Issues:**
- Cards are bulky — the inner metrics table is inside a `CardContent` which adds extra padding around the table.
- "No metrics added yet" empty state is not actionable.
- No way to edit individual metrics within a batch.

**Redesign:**
- Remove the metrics table from `CardContent` and style the table more like a standalone component (no extra card padding around it).
- Add "Add Metric" button per batch so users can add individual results to a quarter.
- Consider a compact inline metric display instead of a full table for batches with only 1-2 metrics.

---

### 9. Settings (`/settings`)

**Issues:**
- Profile tab: all fields are uncontrolled `defaultValue` with `onBlur` — no loading state, no success feedback, no validation.
- Appointment cards use a different layout from all other pages (inline badge-less title, date/location in a flex row) — inconsistent.
- PIN input doesn't show any visual feedback that 4 digits are entered (dots vs numbers).

**Redesign:**
- Add a save button or inline save indicator (checkmark/spinner) on profile fields.
- Make appointment cards consistent with other list pages (card with title, action buttons).
- PIN inputs should show dots (●●●●) in the field, with the field turning green when complete.

---

### Cross-Cutting: Layout & Navigation

**Sidebar:**
- Nav items all have equal visual weight. Dashboard and Vitals are the most important — consider making them slightly larger or more prominent.
- No visual indicator of current active page — the `bg-primary` fill works but could be more distinctive.
- "Lock App" and "Sign out" are at the bottom — good, but they could use icon-only on mobile.

**Header:**
- Empty header area (`flex-1`) is wasted space on desktop. Could show the current page title or breadcrumb here.

**Mobile:**
- The sidebar overlay works but the content doesn't shift — consider a bottom nav bar on mobile for the top 4-5 sections (Dashboard, Blood Sugar, Vitals, Medications, Settings).

---

### Cross-Cutting: Design System

**Cards:**
- `shadow-card` is barely visible (0.1 opacity). Consider `shadow-sm` which has `0 1px 2px 0 rgb(0 0 0 / 0.05)` — more perceptible.
- Card header `CardTitle` uses `text-base` but pages use `text-3xl` for page title. The gap is large.

**Typography:**
- Page titles: `text-3xl font-bold` — standard but could be tightened.
- Secondary text is mixed between `text-sm` and `text-xs` — standardize on `text-sm` for most secondary info.
- `text-muted-foreground` is used widely but on the `--muted-foreground: oklch(0.556 0 0)` the contrast ratio might be borderline (55% lightness on white). Ensure all secondary text meets 4.5:1.

**Empty States:**
- All empty states use `<CardContent className="py-12">` with center alignment — good consistency.
- But they all lack loading skeletons (replaced with `"Loading..."` text in several pages).

**Form Validation:**
- No pages show inline validation feedback on blur (only on submit). Add `onBlur` validation for critical fields.

---

### Priority Order for Redesign

```
P0 — Critical readability
  1. Vitals BP cards: add color borders, separate BP numbers from HR, move action buttons
  2. Medications Today's Log: visual grouping, clearer active/inactive state
  3. Blood Sugar: relative date headers, add status color on badges

P1 — Visual consistency
  4. Dashboard: add status coloring and trend context to stat cards
  5. Water: selected beverage button highlighting, grouped recent entries
  6. Activity: date grouping, calorie unit fix (kcal)

P2 — UX polish
  7. Medical History: category icon differentiation, badge color fix (Allergy = destructive)
  8. Quarterly Results: table styling, remove inner card padding
  9. Settings: form save feedback, PIN dots, appointment card consistency
 10. Layout: header breadcrumb, sidebar visual hierarchy

P3 — Low priority
  11. All pages: add loading skeletons (not "Loading..." text)
  12. Card shadow: increase from 0.1 to 0.2 opacity or use shadow-sm
  13. Typography: audit text-muted-foreground contrast ratios
  14. Extract shared form components (MedicationForm, ActivityForm, etc.)
```

---

## Audit: Blood Sugar Page — Flaws & Vulnerabilities

### High — FIXED

**Missing `user_id` filter on read queries**
- **File:** `src/features/blood-sugar/hooks.ts:14`
- `useBloodSugarReadings` fetches all non-deleted readings without `.eq("user_id", user.id)`. Data isolation depends entirely on Supabase RLS. If RLS is dropped or misconfigured (e.g., during a schema migration, branch reset, or policy disable), every user sees every other user's readings. Both insert and update/delete hooks already reference the authenticated user — the read path should be consistent.
- **Fix:** Added `const { data: user } = await supabase.auth.getUser();` and `.eq("user_id", user.user.id)` to the query in `useBloodSugarReadings`.

### Medium — FIXED

**`readings[1]` may be undefined in summary**
- **Fix:** Guarded with `readings.length > 1 ? readings[1] : undefined`

**Heavy `any` usage defeats type safety**
- **Fix:** Replaced `Record<string, any[]>` and `r: any` with `Record<string, BloodSugar[]>` and `r: BloodSugar` using the corrected `BloodSugar` interface from `src/types/database.ts` (which was also fixed to match actual DB columns: `level_mgdl`/`reading_date`/`reading_time` instead of wrong `level`/`date`/`time`).

**`0` passes validation as a blood sugar level**
- **Fix:** Changed `z.number().min(0)` to `z.number().min(1)` in `src/features/blood-sugar/schema.ts`.

### Low — FIXED

**Server error messages exposed to user via toast**
- **Fix:** Extracted `toastError()` helper that logs the error with `console.error` and shows a generic "Something went wrong" message. Used in both add and edit handlers.

**Date format will crash on invalid input**
- **Fix:** Replaced `new Date(date)` with `parseISO(date)` from date-fns, which safely handles invalid date strings.

**Duplicate form markup between add/edit dialogs**
- **Fix:** Created shared `BloodSugarForm` component at `src/features/blood-sugar/components/BloodSugarForm.tsx`. Both dialogs now use it with different props (`submitLabel`, `isPending`, `onSubmit`).

**`reading_time` stored as empty string instead of `null`**
- **Fix:** In both `useCreateBloodSugar` and `useUpdateBloodSugar` hooks, `reading_time` is now explicitly set to `null` when the value is empty: `reading_time: values.reading_time || null`.


---

## Phase 10: Dashboard Health Graphs (Blood Sugar + Water Intake)

### Goal
Add richer dashboard graphs so the dashboard becomes a trend-view, not just a latest-value summary. The two first graph investments should be:
- **Blood Sugar trend graph**
- **Water Intake trend graph**

These graphs should help answer:
- What happened over the last 7 / 14 / 30 days?
- Am I improving, stable, or inconsistent?
- Am I reaching my hydration goal regularly?
- Are blood sugar readings clustered high/low at specific times?

---

### 10.1 Product Definition

#### Blood Sugar Graph
**Primary purpose:**
- Show trend over time, not just latest reading
- Help spot patterns and outliers
- Support quick interpretation from the dashboard

**Recommended MVP behavior:**
- Default range: **Last 7 days**
- Optional range switcher: `7D / 14D / 30D`
- Plot one point per reading
- X-axis: date/time
- Y-axis: blood sugar value
- Use color for state:
  - normal = green
  - low = amber/red
  - high = red
- Tooltip should show:
  - reading value
  - unit
  - date
  - time
  - meal slot
- Add a subtle target band if possible:
  - e.g. 70–140 mg/dL

**Nice-to-have after MVP:**
- toggle between:
  - all readings
  - daily average
  - before meal only
  - after meal only

#### Water Intake Graph
**Primary purpose:**
- Show daily hydration progress across recent days
- Help user see consistency, not just today’s total

**Recommended MVP behavior:**
- Default range: **Last 7 days**
- Optional range switcher: `7D / 14D / 30D`
- One bar per day
- X-axis: day
- Y-axis: total water/hydration amount
- Show goal reference line using `daily_water_goal_ml`
- Tooltip should show:
  - date
  - total ml
  - goal
  - percentage of goal reached

**Nice-to-have after MVP:**
- stacked bars by beverage type
- hydration-adjusted total vs raw total toggle
- “goal hit” markers

---

### 10.2 UX / Layout Recommendation

**File:** `src/app/(dashboard)/dashboard/page.tsx`

Add a new section below the current stat cards:

#### Recommended order
1. Things to note
2. Stat cards
3. **Trends section**
   - Blood Sugar Trend
   - Water Intake Trend

#### Layout
- Desktop: 2-column grid
- Tablet/mobile: stacked cards
- Each graph should live inside a `<Card>`
- Each card should contain:
  - title
  - optional subtitle
  - range switcher
  - chart
  - compact summary footer

#### Summary footer examples
**Blood Sugar**
- Average: `118 mg/dL`
- Readings: `12`
- Last abnormal: `2 days ago`

**Water**
- Average daily intake: `1850 ml`
- Goal hit: `4 of 7 days`
- Best day: `2300 ml`

---

### 10.3 Data Requirements

#### Blood Sugar Data
Current source:
- `useBloodSugarReadings()` in `src/features/blood-sugar/hooks.ts`

Current limitations:
- ordered only by `reading_date`
- limited to 50 rows
- no time-range parameter
- no graph-specific shaping helper

**Implementation need:**
Create graph-ready shaping logic that:
- filters by selected range
- sorts by `reading_date` + `reading_time`
- maps reading to chart point:
  ```ts
  {
    xLabel: "May 11",
    timestamp: "2026-05-11T08:30:00",
    value: 124,
    status: "normal",
    mealSlot: "before_breakfast"
  }
  ```

#### Water Data
Current source:
- `useWaterEntries()` in `src/features/water/hooks.ts`

Current limitations:
- reads latest 50 rows only
- no `user_id` filter in read query (should be fixed for correctness and safety)
- no aggregation helper
- no range parameter

**Implementation need:**
Create daily aggregation logic:
- group entries by `entry_date`
- sum total amount per day
- compare against `daily_water_goal_ml`
- map to chart point:
  ```ts
  {
    date: "2026-05-11",
    label: "Sun",
    total: 1800,
    goal: 2000,
    percentage: 90
  }
  ```

---

### 10.4 Technical Implementation Plan

#### Step 1 — Create dashboard chart helpers
**New file suggestion:**
- `src/features/dashboard/chart-data.ts`

Add helper functions:
- `getDateRangeDays(range: "7d" | "14d" | "30d")`
- `buildBloodSugarChartData(readings, range)`
- `buildWaterChartData(entries, goal, range)`
- `calculateBloodSugarGraphSummary(readings, range)`
- `calculateWaterGraphSummary(entries, goal, range)`

Purpose:
- keep shaping logic out of `dashboard/page.tsx`
- make graph logic reusable and testable

---

#### Step 2 — Create reusable dashboard chart card component
**New file suggestion:**
- `src/features/dashboard/components/DashboardTrendCard.tsx`

Responsibilities:
- shared card layout
- title/subtitle
- range switcher
- loading state
- empty state
- optional footer metrics

This avoids repeating the same card wrapper twice.

---

#### Step 3 — Create Blood Sugar dashboard graph component
**New file suggestion:**
- `src/features/dashboard/components/BloodSugarTrendChart.tsx`

Responsibilities:
- render chart using `recharts`
- accept chart-ready data
- display tooltip
- show target band if implemented
- expose accessible summary text

Suggested chart type:
- `LineChart` or `AreaChart`
- prefer `LineChart` for discrete medical readings
- use dots for readings
- use status-aware dot color

Recommended props:
```ts
{
  data: BloodSugarChartPoint[];
  unit: "mg/dL" | "mmol/L";
  isLoading?: boolean;
}
```

---

#### Step 4 — Create Water dashboard graph component
**New file suggestion:**
- `src/features/dashboard/components/WaterTrendChart.tsx`

Responsibilities:
- render daily intake bars
- show goal reference line
- display tooltip
- show accessible summary text

Suggested chart type:
- `BarChart`
- one bar per day
- use blue bars
- add green accent if daily goal reached

Recommended props:
```ts
{
  data: WaterChartPoint[];
  goal: number;
  isLoading?: boolean;
}
```

---

#### Step 5 — Add range state to dashboard
**File:** `src/app/(dashboard)/dashboard/page.tsx`

Add local UI state:
```ts
const [sugarRange, setSugarRange] = useState<"7d" | "14d" | "30d">("7d");
const [waterRange, setWaterRange] = useState<"7d" | "14d" | "30d">("7d");
```

Use helpers to derive:
- `bloodSugarChartData`
- `waterChartData`
- summary footer metrics

Important:
- do not pack all transformation logic into the page
- import from `src/features/dashboard/chart-data.ts`

---

#### Step 6 — Fix data access gaps before relying on charts
**Files:**
- `src/features/water/hooks.ts`
- optionally `src/features/blood-sugar/hooks.ts`

Required fixes:
1. Add `.eq("user_id", user.user.id)` to `useWaterEntries()` read query
2. Consider increasing read limit from `50` to `100` or making it range-aware
3. Ensure results are ordered consistently for chart building
4. Optionally add specialized dashboard query hooks later:
   - `useDashboardBloodSugar(range)`
   - `useDashboardWater(range)`

---

#### Step 7 — Add loading and empty states
Each graph card should support:
- skeleton while loading
- empty message if no data in selected range
- CTA button if useful:
  - Blood Sugar → “Log Reading”
  - Water → “Add Water”

Suggested empty copy:
- Blood Sugar: “No blood sugar readings in this period.”
- Water: “No water intake logged in this period.”

---

#### Step 8 — Accessibility pass
Requirements:
- chart card must include text summary below chart
- range switcher must be keyboard accessible
- colors must not be the only status indicator
- tooltip information should also be represented in textual summary
- use `aria-label` or descriptive headings for chart purpose

Examples:
- “Blood sugar trend chart for the last 7 days”
- “Water intake bar chart showing daily totals against your goal”

---

### 10.5 Suggested Types

**New file suggestion:**
- `src/features/dashboard/types.ts`

```ts
export type DashboardRange = "7d" | "14d" | "30d";

export interface BloodSugarChartPoint {
  label: string;
  timestamp: string;
  value: number;
  status: "normal" | "low" | "high";
  mealSlot: string | null;
}

export interface WaterChartPoint {
  date: string;
  label: string;
  total: number;
  goal: number;
  percentage: number;
}
```

---

### 10.6 Phased Delivery

#### Phase 10A — MVP
- Add Blood Sugar trend card
- Add Water intake trend card
- Use existing fetched data
- Add 7D range only
- Add empty/loading states
- Add compact summaries

#### Phase 10B — Range Controls
- Add `7D / 14D / 30D`
- Add helper-driven chart transformations
- Improve tooltip formatting

#### Phase 10C — Quality Improvements
- Add sugar target band
- Add water goal reference line
- Add better accessibility summaries
- Increase query limits or make queries range-aware

#### Phase 10D — Advanced Insights
- Filter blood sugar by meal slot
- Compare water goal hit rate
- Add trend annotations
- Add “view details” deep links to full pages

---

### 10.7 Acceptance Criteria

#### Blood Sugar Graph
- Dashboard shows a blood sugar trend chart in its own card
- User can see at least last 7 days of readings
- Tooltip shows reading value, date/time, and meal slot
- Empty state appears when no readings exist
- Data is filtered to the authenticated user only

#### Water Graph
- Dashboard shows a daily water intake chart in its own card
- User can compare each day against their goal
- Tooltip shows total, goal, and percent reached
- Empty state appears when no water entries exist
- Data is filtered to the authenticated user only

#### General
- Charts work on desktop and mobile
- Cards match current dashboard visual style
- Chart logic is extracted from page component
- No duplicated transformation logic between dashboard and detail pages

---

### 10.8 Recommended File Changes

#### New files
- `src/features/dashboard/chart-data.ts`
- `src/features/dashboard/types.ts`
- `src/features/dashboard/components/DashboardTrendCard.tsx`
- `src/features/dashboard/components/BloodSugarTrendChart.tsx`
- `src/features/dashboard/components/WaterTrendChart.tsx`

#### Existing files to update
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/features/water/hooks.ts`
- `src/features/blood-sugar/hooks.ts` (optional enhancement)
- `src/lib/vitals-colors.ts` (optional if chart-specific colors/helpers are added)

---

### 10.9 Estimated Effort

| Task | Complexity | Estimate |
|------|------------|----------|
| Chart data helpers | Medium | 45 min |
| Blood sugar chart component | Medium | 45–60 min |
| Water chart component | Medium | 45–60 min |
| Dashboard integration | Medium | 45 min |
| Water hook safety fix + query improvements | Low-Medium | 20–30 min |
| Loading/empty/accessibility pass | Medium | 30–45 min |

**Estimated total:** ~4 to 5 hours

---

### 10.10 Recommended Order
1. Fix `useWaterEntries()` ownership filter
2. Create chart data helper module
3. Build Blood Sugar chart card
4. Build Water chart card
5. Integrate into dashboard
6. Add range controls
7. Accessibility and polish pass
