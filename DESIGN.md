# MedTracker — Design System: The Clinical Sanctuary

## 1. Creative North Star

The design system is built upon the creative north star of **"The Clinical Sanctuary."** In an enterprise medical context, we move beyond the cold, utilitarian "spreadsheet" aesthetic of legacy SaaS. Instead, we embrace a high-end editorial direction that balances clinical precision with atmospheric calm.

The goal is to move away from the "boxed-in" feel of standard UI. We achieve this through **Intentional Asymmetry** and **Architectural Air**. By utilizing generous whitespace and shifting away from rigid 1px borders, we create an interface that feels like a premium, physical space—reminiscent of a modern, world-class surgical center or a high-end medical journal.

This system targets **web browsers**, **mobile devices** (Android & iOS via responsive web, PWA, and native wrappers), and **desktop** (macOS/Windows via web wrapper). The implementation strategy is **progressive layering**:

1. **Responsive Next.js web app** — works on all screens immediately
2. **PWA (Progressive Web App)** — installable on mobile/desktop with offline support
3. **Capacitor wrapper** — native Android & iOS apps from the same web codebase
4. **Electron/Tauri wrapper** — desktop apps for macOS/Windows/Linux

All layers share the same Next.js codebase and Supabase backend.

---

## 2. Color Palette & Surface Logic

The palette is rooted in the authority of Trust Blue, but its execution must be nuanced.

### Primary Palette

| Token | Light | Dark | Role |
|---|---|---|---|
| `--primary` | `#005387` | `#4a9eff` | Primary actions, active states |
| `--primary_container` | `#1B6CA8` | `#1a5599` | Gradient partner, hover states |
| `--on_primary` | `#ffffff` | `#001d36` | Text on primary backgrounds |
| `--secondary` | `#d9e3f6` | `#2a3a5c` | Secondary surfaces |
| `--on_secondary` | `#121c2a` | `#d9e3f6` | Text on secondary surfaces |

### Surface Hierarchy

Treat the UI as a series of physical layers. Use the surface tiers to "nest" importance:

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--surface` | `#f8f9ff` | `#0d1117` | Base page background |
| `--surface_container_low` | `#eff4ff` | `#161b22` | Structural sections, page-level containers |
| `--surface_container` | `#e6eeff` | `#1c2333` | Secondary grouping (e.g., sidebar background) |
| `--surface_container_high` | `#c5d6f8` | `#2d3a50` | Elevated surfaces, hover states |
| `--surface_container_lowest` | `#ffffff` | `#0d1117` | Primary content blocks, cards |

### The No-Line Rule

Explicitly prohibited: 1px solid borders for sectioning or layout containment. Boundaries must be defined solely through background color shifts:

- Use `--surface_container_low` (`#eff4ff`) for page backgrounds
- Use `--surface_container_lowest` (`#ffffff`) for primary content blocks
- This tonal transition creates a "natural" edge that is softer on the eyes and feels more sophisticated than a hard stroke

### The Glass & Gradient Rule

**Glassmorphism** for floating elements (navigation bars, modal headers, popovers):
- `--surface_container_lowest` at 80% opacity
- `backdrop-blur(20px)`
- Creates a frosted-glass effect that elevates without harsh boundaries

**Gradient CTAs** for high-impact actions:
- 135° linear gradient from `--primary` (`#005387`) to `--primary_container` (`#1B6CA8`)
- Avoid flat colors on primary buttons
- Adds "soul" and depth, mimicking the way light hits a polished clinical surface

### Semantic Colors

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--success` | `#2e7d32` | `#66bb6a` | Taken status, positive metrics |
| `--warning` | `#e65100` | `#ffa726` | Threshold warnings |
| `--danger` | `#c62828` | `#ef5350` | Skipped status, destructive actions |
| `--info` | `#005387` | `#4a9eff` | Informational badges |

---

## 3. Typography: Editorial Authority

We utilize **Inter** not as a standard web font, but as an editorial tool.

### Font Stack

| Role | Family | Weight |
|---|---|---|
| Display / Headlines | Inter | 700 (Bold) |
| Body | Inter | 400 (Regular) |
| Data / Numbers | Inter | 500 (Medium) |
| Code / Monospace | JetBrains Mono | 400 (Regular) |

### Editorial Scale

| Token | Size | Line Height | Letter Spacing | Usage |
|---|---|---|---|---|
| `display-lg` | 3.5rem (56px) | 1.1 | -0.02em | Hero metrics, doctor names |
| `display-sm` | 2.5rem (40px) | 1.15 | -0.02em | Page titles, key values |
| `headline-lg` | 2rem (32px) | 1.2 | -0.02em | Section headers |
| `headline-sm` | 1.5rem (24px) | 1.3 | -0.01em | Card titles |
| `title-md` | 1.125rem (18px) | 1.4 | 0 | Subheadings |
| `body-md` | 0.875rem (14px) | 1.6 | 0 | Clinical notes, body text |
| `body-sm` | 0.75rem (12px) | 1.5 | 0 | Metadata, labels |
| `label-xs` | 0.625rem (10px) | 1.4 | 0.01em | Badge text, timestamps |

### Contrast Hierarchy

- Use `--on_surface` (`#121c2a` light / `#e6edf3` dark) for titles and primary text
- Use `--on_surface_variant` (`#414750` light / `#8b949e` dark) for metadata and secondary text
- This subtle shift in gray-scale defines hierarchy without adding lines

### Responsive Typography

