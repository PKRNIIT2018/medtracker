"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      supabase.auth.getSession().then(({ data }) => {
        if (data?.session) {
          window.history.replaceState({}, "", "/");
          router.push("/dashboard");
        } else {
          supabase.auth.exchangeCodeForSession(code).then((result) => {
            if (!result.error) {
              window.history.replaceState({}, "", "/");
              router.push("/dashboard");
            } else {
              router.push("/login?error=" + encodeURIComponent(result.error.message));
            }
          });
        }
      });
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    });
  }, [router]);

  return null;
}
