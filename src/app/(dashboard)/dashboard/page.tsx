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
import { Plus, Activity, Droplets, Heart, Pill } from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { getBpBorderColor, getSugarLevel } from "@/lib/vitals-colors";

const supabase = createClient();

function getLast7Days(): { date: string; label: string }[] {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ date: format(d, "yyyy-MM-dd"), label: format(d, "EEE") });
  }
  return days;
}

function Sparkline({ data, color }: { data: { value: number | null }[]; color: string }) {
  const hasData = data.some((d) => d.value !== null);
  if (!hasData) return null;
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#sg-${color.replace("#", "")})`} dot={false} activeDot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatCard({ icon, title, children, borderClass, sparkline }: { icon: React.ReactNode; title: string; children: React.ReactNode; borderClass?: string; sparkline?: React.ReactNode }) {
  return (
    <Card className={cn("border-t-4 animate-fade-in", borderClass)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {children}
        {sparkline}
      </CardContent>
    </Card>
  );
}

function StatSkeleton() {
  return (
    <Card className="animate-fade-in">
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
  const sugarStatus = latestSugar ? getSugarLevel(latestSugar.level_mgdl) : "normal";
  const sugarTrend = latestSugar && previousSugar ? (latestSugar.level_mgdl - previousSugar.level_mgdl > 5 ? " up" : latestSugar.level_mgdl - previousSugar.level_mgdl < -5 ? " down" : " stable") : "";

  const sugarSparkline = getLast7Days().map(({ date, label }) => {
    const day = (sugarReadings ?? []).filter((r) => r.reading_date === date);
    const avg = day.length ? Math.round(day.reduce((s, r) => s + r.level_mgdl, 0) / day.length) : null;
    return { label, value: avg };
  });
  const sugarColor = sugarStatus === "normal" ? "#22c55e" : "#ef4444";

  const todayWater = waterEntries?.filter((e) => e.entry_date === today).reduce((s, e) => s + Number(e.amount_ml), 0) ?? 0;
  const waterGoal = settings?.daily_water_goal_ml ?? 2000;
  const waterPct = Math.min((todayWater / waterGoal) * 100, 100);

  const waterSparkline = getLast7Days().map(({ date, label }) => {
    const total = (waterEntries ?? []).filter((e) => e.entry_date === date).reduce((s, e) => s + Number(e.amount_ml), 0);
    return { label, value: total || null };
  });

  const latestBP = bpReadings?.[0];

  const bpSparkline = getLast7Days().map(({ date, label }) => {
    const day = (bpReadings ?? []).filter((r) => r.reading_date === date);
    return { label, value: day[0]?.systolic ?? null };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header-bg rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back</p>
          </div>
        </div>
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
          sparkline={<Sparkline data={sugarSparkline} color={sugarColor} />}
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
          sparkline={<Sparkline data={waterSparkline} color="#0ea5e9" />}
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
          borderClass={latestBP ? getBpBorderColor(latestBP.systolic, latestBP.diastolic, "t") : undefined}
          sparkline={<Sparkline data={bpSparkline} color="#ef4444" />}
        >
          {latestBP ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{latestBP.systolic}</span>
                <span className="text-lg font-normal text-muted-foreground">/{latestBP.diastolic}</span>
                <span className="text-sm font-normal text-muted-foreground">mmHg</span>
              </div>
              {latestBP.heart_rate && <p className="text-xs text-muted-foreground">HR: {latestBP.heart_rate} bpm</p>}
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