| Element | Mobile | Tablet | Desktop |
|---|---|---|---|
| Page titles | `headline-sm` (24px) | `headline-lg` (32px) | `display-sm` (40px) |
| Section headers | `title-md` (18px) | `headline-sm` (24px) | `headline-lg` (32px) |
| Card titles | `body-md` (14px) | `body-md` (14px) | `title-md` (18px) |
| Body | `body-md` (14px) | `body-md` (14px) | `body-md` (14px) |

---

## 4. Elevation & Depth

In this system, depth is a feeling, not a shadow.

### The Layering Principle

Avoid the "shadow-everything" trap. A `--surface_container_high` drawer sliding over a `--surface` background provides enough contrast to signify depth without a single drop shadow. Surface tier shifts are the primary depth mechanism.

### Ambient Shadows

When a floating state is required (e.g., a critical popover or floating action button), use an ultra-diffused shadow:

| Level | Offset | Blur | Color | Usage |
|---|---|---|---|---|
| 1 (subtle) | 0px 4px | 12px | `--on_surface` at 4% | Card hover, tooltips |
| 2 (medium) | 0px 8px | 24px | `--on_surface` at 5% | Dropdowns, popovers |
| 3 (floating) | 0px 20px | 40px | `--on_surface` at 6% | Modals, floating nav |

Never use pure black or grey for shadows. The shadow color should always derive from `--on_surface` at low opacity to maintain a premium, midnight-blue tone.

### The Ghost Border Fallback

For input fields or accessibility-critical components, use a "Ghost Border":
- Use `--outline_variant` (`#c5d6f8`) at 15% opacity
- It should be barely perceptible—just enough to guide the eye
- On focus, transition to full `--primary` at 2px thickness with a 4px outer glow

---

## 5. Component Styling

### Buttons

| Variant | Styling | Usage |
|---|---|---|
| **Primary** | 135° gradient `--primary` → `--primary_container`. Pill shape (`rounded-full`). White text. `shadow-sm`. | High-impact actions (Save, Add, Confirm) |
| **Secondary** | No background. Ghost border using `--primary` at 20% opacity. Pill shape. | Alternative actions |
| **Ghost** | No border. No background until hover (`--surface_container_high`). | Icon buttons, toolbar items |
| **Destructive** | Solid `--danger` background. White text. | Delete, remove actions |
| **Link** | Text only, underlined on hover. | Navigation, "view all" links |

**States:** On hover, increase gradient intensity for primary. Avoid sudden color shifts — use `transition-all duration-150`.

### Input Fields

- Background: `--surface_container_lowest`
- Ghost border: `--outline_variant` at 15% opacity, `1px` width
- Radius: `md` (6px)
- Focus state: `--primary` ring at `2px` thickness with a `4px` outer glow using `--primary` at 10% opacity
- Padding: `12px 16px` (`py-3 px-4`)
- Placeholder: `--on_surface_variant` at 60% opacity

### Cards & Lists

- **The Divider Rule:** Forbid 1px dividers between list items. Use vertical white space (`16px` from the spacing scale) or a subtle shift from `--surface_container_low` to `--surface_container`.
- Cards sit on `--surface_container_lowest` atop a `--surface_container_low` page background
- Soft natural lift: achieved purely through tonal contrast, no mandatory shadow
- **Patient data cards:** Use asymmetrical layout. Key metrics can slightly overlap card boundaries to break the "grid-box" look

### Scheduling Chips / Badges

| Variant | Styling |
|---|---|
| Default (pending) | `--surface_container` background, `--on_surface_variant` text. Pill shape (`rounded-full`). |
| Active (taken) | `--success` background at 15% opacity, `--success` text. `rounded-full`. |
| Skipped | `--danger` background at 15% opacity, `--danger` text. `rounded-full`. |
| Interactive | Hover transitions to `--primary_container` at 15% opacity. Cursor pointer. |

### Navigation Components

- **Top nav / header:** Glassmorphism — `--surface_container_lowest` at 80% opacity, `backdrop-blur(20px)`, bottom boundary via `--surface_container_high` (not a border line)
- **Mobile bottom tab bar:** Same glassmorphism treatment
- **Desktop sidebar:** `--surface_container` background, no border-right. Separated from content by tonal shift alone
- **FAB:** Gradient button (same as primary), `rounded-full`, `shadow-md`, `56x56px`

---

## 6. Do's and Don'ts

### Do

- **Embrace the "White Space":** If a section feels crowded, remove a border and add `24px` of padding instead
- **Use Tonal Shifts:** Always ask: "Can I define this area with a background color change instead of a line?"
- **Typography First:** Use `headline-sm` to start every major module to establish immediate context
- **Use Asymmetry:** Let key metrics and data points break out of rigid grid boxes for visual interest

### Don't

- **Don't use "Drop Shadows":** Never use the default CSS shadow settings. They are too heavy for a medical aesthetic. Use the Ambient Shadow rules in Section 4
- **Don't use Pure Black:** There is no `#000000` in this system. Use `--on_surface` for the darkest values
- **Don't Box the Data:** Avoid putting every table in a bordered box. Let the data breathe on a `--surface_container_lowest` background
- **Don't use 1px borders** for sectioning — use background color shifts
- **Don't use flat colors on primary CTAs** — always use the gradient

---

