import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { MedicationFormData } from "./schema";
import * as repo from "./repository";
import { cleanMedicationFields, todayDate, nowTime } from "./service";

export function useMedications() {
  return useQuery({
    queryKey: ["medications"],
    queryFn: repo.fetchMedications,
  });
}

export function useCreateMedication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: MedicationFormData) => {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");
      return repo.createMedication(cleanMedicationFields(values), user.user.id);
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
      await repo.updateMedication(id, cleanMedicationFields(values));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medications"] });
    },
  });
}

export function useToggleMedication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await repo.toggleMedication(id, is_active);
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
      await repo.softDeleteMedication(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medications"] });
    },
  });
}

export function useTodayIntake() {
  return useQuery({
    queryKey: ["medication-intake", todayDate()],
    queryFn: () => repo.fetchTodayIntake(todayDate()),
  });
}

export function useLogIntake() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      medication_id,
      time_slot,
      status,
      notes,
    }: {
      medication_id: string;
      time_slot: string;
      status: "taken" | "skipped";
      notes?: string;
    }) => {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      await repo.upsertIntake({
        user_id: user.user.id,
        medication_id,
        taken_date: todayDate(),
        taken_time: nowTime(),
        time_slot,
        status,
        notes: notes ?? null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medication-intake"] });
    },
  });
}
