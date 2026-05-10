import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export function useMedicalHistory() {
  return useQuery({
    queryKey: ["medical-history"],
    queryFn: async () => {
      const { data, error } = await supabase.from("medical_history").select("*").is("deleted_at", null).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateMedicalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { category: string; title: string; description?: string; event_date?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("medical_history").insert({ ...values, user_id: user.user.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["medical-history"] }),
  });
}

export function useDeleteMedicalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("medical_history").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["medical-history"] }),
  });
}