## 7. Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    Presentation Layer                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │   Web    │  │  Mobile  │  │  Desktop  │  │  PWA     │ │
│  │ Browser  │  │ (Capacitor)│ │(Electron) │  │ Install  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
│       └──────────────┴─────────────┴──────────────┘       │
│                         │                                  │
│              ┌──────────▼──────────┐                       │
│              │   Next.js (App Router) / React              │
│              │   Tailwind CSS / shadcn/ui                  │
│              │   Recharts / Chart.js                       │
│              └──────────┬──────────┘                       │
├─────────────────────────┼──────────────────────────────────┤
│                    API / Data Layer                         │
│  ┌──────────────────────▼──────────────────────┐           │
│  │        Supabase Client (JS SDK)             │           │
│  │  ┌────────────┐  ┌──────────┐  ┌────────┐  │           │
│  │  │  Real-time  │  │  Storage  │  │  Auth  │  │           │
│  │  └────────────┘  └──────────┘  └────────┘  │           │
│  └──────────────────────┬──────────────────────┘           │
│                         │                                  │
│  ┌──────────────────────▼──────────────────────┐           │
│  │        Service Worker (offline cache)        │           │
│  └──────────────────────┬──────────────────────┘           │
├─────────────────────────┼──────────────────────────────────┤
│                    Backend                                  │
│  ┌──────────────────────▼──────────────────────┐           │
│  │      Supabase (PostgreSQL + RLS)            │           │
│  │      Vercel Cron Jobs (reminders)           │           │
│  │      Vercel Serverless (PDF generation)     │           │
│  └─────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Cross-Platform Strategy

### Layer 1: Responsive Web (Primary)

| Aspect | Choice |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Styling | Tailwind CSS with responsive breakpoints |
| UI Kit | shadcn/ui (Radix primitives, accessible, responsive) |
| Charts | Recharts (SVG-based, responsive) |
| Forms | React Hook Form + Zod validation |

**Responsive breakpoints used across all pages:**
- `sm` (640px) — small phones
- `md` (768px) — tablets / large phones landscape
- `lg` (1024px) — desktop
- `xl` (1280px) — wide desktop

**Layout strategy:**
- Mobile: single-column stack, bottom navigation bar (fixed, glassmorphism), FABs for quick actions
- Tablet: 2-column grid on dashboard, side nav collapsible
- Desktop: full side navigation, multi-column layouts, keyboard shortcuts

**Surface hierarchy on each device:**
- Page background: `--surface_container_low`
- Content cards: `--surface_container_lowest`
- Navigation: Glassmorphism (`bg-white/80 backdrop-blur-xl`)
- Dialogs/Popovers: `--surface_container_lowest` with ambient shadow (Level 3)

### Layer 2: PWA (Installable on Mobile & Desktop)

The Next.js app is enhanced with PWA capabilities for installable mobile/desktop experience without app store.

| Feature | Implementation |
|---|---|
| Service Worker | `@serwist/next` — precaches static assets and API routes |
| Manifest | `public/manifest.json` — app name, icons (192px + 512px), theme color: `#005387`, display: `standalone` |
| Offline fallback | Cache-first strategy for static assets, network-first for data |
| Push notifications | Web Push API + VAPID keys via `serviceWorker.register()` |
| iOS specifics | `<meta name="apple-mobile-web-app-capable" content="yes">`, splash screens, status bar styling |

**PWA scope:** All routes except PDF export (opens in system browser).

### Layer 3: Native Mobile (Capacitor)

When the user needs native features (reliable push notifications, background sync, widgets), wrap the Next.js build with **Capacitor**.

> **⚠️ Important compatibility note**: Next.js App Router uses server components, API routes, and middleware — none of which work in a static export. To use Capacitor, you must switch to `output: 'export'` in `next.config.ts`, which disables SSR, API routes, and middleware. Plan this as a separate build pipeline (`next.config.capacitor.ts`) rather than the primary web deployment.

```
Next.js static export (out/)
  output: 'export' in next.config.ts
       │
  capacitor.config.ts
       │
  npx cap add android
  npx cap add ios
       │
  ┌────┴────┐
  │ Android │  iOS │
  └─────────┘
```

**Alternative**: Use a shared Supabase backend + a separate React Native (Expo) app for native, rather than trying to wrap Next.js with Capacitor.

**Capacitor plugins needed (if this path is chosen):**
- `@capacitor/push-notifications` — native push (FCM / APNs)
- `@capacitor/local-notifications` — local scheduling for reminders
- `@capacitor/share` — share exported PDF/CSV
- `@capacitor/filesystem` — save exports to device
- `@capacitor/app-launcher` — deep linking from reminders

### Layer 4: Desktop (Electron / Tauri)

Wrap the same Next.js build for desktop distribution.

| Option | Pros | Cons |
|---|---|---|
| **Electron** | Mature, large ecosystem, auto-update | Larger bundle size (~150MB) |
| **Tauri** | Much smaller (~5MB), Rust-based, more secure | Requires Rust toolchain, younger ecosystem |

**Recommended: Tauri** — the app is relatively lightweight; Tauri's smaller footprint (~5MB vs Electron's ~150MB) and better security model make it the better choice for a health tracking app.

---

## 9. Navigation & Routing

### Page Structure (Next.js App Router)

```
/                          Dashboard
├── /medications           Medication list (grouped by time of day)
│   └── /add               Add medication form
├── /vitals                All vitals (sugar, BP, HbA1c, weight)
│   ├── /sugar             Sugar detail (meal-slot grouped)
│   ├── /pressure          BP detail
│   ├── /hba1c             HbA1c detail
│   └── /weight            Weight detail
├── /water                 Water tracking
├── /activity              Activity log (steps / calories)
├── /medical-history       Medical History (conditions / surgeries / allergies)
├── /quarterly             Quarterly lab results
│   └── /[id]              Single quarterly result detail
├── /reports               History & export center
└── /settings              All settings & medication management
```

### Navigation Components

| Screen Width | Navigation Pattern |
|---|---|
| < 768px (mobile) | Bottom tab bar (5 tabs: Dashboard, Meds, Vitals, History, Settings) + FAB for quick-add |
| 768-1024px (tablet) | Collapsible side rail + bottom bar |
| > 1024px (desktop) | Fixed left sidebar (icon + label) |

