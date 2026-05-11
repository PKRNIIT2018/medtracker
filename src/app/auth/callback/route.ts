import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { log, logError } from "@/lib/logger";

const SAFE_REDIRECTS = new Set([
  "/dashboard",
  "/settings",
  "/medications",
  "/blood-sugar",
  "/vitals",
  "/water",
  "/activity",
  "/medical-history",
  "/quarterly-results",
  "/reports",
  "/appointments",
]);

function sanitizeRedirect(path: string | null): string {
  if (!path) return "/dashboard";
  if (!path.startsWith("/")) return "/dashboard";
  if (path.includes("//") || path.includes(":")) return "/dashboard";
  if (!SAFE_REDIRECTS.has(path)) return "/dashboard";
  return path;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeRedirect(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      log("auth_callback_success", { redirectTo: next, origin });
      return NextResponse.redirect(`${origin}${next}`);
    }

    logError("auth_callback_error", error, { origin });
  }

  log("auth_callback_failed", { origin, hasCode: !!code });
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`);
}
