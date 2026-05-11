"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Pill,
  Droplets,
  Activity,
  Heart,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  FlaskConical,
  Lock,
  Calendar,
  ClipboardCheck,
} from "lucide-react";
import { useState, useEffect } from "react";
import { PinGate, isPinVerified, clearPinSession, refreshPinSession } from "@/components/pin-gate";
import { ErrorBoundary } from "@/components/error-boundary";

const navGroups = [
  {
    label: "Today",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Track",
    items: [
      { href: "/blood-sugar", label: "Blood Sugar", icon: Activity },
      { href: "/vitals", label: "Vitals", icon: Heart },
      { href: "/water", label: "Water", icon: Droplets },
      { href: "/activity", label: "Activity", icon: ClipboardList },
    ],
  },
  {
    label: "Care",
    items: [
      { href: "/medications", label: "Medications", icon: Pill },
      { href: "/medication-log", label: "Today's Log", icon: ClipboardCheck },
      { href: "/appointments", label: "Appointments", icon: Calendar },
      { href: "/medical-history", label: "Medical History", icon: ClipboardList },
    ],
  },
  {
    label: "Review",
    items: [
      { href: "/quarterly-results", label: "Quarterly Results", icon: FlaskConical },
      { href: "/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [showPinGate, setShowPinGate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    async function checkPinStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email ?? null);
        setUserName(user.user_metadata?.full_name ?? null);
        const { data: settings } = await supabase
          .from("user_settings")
          .select("app_pin_enabled")
          .eq("user_id", user.id)
          .single();

        const enabled = settings?.app_pin_enabled ?? false;
        setPinEnabled(enabled);

        if (enabled && !isPinVerified()) {
          setShowPinGate(true);
        }
      }
      setIsLoading(false);
    }
    checkPinStatus();
  }, [supabase]);

  useEffect(() => {
    if (!pinEnabled) return;

    const handleActivity = () => {
      if (isPinVerified()) {
        refreshPinSession();
      }
    };

    window.addEventListener("click", handleActivity);
    window.addEventListener("keydown", handleActivity);

    const interval = setInterval(() => {
      if (pinEnabled && !isPinVerified()) {
        setShowPinGate(true);
      }
    }, 60000);

    return () => {
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      clearInterval(interval);
    };
  }, [pinEnabled]);

  function handleUnlock() {
    setShowPinGate(false);
  }

  function handleLock() {
    clearPinSession();
    setShowPinGate(true);
  }

  async function handleLogout() {
    clearPinSession();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse" aria-live="polite">Loading...</div>
      </div>
    );
  }

  if (showPinGate && pinEnabled) {
    return <PinGate onUnlock={handleUnlock} />;
  }

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-background transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-4">
          <Link href="/dashboard" className="text-lg font-semibold">
            MedTracker
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Close sidebar"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        {(userName || userEmail) && (
          <div className="border-b px-4 py-3">
            <p className="text-sm font-medium truncate">{userName ?? userEmail}</p>
            {userName && userEmail && (
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            )}
          </div>
        )}
        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      pathname === item.href
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t p-3 space-y-1">
          {pinEnabled && (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground"
              onClick={handleLock}
            >
              <Lock className="h-4 w-4" />
              Lock App
            </Button>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center gap-4 border-b px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open sidebar"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
        </header>
        <main className="flex-1 p-4 lg:p-6"><ErrorBoundary>{children}</ErrorBoundary></main>
      </div>
    </div>
  );
}