**Bottom tab bar items (mobile):**
1. **Dashboard** (house icon) — `/`
2. **Meds** (pill icon) — `/medications`
3. **Vitals** (heart icon) — `/vitals`
4. **History** (clock icon) — `/reports`
5. **Settings** (gear icon) — `/settings`

**Quick-add FAB** (mobile only): expands to show 4 options — Record Sugar, Log Meds, Water, Activity.

**Navigation styling:**
- All nav surfaces use glassmorphism (`bg-white/80 backdrop-blur-xl` in light, `bg-[#0d1117]/80 backdrop-blur-xl` in dark)
- Desktop sidebar uses `--surface_container` background (no border-right), separated from content by tonal shift
- Active tab uses `--primary` text with subtle `--primary` background at 10% opacity

---

## 10. State Management

### Data Flow

```
Supabase (source of truth)
    │
    ▼
React Query / TanStack Query (server state cache)
    │
    ├──► Optimistic updates on mutations
    ├──► Background refetch on focus
    └──► Offline queue with retry
    │
    ▼
Zustand (client-only UI state)
    - Selected date / filter
    - UI preferences (sidebar open, etc.)
    - Notification permission status
```

| Category | Tool | Rationale |
|---|---|---|
| Server state (data) | TanStack Query | Cache invalidation, optimistic updates, pagination |
| UI state | Zustand | Lightweight, no boilerplate, persist-able |
| Form state | React Hook Form | Performant, minimal re-renders |
| URL state | Next.js searchParams | Shareable filters, date ranges |

---

## 11. Offline & Caching Strategy

### Service Worker Caching

| Resource | Strategy | Rationale |
|---|---|---|
| Static assets (JS/CSS/fonts) | Cache-first | Fastest load, rarely changes |
| App shell (HTML) | Network-first, cache fallback | Fresh content, offline fallback |
| API data (Supabase queries) | Network-only (with TanStack Query persist) | Data freshness critical for health tracking |
| SVG icons, images | Cache-first | Never changes |

### Offline Data Access

- TanStack Query `persistQueryClient` saves last-fetched data to IndexedDB
- Read-only access to last-synced data while offline
- Mutations are queued and replayed when online
- User sees a subtle "offline" banner using `--warning` at 15% opacity

---

## 12. Notification Architecture

### Local Notifications (Scheduled)

Scheduled client-side using the Web Notification API (PWA) or Capacitor Local Notifications (native).

| Notification Type | Trigger | Scheduling |
|---|---|---|
| Medication reminder | Fixed time per dose | `setTimeout` on app open + service worker re-registration |
| Sugar measurement prompt | Before breakfast/lunch/dinner | Configurable window in settings |
| Overdue medication | 30 min after scheduled time | Checked on app focus + interval |
| Missed dose summary | End of day | Local notification at configured "wind down" hour |

### Push Notifications (Server-side)

Fallback for when the app is closed. Sent via Vercel Cron Job → Supabase Edge Function → Web Push API / FCM (Capacitor).

```
Vercel Cron (every 5 min)
    │
    ▼
Check user_settings + medications/medication_doses
    │
    ▼
If current time matches dose_time within window
    │
    ▼
Send push via Web Push API (PWA) or FCM (Capacitor)
```

---

## 13. Export Architecture

### Data Flow for Exports

```
User selects date range + types on /reports page
    │
    ▼
App queries Supabase with filters
    │
    ▼
Data formatted into report structure
    │
    ├──► CSV: Generated client-side using PapaParse
    │       (download via blob URL)
    │
    └──► PDF: Generated server-side using Vercel Serverless + PDFKit
            (stream response, then download / share)
```

### Export Formats

| Format | Use Case | Generation |
|---|---|---|
| **CSV** | Quick data dump for doctor's spreadsheet | Client-side (PapaParse) |
| **PDF** | Printable report for Doctor visit | Serverless function (PDFKit) |

### PDF Report Sections

1. **Header**: App name, "Report for [date range]", generated date
2. **Blood Sugar**: Table (Date, Meal Slot, Level, Notes) + trend chart
3. **Blood Pressure**: Table (Date, Systolic, Diastolic, HR, Notes) + trend chart
4. **Medication Adherence**: Summary stats + daily taken/skipped table
5. **HbA1c**: History table
6. **Weight**: Trend over period
7. **Quarterly Results**: Comparison table across quarters
8. **Footer**: Disclaimer

---

## 14. Supabase Integration

### Client Setup

```typescript
// lib/supabase.ts — SSR Server Client (Server Components, Route Handlers, Middleware)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createServerSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => cookieStore.set({ name, value, ...options }),
        remove: (name, options) => cookieStore.set({ name, value: '', ...options }),
      },
    }
  )
}
```

```typescript
// lib/supabase-browser.ts — Browser Client (Client Components)
import { createBrowserClient } from '@supabase/ssr'

export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Real-time Subscriptions

- Live dashboard updates via Supabase Realtime on `medication_intake` and `blood_sugar` tables
- Only subscribe when the dashboard page is active (cleanup on unmount)

### Row-Level Security

Every data table has RLS enabled scoped to the authenticated user:

```sql
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_medications_all"
  ON medications FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

---

## 15. Authentication Architecture

### Auth Methods & Priority

The app supports four authentication methods, presented to the user in priority order:

```
1. App PIN (local)     → 4-digit code stored hashed in IndexedDB
2. Passkey (biometric)  → Fingerprint / Face ID via WebAuthn (Supabase native)
3. Email + Password     → Standard Supabase Auth
4. TOTP MFA             → Optional extra layer via authenticator app
```

### Auth Flow

