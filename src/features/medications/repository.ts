import { createClient } from "@/lib/supabase/client";
import type { MedicationFormData } from "./schema";

const supabase = createClient();

export async function fetchMedications() {
  const { data, error } = await supabase
    .from("medications")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createMedication(values: MedicationFormData, userId: string) {
  const { data, error } = await supabase
    .from("medications")
    .insert({ ...values, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMedication(id: string, values: MedicationFormData) {
  const { error } = await supabase
    .from("medications")
    .update(values)
    .eq("id", id);

  if (error) throw error;
}

export async function toggleMedication(id: string, isActive: boolean) {
  const { error } = await supabase
    .from("medications")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) throw error;
}

export async function softDeleteMedication(id: string) {
  const { error } = await supabase
    .from("medications")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function fetchTodayIntake(todayDate: string) {
  const { data, error } = await supabase
    .from("medication_intake")
    .select("*, medications!inner(name, strength, type, time_of_day)")
    .eq("taken_date", todayDate)
    .is("deleted_at", null);

  if (error) throw error;
  return data ?? [];
}

export async function findExistingIntake(
  medicationId: string,
  takenDate: string,
  timeSlot: string
) {
  const { data } = await supabase
    .from("medication_intake")
    .select("id")
    .eq("medication_id", medicationId)
    .eq("taken_date", takenDate)
    .eq("time_slot", timeSlot)
    .is("deleted_at", null)
    .maybeSingle();

  return data;
}

export async function upsertIntake(payload: {
  user_id: string;
  medication_id: string;
  taken_date: string;
  taken_time: string;
  time_slot: string;
  status: "taken" | "skipped";
  notes: string | null;
}) {
  const existing = await findExistingIntake(payload.medication_id, payload.taken_date, payload.time_slot);

  if (existing) {
    const { error } = await supabase
      .from("medication_intake")
      .update({
        status: payload.status,
        taken_time: payload.taken_time,
        notes: payload.notes,
      })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("medication_intake")
      .insert(payload);
    if (error) throw error;
  }
}
