import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export function useWaterEntries() {
  return useQuery({
    queryKey: ["water"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("water_intake")
        .select("*")
        .is("deleted_at", null)
        .order("entry_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}

export function useAddWater() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (amount_ml: number) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("water_intake")
        .insert({ amount_ml, entry_date: new Date().toISOString().slice(0, 10), user_id: user.user.id })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["water"] }),
  });
}