```
App opened
    │
    ▼
Next.js Middleware checks Supabase session cookie
    │
    ├── No session → redirect to /login
    │                    │
    │                    ├── Email + Password sign in
    │                    ├── "Login with Passkey" (biometric prompt)
    │                    └── "Sign up" link → /signup
    │
    └── Session exists → check if PIN enabled
                            │
                            ├── PIN enabled → redirect to /pin
                            │                     │
                            │                     └── Enter 4-digit PIN → verify hash → Dashboard
                            │
                            └── PIN disabled → check MFA
                                                │
                                                ├── MFA required → TOTP challenge → Dashboard
                                                │
                                                └── MFA not required → Dashboard
```

### Pages

| Route | Access | Description |
|---|---|---|
| `/login` | Public | Email/password form + "Login with Passkey" button |
| `/signup` | Public | Registration form (email + password) |
| `/reset-password` | Public | Forgot password flow |
| `/auth/callback` | Public | Handles OAuth/passkey/MFA redirect callbacks |
| `/pin` | Authenticated (pre-PIN) | 4-digit PIN pad for quick unlock |
| All other routes | Authenticated + PIN verified | Protected by middleware |

### Login Page UI

```
┌──────────────────────────┐
│       MedTracker          │
│        (logo)             │
│                          │
│  Email                   │
│  ┌──────────────────────┐│
│  │ user@example.com     ││
│  └──────────────────────┘│
│                          │
│  Password                │
│  ┌──────────────────────┐│
│  │ ********             ││
│  └──────────────────────┘│
│                          │
│  ┌──────────────────────┐│
│  │     Sign In          ││  ← gradient button
│  └──────────────────────┘│
│                          │
│  ──── or ────            │
│                          │
│  ┌──────────────────────┐│
│  │ 🔒 Login with        ││
│  │    Passkey            ││
│  └──────────────────────┘│
│                          │
│  Don't have an account?  │
│  Sign up                 │
└──────────────────────────┘
```

### PIN Lock Screen UI

```
┌──────────────────────────┐
│                          │
│     🔒                   │
│  Enter PIN               │
│                          │
│    ● ● ● ●               │
│                          │
│  ┌───┐ ┌───┐ ┌───┐      │
│  │ 1 │ │ 2 │ │ 3 │      │
│  └───┘ └───┘ └───┘      │
│  ┌───┐ ┌───┐ ┌───┐      │
│  │ 4 │ │ 5 │ │ 6 │      │
│  └───┘ └───┘ └───┘      │
│  ┌───┐ ┌───┐ ┌───┐      │
│  │ 7 │ │ 8 │ │ 9 │      │
│  └───┘ └───┘ └───┘      │
│  ┌───┐ ┌───┐ ┌───┐      │
│  │   │ │ 0 │ │ ⌫ │      │
│  └───┘ └───┘ └───┘      │
│                          │
│  "Use Passkey" option     │
│  (if passkey registered)  │
└──────────────────────────┘
```

### Middleware (Route Protection)

```typescript
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => {
          res.cookies.set({ name, value, ...options })
        },
        remove: (name, options) => {
          res.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const path = req.nextUrl.pathname

  // Public routes — no session required
  const isPublicRoute =
    path.startsWith('/login') ||
    path.startsWith('/signup') ||
    path.startsWith('/reset-password') ||
    path.startsWith('/auth/callback')

  // PIN route — requires session but not PIN itself
  const isPinRoute = path.startsWith('/pin')

  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (session && isPublicRoute) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|webp)$).*)',
  ],
}
```

**Important**: The middleware checks the session cookie only. PIN verification status is stored in client state (Zustand) and checked on app load after middleware passes. If the user navigates directly to `/` without completing PIN, a client-side check redirects them to `/pin`.

### Session & Auth Providers

```typescript
// providers/auth-provider.tsx
'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

const AuthContext = createContext<{ user: User | null; loading: boolean }>({
  user: null, loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        router.refresh()
      }
    )
    return () => subscription.unsubscribe()
  }, [router])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useUser = () => useContext(AuthContext)
```

**Loading state handling**: The root layout should show a global spinner while `loading` is true to prevent flash of unauthenticated content:

```tsx
// app/layout.tsx
'use client'
import { useUser } from '@/providers/auth-provider'

function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading } = useUser()
  if (loading) return <div className="flex h-screen items-center justify-center">
    <Spinner />
  </div>
  return <>{children}</>
}
```

### PIN Storage (Client-side)

The 4-digit PIN is hashed with bcrypt and stored locally — never sent to the server.

```typescript
// lib/pin-storage.ts
import bcrypt from 'bcryptjs'

const PIN_DB_KEY = 'medtracker_pin'

export async function getPinHash(): Promise<string | null> {
  const db = await openDB()
  return (await db.get('pin', PIN_DB_KEY))?.hash ?? null
}

export async function setPinHash(pin: string): Promise<void> {
  const salt = await bcrypt.genSalt(10)
  const hash = await bcrypt.hash(pin, salt)
  const db = await openDB()
  await db.put('pin', { id: PIN_DB_KEY, hash })
}

export async function verifyPin(pin: string): Promise<boolean> {
  const hash = await getPinHash()
  if (!hash) return false
  return bcrypt.compare(pin, hash)
}

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('MedTracker', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('pin', { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
```

### Passkey Registration Flow

After login, the user is prompted to optionally register a passkey:

```
Settings → "Register Passkey"
    │
    ▼
supabase.auth.registerPasskey()
    │
    ▼
Browser shows biometric prompt (Face ID / Touch ID / Windows Hello)
    │
    ▼
Passkey credential stored in auth.passkeys (managed by Supabase)
    │
    ▼
On subsequent logins, "Login with Passkey" button triggers:
    supabase.auth.signInWithPasskey()
    → Biometric prompt → Session created
```

