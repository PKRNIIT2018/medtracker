import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { BloodSugar } from "@/types/database";
import { computeAgpMetrics, computeAgpModalDay, computeAgpMealData, type AgpMetrics, type AgpChartData, type AgpMealData, type AgpReading } from "./agp-utils";

const supabase = createClient();

function readingsToAgp(readings: BloodSugar[]): AgpReading[] {
  return readings.map((r) => ({
    level: r.level,
    time: r.reading_time ?? "",
    date: r.reading_date,
    mealSlot: r.meal_slot,
  }));
}

export function useAgpReadingsByDateRange(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ["agp-readings", dateFrom, dateTo],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("blood_sugar")
        .select("*")
        .eq("user_id", user.user.id)
        .is("deleted_at", null)
        .gte("reading_date", dateFrom)
        .lte("reading_date", dateTo)
        .order("reading_date", { ascending: true });

      if (error) throw error;
      return (data ?? []) as BloodSugar[];
    },
  });
}

export function useAgpDataByDateRange(dateFrom: string, dateTo: string): {
  metrics: AgpMetrics | null;
  chart: AgpChartData | null;
  mealData: AgpMealData | null;
  isLoading: boolean;
  error: Error | null;
  hasData: boolean;
} {
  const { data: readings, isLoading, error } = useAgpReadingsByDateRange(dateFrom, dateTo);

  if (!readings || readings.length === 0) {
    return { metrics: null, chart: null, mealData: null, isLoading, error: error ?? null, hasData: false };
  }

  const agpReadings = readingsToAgp(readings);
  const metrics = computeAgpMetrics(agpReadings);
  const chart = computeAgpModalDay(agpReadings);
  const mealData = computeAgpMealData(agpReadings);

  return { metrics, chart, mealData, isLoading, error: error ?? null, hasData: true };
}

const THIRTY_DAYS_AGO = new Date();
THIRTY_DAYS_AGO.setDate(THIRTY_DAYS_AGO.getDate() - 30);
const defaultFrom = THIRTY_DAYS_AGO.toISOString().split("T")[0];
const today = new Date().toISOString().split("T")[0];

export function useAgpData(): {
  metrics: AgpMetrics | null;
  chart: AgpChartData | null;
  mealData: AgpMealData | null;
  isLoading: boolean;
  error: Error | null;
  hasData: boolean;
} {
  return useAgpDataByDateRange(defaultFrom, today);
}
