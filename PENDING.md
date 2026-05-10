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

### Low

**Server error messages exposed to user via toast**
- **File:** `src/app/(dashboard)/blood-sugar/page.tsx:76`
- `toast.error(err.message)` may leak internal details. Log server-side, show a generic message to the user.

**Date format will crash on invalid input**
- **File:** `src/app/(dashboard)/blood-sugar/page.tsx:258`
- `format(new Date(date), ...)` throws on invalid dates. Use `parseISO` from date-fns or wrap in try/catch.

**No loading skeleton — FIXED**
- Replaced plain `"Loading..."` text with skeleton cards that mirror the grouped layout (3 date groups, 2 cards each with placeholder badge/text/icon buttons).

**No error state for failed queries — FIXED**
- Added error card with `AlertCircle` icon, error message, and `Retry` button that calls `refetch()`.

**Duplicate form markup between add/edit dialogs**
- **File:** `src/app/(dashboard)/blood-sugar/page.tsx:136-171` and `:178-212`
- ~40 lines of near-identical JSX. Extract into a shared `BloodSugarForm` component.

**`reading_time` stored as empty string instead of `null`**
- Schema marks `reading_time` as optional, but the form always sends `""`. Inconsistent with `notes` pattern which passes through as-is.