### PIN Bypass Prevention

The PIN is a client-side convenience lock, not server-side auth. To prevent bypass:

1. **Zustand store** tracks `pinVerified: boolean` (default: `false`)
2. **Root layout** (client component) checks:
   - If session exists AND PIN is enabled AND `pinVerified === false` → redirect to `/pin`
   - After successful PIN entry → set `pinVerified = true` in Zustand
3. **On tab close** → persist `pinVerified = false` (Zustand persist in sessionStorage, not localStorage)
4. **Passkey bypass**: If user logs in via passkey, also set `pinVerified = true` (passkey is equivalent auth)

```typescript
// stores/pin-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PinState {
  pinVerified: boolean
  setPinVerified: (v: boolean) => void
}

export const usePinStore = create<PinState>()(
  persist(
    (set) => ({
      pinVerified: false,
      setPinVerified: (v) => set({ pinVerified: v }),
    }),
    { name: 'pin-storage', storage: {
        getItem: (name) => {
          const v = sessionStorage.getItem(name)
          return v ? JSON.parse(v) : null
        },
        setItem: (name, v) => sessionStorage.setItem(name, JSON.stringify(v)),
        removeItem: (name) => sessionStorage.removeItem(name),
      },
    }
  )
)
```

```typescript
// Root layout PIN guard
const { user, loading: authLoading } = useUser()
const { pinVerified } = usePinStore()

// Get PIN enabled status from user_settings (via TanStack Query)
const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: fetchSettings })

if (!authLoading && user && settings?.app_pin_enabled && !pinVerified && pathname !== '/pin') {
  router.push('/pin')
}
```

---

### TOTP MFA Enrollment Flow

```
Settings → "Enable MFA"
    │
    ▼
supabase.auth.mfa.enroll({ factorType: 'totp' })
    │
    ▼
Show QR code + secret key for user to scan in authenticator app
    │
    ▼
User enters verification code from app
    │
    ▼
supabase.auth.mfa.verify({ factorId, code, challengeId })
    │
    ▼
MFA enabled — on next login, user verifies TOTP code after password/passkey
```

### Auth Related Dependencies

```json
{
  "@supabase/ssr": "^0.4",
  "@supabase/supabase-js": "^2",
  "bcryptjs": "^2.4",
  "@simplewebauthn/browser": "^10"
}
```

---

## 16. Mobile-First Design Principles

### Touch Targets

- All interactive elements minimum **44x44px** (Apple HIG) / **48x48px** (Material Design)
- FAB is **56x56px** with adequate margin from bottom bar
- Form inputs have large padding (`py-3` minimum on mobile)

### Spacing

- Mobile: `p-4` (16px) page padding, `gap-3` (12px) between cards
- Desktop: `p-8` (32px) page padding, `gap-4` (16px) between cards
- Stacking cards use `space-y-3` on mobile, `space-y-4` on desktop
- Section separation uses `space-y-8` (32px) — generous whitespace over border lines

### Gesture Support

| Gesture | Action | Platform |
|---|---|---|
| Pull-to-refresh | Re-fetch current page data | Mobile (PWA + Capacitor) |
| Swipe to delete | Delete medication intake / log entry | Mobile |
| Long press | Enter edit mode on list items | Mobile |
| Tap | Navigate / toggle | All |

---

## 17. Performance Targets

| Metric | Target |
|---|---|
| First Contentful Paint (FCP) | < 1.5s |
| Largest Contentful Paint (LCP) | < 2.5s |
| First Input Delay (FID) | < 100ms |
| Cumulative Layout Shift (CLS) | < 0.1 |
| Lighthouse score | > 90 on all categories |
| Bundle size (initial JS) | < 150KB gzipped |
| API response time (median) | < 200ms |

### Optimization Strategies

- **Next.js Image** for all static assets
- **Streaming SSR** for data-heavy pages (dashboard)
- **Route prefetching** for top-level navigation items
- **Dynamic imports** for chart libraries (Recharts is loaded only on pages with charts)
- **Server components** where no interactivity is needed (list views, read-only pages)
- **Client components** for forms, interactive charts, real-time updates

---

## 18. Error Handling

### Error Boundaries

Every route group should have a Next.js `error.tsx` and `loading.tsx`:

```
src/app/
├── error.tsx                    # Global error boundary
├── loading.tsx                  # Global loading skeleton
├── medications/
│   ├── error.tsx                # Medication-specific errors
│   ├── loading.tsx              # Medication list skeleton
│   └── ...
├── vitals/
│   ├── error.tsx
│   ├── loading.tsx
│   └── ...
└── ...
```

### API Error Handling

- All TanStack Query calls have `.catch()` or `onError` handlers
- Supabase errors are logged client-side and shown as toast notifications (sonner)
- Offline mutations are queued; if replay fails, user is notified with retry option

### CSRF Protection

- Supabase uses `Set-Cookie` with `SameSite=Lax` by default
- No additional CSRF token needed for same-site requests
- For Capacitor native apps, use `@supabase/ssr` with PKCE flow (no cookies, uses code verifier)

### bcryptjs Performance Note

`bcryptjs` runs in the browser for PIN hashing. With 10 salt rounds, hashing takes ~300ms and verification ~100ms. This is acceptable for a 4-digit PIN unlock. If performance is a concern, switch to a faster hash like SHA-256 (less secure but still adequate for a local convenience lock).

---

## 19. Accessibility

