import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/database";

export function useUserRole() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const userRole = (data.user?.app_metadata?.user_role as UserRole) ?? null;
      setRole(userRole);
      setLoading(false);
    });
  }, []);

  return { role, loading, isDoctor: role === "doctor", isAdmin: role === "admin" };
}
