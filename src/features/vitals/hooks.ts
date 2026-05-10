import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { BloodPressureFormData, Hba1cFormData, WeightFormData, BloodPanelFormData } from "./schema";

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
      const { data, error } = await supabase.from("blood_pressure").insert({
        ...values,
        user_id: user.user.id,
        reading_time: values.reading_time || null,
        notes: values.notes || null,
      }).select().single();
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
      const { data, error } = await supabase.from("hba1c").insert({ ...values, user_id: user.user.id, notes: values.notes || null }).select().single();
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
      const { data, error } = await supabase.from("weight_log").insert({
        ...values,
        user_id: user.user.id,
        notes: values.notes || null,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weight"] }),
  });
}

export function useBloodPanelReadings() {
  return useQuery({
    queryKey: ["blood-panel"],
    queryFn: async () => {
      const { data, error } = await supabase.from("blood_panel").select("*").is("deleted_at", null).order("reading_date", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });
}

function cleanPanelFields(values: BloodPanelFormData) {
  return {
    ...values,
    s_chol: values.s_chol ?? null,
    s_tag: values.s_tag ?? null,
    s_hdl: values.s_hdl ?? null,
    non_hdl: values.non_hdl ?? null,
    s_ck: values.s_ck ?? null,
    b_hba1c_dc: values.b_hba1c_dc ?? null,
    b_hba1c_if: values.b_hba1c_if ?? null,
  };
}

export function useCreateBloodPanel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: BloodPanelFormData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("blood_panel").insert({
        ...cleanPanelFields(values),
        user_id: user.user.id,
        notes: values.notes || null,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blood-panel"] }),
  });
}

export function useUpdateBloodPressure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: BloodPressureFormData & { id: string }) => {
      const { error } = await supabase.from("blood_pressure").update({
        ...values,
        reading_time: values.reading_time || null,
        notes: values.notes || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blood-pressure"] }),
  });
}

export function useUpdateHba1c() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Hba1cFormData & { id: string }) => {
      const { error } = await supabase.from("hba1c").update({
        ...values,
        notes: values.notes || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hba1c"] }),
  });
}

export function useUpdateWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: WeightFormData & { id: string }) => {
      const { error } = await supabase.from("weight_log").update({
        ...values,
        notes: values.notes || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weight"] }),
  });
}

export function useUpdateBloodPanel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: BloodPanelFormData & { id: string }) => {
      const { error } = await supabase.from("blood_panel").update({
        ...cleanPanelFields(values),
        notes: values.notes || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blood-panel"] }),
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
      qc.invalidateQueries({ queryKey: ["blood-panel"] });
    },
  });
}