- All forms use proper `<label>` elements and `aria-*` attributes
- Color is never the sole indicator of meaning (supplement with icons + text)
- Charts have `aria-label` descriptions and support `prefers-reduced-motion`
- Navigation uses `aria-current="page"` for active tab
- Focus indicators visible on all interactive elements (use ghost border on focus, not outline)
- Touch targets meet WCAG 2.1 minimum (44x44px)
- Surface tier contrast ratios maintain minimum 4.5:1 for text, 3:1 for large text

---

## 20. Deployment Pipeline

```
Git Push (main branch)
    │
    ▼
Vercel Build
    ├── Next.js build (static + serverless)
    ├── PWA service worker generation
    └── Supabase schema migration (via GitHub Action or manual)
    │
    ▼
Vercel Deploy (Production)
    │
    ▼
[Optional] Capacitor build → App Store / Play Store
[Optional] Tauri build → GitHub Releases
```

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=

# Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
```

---

## 21. File Structure (Full)

```
medtracker/
├── src/
│   ├── middleware.ts                  # Route protection (session check + redirect)
│   ├── stores/
│   │   └── pin-store.ts               # PIN verification state (Zustand + sessionStorage)
│   ├── app/                           # Next.js App Router pages
│   │   ├── page.tsx                   # Dashboard (protected)
│   │   ├── layout.tsx                 # Root layout (providers, nav, auth gate)
│   │   ├── error.tsx                  # Global error boundary
│   │   ├── loading.tsx                # Global loading skeleton
│   │   ├── login/page.tsx             # Email/password + passkey login
│   │   ├── signup/page.tsx            # Registration
│   │   ├── reset-password/page.tsx    # Forgot password
│   │   ├── auth/callback/page.tsx     # OAuth/passkey/MFA callback
│   │   ├── pin/page.tsx               # PIN unlock screen
│   │   ├── medications/
│   │   │   ├── page.tsx               # Medication list (grouped by time)
│   │   │   ├── loading.tsx
│   │   │   └── add/page.tsx           # Add medication form
│   │   ├── vitals/
│   │   │   ├── page.tsx               # All vitals overview
│   │   │   ├── sugar/page.tsx
│   │   │   ├── pressure/page.tsx
│   │   │   ├── hba1c/page.tsx
│   │   │   └── weight/page.tsx
│   │   ├── water/page.tsx
│   │   ├── activity/page.tsx
│   │   ├── medical-history/page.tsx
│   │   ├── quarterly/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx          # Requires generateStaticParams
│   │   ├── reports/page.tsx
│   │   └── settings/
│   │       ├── page.tsx               # Main settings
│   │       └── security/page.tsx      # Passkey, PIN, MFA management
│   ├── components/
│   │   ├── ui/                        # shadcn/ui primitives
│   │   ├── atoms/                     # Button, Input, Badge, Card, Modal, Progress
│   │   ├── molecules/                 # DatePicker, FormField, ConfirmDialog, FAB
│   │   ├── organisms/                 # MedicationCard, VitalsCard, WaterProgress, SugarChart
│   │   └── templates/                 # DashboardLayout, FormLayout, ListLayout
│   ├── hooks/
│   │   ├── use-medications.ts
│   │   ├── use-blood-sugar.ts
│   │   ├── use-water-intake.ts
│   │   ├── use-activity.ts
│   │   ├── use-settings.ts
│   │   ├── use-notifications.ts
│   │   ├── use-auth.ts                 # Login, signup, logout, session
│   │   ├── use-passkey.ts              # Passkey registration + auth
│   │   └── use-mfa.ts                  # TOTP enrollment + verification
│   ├── lib/
│   │   ├── supabase.ts                # Supabase SSR server client
│   │   ├── supabase-browser.ts        # Supabase browser client
│   │   ├── utils.ts                   # formatDate, cn(), etc.
│   │   ├── constants.ts               # meal slots, units, goals
│   │   ├── notifications.ts           # Notification scheduling helpers
│   │   └── pin-storage.ts             # PIN hash read/write to IndexedDB
│   ├── providers/
│   │   ├── auth-provider.tsx          # Session context + user state
│   │   ├── pin-provider.tsx           # PIN lock state context
│   │   ├── query-provider.tsx         # TanStack Query provider
│   │   └── theme-provider.tsx         # next-themes provider
│   └── types/
│       ├── medication.ts
│       ├── vitals.ts
│       ├── water.ts
│       ├── activity.ts
│       ├── medical-history.ts
│       ├── quarterly.ts
│       └── settings.ts
├── public/
│   ├── manifest.json                  # PWA manifest
│   ├── sw.js                           # Service worker
│   ├── icons/                          # App icons (192, 512, maskable)
│   └── screenshots/                    # PWA screenshots for store listing
├── capacitor/                          # Capacitor native project
│   ├── android/
│   └── ios/
├── tauri/                              # Tauri desktop (optional future)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 22. Key Dependencies

```json
{
  "dependencies": {
    "next": "^14.2",
    "react": "^18.3",
    "react-dom": "^18.3",
    "@supabase/supabase-js": "^2.45",
    "@supabase/ssr": "^0.5",
    "@tanstack/react-query": "^5.60",
    "zustand": "^5.0",
    "react-hook-form": "^7.54",
    "zod": "^3.24",
    "recharts": "^2.15",
    "lucide-react": "^0.468",
    "date-fns": "^4.1",
    "papaparse": "^5.5",
    "sonner": "^1.7",
    "bcryptjs": "^2.4",
    "@simplewebauthn/browser": "^10"
  },
  "devDependencies": {
    "typescript": "^5.7",
    "tailwindcss": "^4.0",
    "autoprefixer": "^10",
    "postcss": "^8",
    "@serwist/next": "^9",
    "pdfkit": "^0.16",
    "@capacitor/cli": "^7",
    "@capacitor/android": "^7",
    "@capacitor/ios": "^7"
  }
}
```

