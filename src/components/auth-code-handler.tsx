"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AuthCodeHandler() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      const supabase = createClient();
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          router.push(`/login?error=${encodeURIComponent(error.message)}`);
        } else {
          const clean = window.location.pathname;
          router.replace(clean);
          router.refresh();
        }
      });
    }
  }, [router]);

  return null;
}
