import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { MedicationFormData } from "./schema";

const supabase = createClient();

function cleanOptionalFields(values: MedicationFormData) {
  return {
    ...values,
    active_substance: values.active_substance || null,
    stock_count: values.stock_count ?? null,
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

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function useTodayIntake() {
  return useQuery({
    queryKey: ["medication-intake", todayDate()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medication_intake")
        .select("*, medications!inner(name, strength, type, time_of_day)")
        .eq("taken_date", todayDate())
        .is("deleted_at", null);

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useLogIntake() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      medication_id,
      status,
      notes,
    }: {
      medication_id: string;
      status: "taken" | "skipped";
      notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const td = todayDate();
      const now = new Date().toISOString().slice(11, 16);

      const payload = {
        user_id: user.user.id,
        medication_id,
        taken_date: td,
        taken_time: now,
        status,
        notes: notes ?? null,
      };

      const { data: existing } = await supabase
        .from("medication_intake")
        .select("id")
        .eq("medication_id", medication_id)
        .eq("taken_date", td)
        .eq("notes", notes ?? "__NULL__")
        .is("deleted_at", null)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("medication_intake")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("medication_intake")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medication-intake"] });
    },
  });
}