---

## 23. Referenced Documents

| Document | Description |
|---|---|
| [`REQUIREMENTS.md`](./REQUIREMENTS.md) | Full user requirements & implementation tasks |
| [`DB_DESIGN.md`](./DB_DESIGN.md) | PostgreSQL schema, indexes, RLS policies |
| [`PENDING.md`](./PENDING.md) | Implementation plan & task tracking |

---

## 24. Migration Plan: Current → Clinical Sanctuary

### Phase 1: CSS Tokens & Globals (Estimated: 2-3 hrs)

| Step | File | Change | Effort |
|---|---|---|---|
| 1.1 | `src/app/globals.css` | Replace OKLCH tokens with Clinical Sanctuary hex palette (`#005387`, `#1B6CA8`, surface layers). Add surface hierarchy tokens. Remove global `* { @apply border-border }`. | 45 min |
| 1.2 | `src/app/globals.css` | Add ambient shadow tokens (Level 1-3). Add ghost border token (`outline_variant` at 15%). Add `backdrop-blur-xl` utility. | 20 min |
| 1.3 | `src/app/globals.css` | Add editorial typography scale (`display-lg` through `label-xs`). Set Inter as font family. | 20 min |
| 1.4 | `tailwind.config.ts` (or `globals.css`) | Register surface tokens as Tailwind theme extensions. Map `bg-surface` etc. | 15 min |
| 1.5 | `src/app/layout.tsx` | Update metadata `themeColor` to `#005387`. Load Inter font via `next/font`. | 15 min |

### Phase 2: Layout & Navigation (Estimated: 2 hrs)

| Step | File | Change | Effort |
|---|---|---|---|
| 2.1 | Sidebar component | Remove `border-r`. Change background to `--surface_container`. Add glassmorphism treatment if floating. | 30 min |
| 2.2 | Top nav / header | Add glassmorphism: `bg-white/80 backdrop-blur-xl`. Remove `border-b`. | 20 min |
| 2.3 | Mobile bottom nav | Same glassmorphism treatment. Remove top border. | 15 min |
| 2.4 | Page layouts | Change page backgrounds from `bg-background` to `bg-surface_container_low`. Adjust padding to use the space-as-separator principle. | 30 min |

### Phase 3: Component Overhauls (Estimated: 3-4 hrs)

| Step | File | Change | Effort |
|---|---|---|---|
| 3.1 | `src/components/ui/button.tsx` | Add gradient primary variant. Add pill shape (`rounded-full`) variant. Add ghost border variant. | 45 min |
| 3.2 | `src/components/ui/card.tsx` | Remove `shadow-card` (surface nesting replaces it). Ensure no borders. | 20 min |
| 3.3 | `src/components/ui/badge.tsx` | Add pill shape, color-coded variants (taken/skipped/pending), interactive hover states. | 30 min |
| 3.4 | `src/components/ui/input.tsx` | Replace `border border-input` with ghost border (15% opacity). Update focus ring to 2px primary + 4px glow. | 20 min |
| 3.5 | `src/components/ui/dialog.tsx` | Add glassmorphism to dialog content panel. Update shadow to ambient Level 3. | 20 min |
| 3.6 | `src/components/ui/select.tsx`, `textarea.tsx` | Same ghost border treatment as input. | 15 min |

### Phase 4: Page-Level Visual Refresh (Estimated: 3-4 hrs)

| Step | Page | Change | Effort |
|---|---|---|---|
| 4.1 | Dashboard | Apply new surface hierarchy. Use display typography for key metrics. Remove card borders. | 45 min |
| 4.2 | Medications | Add gradient to "Add Medication" button. Apply new badge/chip styling. Use editorial typography. | 30 min |
| 4.3 | Blood Sugar, Vitals | Same pattern. Replace all border-based separation with tonal shifts. | 30 min each |
| 4.4 | Water, Activity | Same pattern. | 20 min each |
| 4.5 | Settings, Reports | Same pattern. | 30 min each |
| 4.6 | Auth pages (login, PIN) | Apply gradient buttons. Update card/input styling to match system. | 30 min |

### Phase 5: QA & Polish (Estimated: 2 hrs)

| Step | Task | Effort |
|---|---|---|
| 5.1 | Audit all pages for "1px border" violations | 30 min |
| 5.2 | Verify dark mode equivalents for all new tokens | 20 min |
| 5.3 | Check contrast ratios (WCAG 2.1 AA) for all new color pairs | 20 min |
| 5.4 | Test glassmorphism on Safari (backdrop-filter compatibility) | 15 min |
| 5.5 | Verify ambient shadows render correctly cross-browser | 15 min |
| 5.6 | Run Lighthouse audit — verify no regressions | 20 min |

### Migration Order & Priority

```
P0 (Phase 1):    CSS tokens + globals — foundation for everything else
P1 (Phase 2):    Layout + navigation — establishes the visual frame
P1 (Phase 3):    Component overhauls — reusable UI elements
P2 (Phase 4):    Page-level refresh — apply tokens to individual pages
P3 (Phase 5):    QA + polish — catch edge cases, verify accessibility
```

### Files Untouched (No Visual Changes Needed)

These files contain pure logic and need no styling changes:
- All `hooks/` files
- All `stores/` files
- All `lib/` files (except `utils.ts` if `cn()` changes)
- All `types/` files
- `src/middleware.ts`
- All `providers/` files (unless layout changes needed)
- `supabase/` directory
- All config files (except `globals.css`)

### Total Estimated Effort: 12-15 hours
