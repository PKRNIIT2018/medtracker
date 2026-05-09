import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { MedicationFormData } from "./schema";

const supabase = createClient();

function cleanOptionalFields(values: MedicationFormData) {
  return {
    ...values,
    active_substance: values.active_substance || null,
    product_links: values.product_links || null,
    ai_summary: values.ai_summary || null,
  };
}

export function useMedications() {
  return useQuery({
    queryKey: ["medications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medications")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateMedication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: MedicationFormData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("medications")
        .insert({ ...cleanOptionalFields(values), user_id: user.user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medications"] });
    },
  });
}

export function useUpdateMedication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...values }: MedicationFormData & { id: string }) => {
      const { error } = await supabase
        .from("medications")
        .update(cleanOptionalFields(values))
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medications"] });
    },
  });
}

export function useToggleMedication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      is_active,
    }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("medications")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medications"] });
    },
  });
}

export function useDeleteMedication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("medications")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medications"] });
    },
  });
}
