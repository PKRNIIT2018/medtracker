import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { PatientWithInfo, SharedPatient } from "@/types/database";

const supabase = createClient();

export function useDoctorPatients() {
  return useQuery({
    queryKey: ["doctor-patients"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data: shares, error } = await supabase
        .from("shared_patients")
        .select("*")
        .eq("doctor_id", user.user.id);

      if (error) throw error;
      if (!shares || shares.length === 0) return [];

      const patientIds = shares.map((s) => s.patient_id);

      const { data: profiles } = await supabase
        .from("user_settings")
        .select("user_id, full_name")
        .in("user_id", patientIds);

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.user_id, p.full_name])
      );

      return (shares as SharedPatient[]).map((s) => ({
        patient_id: s.patient_id,
        full_name: profileMap.get(s.patient_id) ?? null,
        email: null,
        access_tables: s.access_tables,
      })) satisfies PatientWithInfo[];
    },
  });
}

export function usePatientBloodSugar(patientId: string | undefined, dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ["doctor-patient-blood-sugar", patientId, dateFrom, dateTo],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blood_sugar")
        .select("*")
        .eq("user_id", patientId!)
        .is("deleted_at", null)
        .gte("reading_date", dateFrom)
        .lte("reading_date", dateTo)
        .order("reading_date", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}
