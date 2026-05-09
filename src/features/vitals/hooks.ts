import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { BloodPressureFormData, Hba1cFormData, WeightFormData } from "./schema";

const supabase = createClient();

export function useBloodPressureReadings() {
  return useQuery({
    queryKey: ["blood-pressure"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blood_pressure")
        .select("*")
        .is("deleted_at", null)
        .order("reading_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateBloodPressure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: BloodPressureFormData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("blood_pressure").insert({ ...values, user_id: user.user.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blood-pressure"] }),
  });
}

export function useHba1cReadings() {
  return useQuery({
    queryKey: ["hba1c"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hba1c").select("*").is("deleted_at", null).order("reading_date", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateHba1c() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Hba1cFormData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("hba1c").insert({ ...values, user_id: user.user.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hba1c"] }),
  });
}

export function useWeightReadings() {
  return useQuery({
    queryKey: ["weight"],
    queryFn: async () => {
      const { data, error } = await supabase.from("weight_log").select("*").is("deleted_at", null).order("reading_date", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: WeightFormData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("weight_log").insert({ ...values, user_id: user.user.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weight"] }),
  });
}

export function useDeleteVitals(table: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blood-pressure"] });
      qc.invalidateQueries({ queryKey: ["hba1c"] });
      qc.invalidateQueries({ queryKey: ["weight"] });
    },
  });
}
