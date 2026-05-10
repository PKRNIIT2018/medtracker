import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export function useQuarterlyResults() {
  return useQuery({
    queryKey: ["quarterly-results"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quarterly_results")
        .select("*, quarterly_result_metrics(*)")
        .is("deleted_at", null)
        .order("result_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateQuarterlyResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { result_date: string; quarter_label: string; notes?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("quarterly_results").insert({ ...values, user_id: user.user.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quarterly-results"] }),
  });
}

export function useDeleteQuarterlyResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("quarterly_results").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quarterly-results"] }),
  });
}