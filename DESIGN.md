# MedTracker — Application Design (Web + Mobile + Desktop)

## Overview

This document defines the cross-platform architecture for MedTracker. The application targets **web browsers**, **mobile devices** (Android & iOS via both responsive web and native wrappers), and **desktop** (macOS/Windows via a web wrapper).

The strategy is **progressive layering**:
1. **Responsive Next.js web app** — works on all screens immediately
2. **PWA (Progressive Web App)** — installable on mobile/desktop with offline support
3. **Capacitor wrapper** — native Android & iOS apps from the same web codebase (push notifications, native APIs)
4. **Electron/Tauri wrapper** — desktop apps for macOS/Windows/ Linux

All layers share the same Next.js codebase and Supabase backend.

---

## Architecture Diagram

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

## Cross-Platform Strategy

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
- Mobile: single-column stack, bottom navigation bar (fixed), FABs for quick actions
- Tablet: 2-column grid on dashboard, side nav collapsible
- Desktop: full side navigation, multi-column layouts, keyboard shortcuts

### Layer 2: PWA (Installable on Mobile & Desktop)

The Next.js app is enhanced with PWA capabilities for installable mobile/desktop experience without app store.

| Feature | Implementation |
|---|---|
| Service Worker | `next-pwa` or `@serwist/next` — precaches static assets and API routes |
| Manifest | `public/manifest.json` — app name, icons (192px + 512px), theme color, display: `standalone` |
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

## Navigation & Routing

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

---

## Component Architecture

### Design System (shadcn/ui + Tailwind)

All UI components follow a consistent atomic design hierarchy:

```
atoms/         Button, Input, Label, Card, Badge, Avatar, Progress
molecules/    DatePicker, TimePicker, FormField, Modal, ConfirmDialog
organisms/    MedicationCard, VitalsCard, WaterProgress, SugarChart, ExportPanel
templates/    DashboardLayout, FormLayout, ListLayout
pages/        (Next.js App Router pages)
```

### Key Shared Components

| Component | Props | Responsive Behavior |
|---|---|---|
| `DashboardCard` | `title, value, trend, icon, onClick` | Full width on mobile, 2-col on tablet, 3-col on desktop |
| `MedicationCard` | `medication, doses[], onToggle, onDelete` | Full width, time-of-day color coding |
| `SugarEntryForm` | `mealSlot, level, notes, onSubmit` | Single column, large touch targets |
| `WaterProgress` | `current, goal` | Circular SVG on mobile, horizontal bar on desktop |
| `VitalsSnapshot` | `bp, sugar, hba1c, weight` | 2x2 grid on mobile, row on desktop |
| `ExportPanel` | `filters, onExport` | Bottom sheet on mobile, side panel on desktop |
| `FAB` | `actions[]` | Fixed bottom-right on mobile only |

---

## State Management

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

## Offline & Caching Strategy

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
- User sees a subtle "offline" banner

---

## Notification Architecture

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

## Export Architecture

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

## Supabase Integration

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

## Authentication Architecture

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
│  │     Sign In          ││
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
import { createBrowserClient } from '@supabase/ssr'  // NOT the SSR server client
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

## Mobile-First Design Principles

### Touch Targets

- All interactive elements minimum **44x44px** (Apple HIG) / **48x48px** (Material Design)
- FAB is **56x56px** with adequate margin from bottom bar
- Form inputs have large padding (`py-3` minimum on mobile)

### Typography Scale

| Element | Mobile | Desktop |
|---|---|---|
| H1 (page title) | `text-2xl` (24px) | `text-3xl` (30px) |
| H2 (section) | `text-xl` (20px) | `text-2xl` (24px) |
| Body | `text-base` (16px) | `text-base` (16px) |
| Small / meta | `text-sm` (14px) | `text-sm` (14px) |
| Data values | `text-3xl` (30px) | `text-4xl` (36px) |

### Spacing

- Mobile: `p-4` (16px) page padding, `gap-3` (12px) between cards
- Desktop: `p-8` (32px) page padding, `gap-4` (16px) between cards

