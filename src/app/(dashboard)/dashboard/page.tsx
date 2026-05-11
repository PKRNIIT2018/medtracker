"use client";

import { useMedications } from "@/features/medications/hooks";
import { useBloodSugarReadings } from "@/features/blood-sugar/hooks";
import { useWaterEntries } from "@/features/water/hooks";
import { useBloodPressureReadings } from "@/features/vitals/hooks";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import { Plus, Activity, Droplets, Heart, Pill, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const supabase = createClient();

function bpStatusColor(systolic: number, diastolic: number): string {
  if (systolic >= 180 || diastolic >= 120) return "border-t-red-500";
  if (systolic >= 140 || diastolic >= 90) return "border-t-red-400";
  if (systolic >= 130 || diastolic >= 80) return "border-t-amber-400";
  return "border-t-green-500";
}

function getSugarStatus(level: number): "normal" | "low" | "high" {
  if (level < 70) return "low";
  if (level > 140) return "high";
  return "normal";
}

function StatCard({ icon, title, children, borderClass }: { icon: React.ReactNode; title: string; children: React.ReactNode; borderClass?: string }) {
  return (
    <Card className={cn("border-t-4", borderClass)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {children}
      </CardContent>
    </Card>
  );
}

function StatSkeleton() {
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
  const sugarStatus = latestSugar ? getSugarStatus(latestSugar.level_mgdl) : "normal";
  const sugarTrend = latestSugar && previousSugar ? (latestSugar.level_mgdl - previousSugar.level_mgdl > 5 ? " up" : latestSugar.level_mgdl - previousSugar.level_mgdl < -5 ? " down" : " stable") : "";

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
        <StatCard icon={<Pill className="h-4 w-4" />} title="Medications Today">
          <div className="text-2xl font-bold">{activeToday}</div>
          <p className="text-xs text-muted-foreground">active medications</p>
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => window.location.href = "/medications"}>
            <Plus className="mr-1 h-3 w-3" />Manage
          </Button>
        </StatCard>

        <StatCard
          icon={<Activity className="h-4 w-4" />}
          title="Blood Sugar"
          borderClass={latestSugar ? (sugarStatus === "normal" ? "border-t-green-500" : "border-t-red-500") : undefined}
        >
          {latestSugar ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{latestSugar.level_mgdl}</span>
                <span className="text-sm font-normal text-muted-foreground">mg/dL</span>
                {sugarTrend && <span className={cn("text-sm font-medium", sugarTrend === " up" ? "text-red-500" : sugarTrend === " down" ? "text-green-500" : "text-muted-foreground")}>{sugarTrend}</span>}
              </div>
              <p className="text-xs text-muted-foreground">
                {latestSugar.meal_slot ? latestSugar.meal_slot.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) : "Latest reading"}
                {latestSugar.reading_date && (isToday(parseISO(latestSugar.reading_date)) ? " today" : isYesterday(parseISO(latestSugar.reading_date)) ? " yesterday" : ` - ${format(parseISO(latestSugar.reading_date), "MMM d")}`)}
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-muted-foreground">--</div>
              <p className="text-xs text-muted-foreground">No readings yet</p>
            </>
          )}
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => window.location.href = "/blood-sugar"}>
            <Plus className="mr-1 h-3 w-3" />Log Sugar
          </Button>
        </StatCard>

        <StatCard
          icon={<Droplets className="h-4 w-4" />}
          title="Water Intake"
          borderClass={waterPct >= 80 ? "border-t-green-500" : waterPct >= 50 ? "border-t-blue-400" : "border-t-blue-300"}
        >
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{todayWater}</span>
              <span className="text-sm font-normal text-muted-foreground">/ {waterGoal} ml</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div className={cn("h-full rounded-full transition-all", waterPct >= 80 ? "bg-green-500" : "bg-blue-500")} style={{ width: `${waterPct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{Math.round(waterPct)}% of daily goal</p>
          </div>
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => window.location.href = "/water"}>
            <Plus className="mr-1 h-3 w-3" />Add Water
          </Button>
        </StatCard>

        <StatCard
          icon={<Heart className="h-4 w-4" />}
          title="Blood Pressure"
          borderClass={latestBP ? bpStatusColor(latestBP.systolic, latestBP.diastolic) : undefined}
        >
          {latestBP ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{latestBP.systolic}</span>
                <span className="text-lg font-normal text-muted-foreground">/{latestBP.diastolic}</span>
                <span className="text-sm font-normal text-muted-foreground">mmHg</span>
              </div>
              {latestBP.heart_rate && (
                <p className="text-xs text-muted-foreground">HR: {latestBP.heart_rate} bpm</p>
              )}
              <p className="text-xs text-muted-foreground">
                {isToday(parseISO(latestBP.reading_date)) ? "Today" : isYesterday(parseISO(latestBP.reading_date)) ? "Yesterday" : format(parseISO(latestBP.reading_date), "MMM d")}
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-muted-foreground">--/--</div>
              <p className="text-xs text-muted-foreground">No readings yet</p>
            </>
          )}
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => window.location.href = "/vitals"}>
            <Plus className="mr-1 h-3 w-3" />Log BP
          </Button>
        </StatCard>
      </div>
    </div>
  );
}