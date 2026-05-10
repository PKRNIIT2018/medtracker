"use client";

import { useMedications } from "@/features/medications/hooks";
import { useBloodSugarReadings } from "@/features/blood-sugar/hooks";
import { useWaterEntries } from "@/features/water/hooks";
import { useBloodPressureReadings } from "@/features/vitals/hooks";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Plus, Activity, Droplets, Heart, Pill } from "lucide-react";

const supabase = createClient();

function statCard(icon: React.ReactNode, title: string, value: React.ReactNode, action?: { label: string; href: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-bold">{value}</div>
        {action && (
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => window.location.href = action.href}>
            <Plus className="mr-1 h-3 w-3" />{action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function statSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="h-7 w-16 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: medications, isLoading: medsLoading } = useMedications();
  const { data: sugarReadings, isLoading: sugarLoading } = useBloodSugarReadings();
  const { data: waterEntries, isLoading: waterLoading } = useWaterEntries();
  const { data: bpReadings, isLoading: bpLoading } = useBloodPressureReadings();
  const { data: settings } = useQuery({
    queryKey: ["user-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("user_settings").select("daily_water_goal_ml").single();
      return data;
    },
  });

  const today = format(new Date(), "yyyy-MM-dd");
  const activeToday = medications?.filter((m) => m.is_active && m.time_of_day?.length).length ?? 0;

  const latestSugar = sugarReadings?.[0];
  const previousSugar = sugarReadings?.[1];
  let trend = "";
  if (latestSugar && previousSugar) {
    const diff = latestSugar.level_mgdl - previousSugar.level_mgdl;
    trend = diff > 5 ? "↑" : diff < -5 ? "↓" : "→";
  }

  const todayWater = waterEntries
    ?.filter((e) => e.entry_date === today)
    .reduce((s, e) => s + Number(e.amount_ml), 0) ?? 0;
  const waterGoal = settings?.daily_water_goal_ml ?? 2000;
  const waterPct = Math.min((todayWater / waterGoal) * 100, 100);

  const latestBP = bpReadings?.[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {medsLoading ? statSkeleton() : statCard(
          <Pill className="h-4 w-4" />, "Medications Today",
          <span>{activeToday} active</span>,
          { label: "Add Medication", href: "/medications" }
        )}
        {sugarLoading ? statSkeleton() : statCard(
          <Activity className="h-4 w-4" />, "Blood Sugar",
          latestSugar ? <span>{latestSugar.level_mgdl} {trend} <span className="text-sm font-normal text-muted-foreground">mg/dL</span></span> : <span className="text-muted-foreground">--</span>,
          { label: "Log Sugar", href: "/blood-sugar" }
        )}
        {waterLoading ? statSkeleton() : statCard(
          <Droplets className="h-4 w-4" />, "Water Intake",
          <div className="space-y-1">
            <span>{todayWater} / {waterGoal} ml</span>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${waterPct}%` }} />
            </div>
          </div>,
          { label: "Add Water", href: "/water" }
        )}
        {bpLoading ? statSkeleton() : statCard(
          <Heart className="h-4 w-4" />, "Blood Pressure",
          latestBP ? <span>{latestBP.systolic}/{latestBP.diastolic} <span className="text-sm font-normal text-muted-foreground">mmHg</span></span> : <span className="text-muted-foreground">--/--</span>,
          { label: "Log BP", href: "/vitals" }
        )}
      </div>
    </div>
  );
}