### Gesture Support

| Gesture | Action | Platform |
|---|---|---|
| Pull-to-refresh | Re-fetch current page data | Mobile (PWA + Capacitor) |
| Swipe to delete | Delete medication intake / log entry | Mobile |
| Long press | Enter edit mode on list items | Mobile |
| Tap | Navigate / toggle | All |

---

## Performance Targets

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

## Error Handling

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

`bcryptjs` runs in the browser for PIN hashing. With 10 salt rounds, hashing takes ~300ms and verification ~100ms. This is acceptable for a 4-digit PIN unlock. If performance is a concern, switch to a faster hash like SHA-256 (less secure but still adequate for a local convenience lock):

---

## Color Palette & Theming

### Light Theme (Default)

```
Background:  white / gray-50
Surface:     white
Primary:     blue-600 (#2563EB)
Secondary:   teal-500 (#14B8A6)
Sugar:       orange-500 (#F97316)
BP:          red-500 (#EF4444)
Water:       sky-500 (#0EA5E9)
Medication:  violet-500 (#8B5CF6)
Success:     green-500 (#22C55E)
Warning:     yellow-500 (#EAB308)
Danger:      red-500 (#EF4444)
```

### Dark Theme

```
Background:  gray-950 / gray-900
Surface:     gray-800
Primary:     blue-400 (#60A5FA)
Secondary:   teal-400 (#2DD4BF)
...same role mappings, adjusted luminance
```

### Theme Toggle

- Default: `system` (respects `prefers-color-scheme`)
- User can override to `light` or `dark` in Settings
- Implemented via Tailwind `darkMode: 'class'` + `next-themes`

---

## Accessibility

- All forms use proper `<label>` elements and `aria-*` attributes
- Color is never the sole indicator of meaning (supplement with icons + text)
- Charts have `aria-label` descriptions and support `prefers-reduced-motion`
- Navigation uses `aria-current="page"` for active tab
- Focus indicators visible on all interactive elements
- Touch targets meet WCAG 2.1 minimum (44x44px)

---

## Deployment Pipeline

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

## File Structure (Full)

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
│   │   ├── supabase-browser.ts        # Supabase browser client (for client components)
│   │   ├── utils.ts                   # formatDate, cn(), etc.
│   │   ├── constants.ts               # meal slots, units, goals
│   │   ├── notifications.ts           # Notification scheduling helpers
│   │   └── pin-storage.ts             # PIN hash read/write to IndexedDB
│   ├── db/
│   │   ├── schema.ts                  # Drizzle / Prisma schema
│   │   └── index.ts                   # DB client
│   ├── middleware.ts                  # Route protection (session check + redirect)
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
├── drizzle.config.ts / prisma.schema
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Key Dependencies

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
    "drizzle-kit": "^0.30",
    "drizzle-orm": "^0.38",
    "postgres": "^3.4",
    "pdfkit": "^0.16",
    "@capacitor/cli": "^7",
    "@capacitor/android": "^7",
    "@capacitor/ios": "^7"
  }
}
```

> **Note**: The `postgres` package is the driver for Drizzle ORM. If deploying on Vercel Edge Functions, use `@neondatabase/serverless` instead. If using Prisma instead of Drizzle, replace `drizzle-kit`, `drizzle-orm`, and `postgres` with `prisma` and `@prisma/client`.
>
> **Note**: `recharts` is listed for charts. If you prefer Chart.js, replace with `chart.js` and `react-chartjs-2`.
>
> **Note**: `pdfkit` is used in Vercel Serverless Functions for PDF generation. It requires a standalone build configuration (`vercel.json` or function config).

---

## Referenced Documents

| Document | Description |
|---|---|
| [`REQUIREMENTS.md`](./REQUIREMENTS.md) | Full user requirements & implementation tasks |
| [`DB_DESIGN.md`](./DB_DESIGN.md) | PostgreSQL schema, indexes, RLS policies |
| [`DESIGN.md`](./DESIGN.md) | Application design — this document |
