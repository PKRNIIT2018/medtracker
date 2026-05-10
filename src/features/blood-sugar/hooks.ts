import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { BloodSugarFormData } from "./schema";

const supabase = createClient();

export function useBloodSugarReadings() {
  return useQuery({
    queryKey: ["blood-sugar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blood_sugar")
        .select("*")
        .is("deleted_at", null)
        .order("reading_date", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateBloodSugar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: BloodSugarFormData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("blood_sugar")
        .insert({ ...values, user_id: user.user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blood-sugar"] });
    },
  });
}

export function useUpdateBloodSugar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...values }: BloodSugarFormData & { id: string }) => {
      const { error } = await supabase
        .from("blood_sugar")
        .update(values)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blood-sugar"] });
    },
  });
}

export function useDeleteBloodSugar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("blood_sugar")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blood-sugar"] });
    },
  });
}
