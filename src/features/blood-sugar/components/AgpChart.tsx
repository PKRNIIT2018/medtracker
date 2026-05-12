"use client";

import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import type { AgpMealData, MealSlotStats, PrePostDelta, DailyReading } from "../agp-utils";
import { MEAL_SLOT_ORDER, MEAL_SLOT_LABELS } from "../agp-utils";
import { cn } from "@/lib/utils";

const TARGET_LOW = 3.9;
const TARGET_HIGH = 10.0;
const TARGET_COLOR = "rgba(34, 197, 94, 0.07)";

interface AgpChartProps {
  mealData: AgpMealData;
}

type TabId = "meal" | "delta" | "daily";

const tabs: { id: TabId; label: string }[] = [
  { id: "meal", label: "Meal AGP" },
  { id: "delta", label: "Pre/Post Δ" },
  { id: "daily", label: "Daily View" },
];

export function AgpChart({ mealData }: AgpChartProps) {
  const [tab, setTab] = useState<TabId>("meal");

  return (
    <div className="w-full">
      <div className="flex gap-1 mb-3 border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-colors border-b-2 -mb-px",
              tab === t.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "meal" && <MealAgpView stats={mealData.mealStats} />}
      {tab === "delta" && <DeltaView deltas={mealData.prePostDeltas} />}
      {tab === "daily" && <DailyView stats={mealData.mealStats} dailyReadings={mealData.dailyReadings} />}
    </div>
  );
}

function formatLabel(slot: string): string {
  return MEAL_SLOT_LABELS[slot] ?? slot;
}

function yTicks(max: number): number[] {
  const ticks: number[] = [];
  for (let v = 0; v <= Math.ceil(max); v += 2) ticks.push(v);
  return ticks;
}

function MealAgpView({ stats }: { stats: MealSlotStats[] }) {
  if (stats.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Not enough meal-tagged readings to generate meal AGP
      </div>
    );
  }

  const maxY = Math.max(...stats.map((s) => s.p95), 12);
  const yTicksList = yTicks(maxY);

  return (
    <div className="w-full">
      <svg viewBox="0 0 700 300" className="w-full" style={{ height: "auto", maxHeight: 300 }}>
        <defs>
          <clipPath id="meal-chart-clip">
            <rect x={50} y={10} width={630} height={230} />
          </clipPath>
        </defs>

        <text x={14} y={130} textAnchor="middle" transform="rotate(-90, 14, 130)" className="fill-muted-foreground" fontSize={10}>
          mmol/L
        </text>

        {yTicksList.map((v) => {
          const y = 240 - ((v - 0) / (maxY - 0)) * 230;
          return (
            <g key={v}>
              <line x1={50} y1={y} x2={680} y2={y} stroke="hsl(var(--border))" strokeDasharray="3 3" strokeWidth={0.5} />
              <text x={46} y={y + 3} textAnchor="end" className="fill-muted-foreground" fontSize={9}>
                {v}
              </text>
            </g>
          );
        })}

        <rect x={50} y={240 - ((TARGET_HIGH - 0) / (maxY - 0)) * 230} width={630} height={((TARGET_HIGH - TARGET_LOW) / (maxY - 0)) * 230} fill={TARGET_COLOR} />

        <line x1={50} y1={240 - ((TARGET_LOW - 0) / (maxY - 0)) * 230} x2={680} y2={240 - ((TARGET_LOW - 0) / (maxY - 0)) * 230} stroke="#22c55e" strokeDasharray="4 3" strokeWidth={0.75} />
        <line x1={50} y1={240 - ((TARGET_HIGH - 0) / (maxY - 0)) * 230} x2={680} y2={240 - ((TARGET_HIGH - 0) / (maxY - 0)) * 230} stroke="#22c55e" strokeDasharray="4 3" strokeWidth={0.75} />

        {stats.map((s, i) => {
          const spacing = 630 / stats.length;
          const cx = 50 + spacing * (i + 0.5);
          const boxWidth = Math.min(spacing * 0.55, 36);
          const xBox = cx - boxWidth / 2;

          const yP5 = 240 - ((s.p5 - 0) / (maxY - 0)) * 230;
          const yP25 = 240 - ((s.p25 - 0) / (maxY - 0)) * 230;
          const yP50 = 240 - ((s.median - 0) / (maxY - 0)) * 230;
          const yP75 = 240 - ((s.p75 - 0) / (maxY - 0)) * 230;
          const yP95 = 240 - ((s.p95 - 0) / (maxY - 0)) * 230;

          return (
            <g key={s.mealSlot} clipPath="url(#meal-chart-clip)">
              <line x1={cx} y1={yP5} x2={cx} y2={yP95} stroke="hsl(var(--muted-foreground))" strokeWidth={1} opacity={0.6} />
              <line x1={cx - 4} y1={yP5} x2={cx + 4} y2={yP5} stroke="hsl(var(--muted-foreground))" strokeWidth={1} opacity={0.6} />
              <line x1={cx - 4} y1={yP95} x2={cx + 4} y2={yP95} stroke="hsl(var(--muted-foreground))" strokeWidth={1} opacity={0.6} />
              <rect x={xBox} y={yP75} width={boxWidth} height={yP25 - yP75} fill="rgba(59,130,246,0.25)" stroke="rgba(59,130,246,0.5)" strokeWidth={1} rx={2} />
              <line x1={xBox} y1={yP50} x2={xBox + boxWidth} y2={yP50} stroke="hsl(221, 83%, 53%)" strokeWidth={2.5} />
            </g>
          );
        })}

        {stats.map((s, i) => {
          const spacing = 630 / stats.length;
          const cx = 50 + spacing * (i + 0.5);
          return (
            <g key={s.mealSlot}>
              <text x={cx} y={272} textAnchor="middle" className="fill-muted-foreground" fontSize={9}>
                {s.label}
              </text>
              <text x={cx} y={284} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={8} opacity={0.7}>
                n={s.count}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-1 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-6 rounded bg-blue-500/25 border border-blue-500/50" />
          <span>25th–75th</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-6 bg-blue-700" />
          <span>Median</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-6 bg-green-500/10" />
          <span>Target 3.9–10.0</span>
        </div>
      </div>
    </div>
  );
}

function DeltaView({ deltas }: { deltas: PrePostDelta[] }) {
  if (deltas.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No paired pre/post meal readings found. Log readings with matching pre and post meal tags on the same day.
      </div>
    );
  }

  const maxDelta = Math.max(...deltas.map((d) => d.p75Delta), 5);

  const chartData = deltas.map((d) => ({
    label: d.mealLabel,
    median: d.medianDelta,
    errorUp: d.p75Delta - d.medianDelta,
    errorDown: d.medianDelta - d.p25Delta,
    pairCount: d.pairCount,
    spikeCount: d.spikeCount,
    isSpike: d.medianDelta > 3.0,
  }));

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
          <YAxis
            domain={[0, Math.ceil(maxDelta) + 1]}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            tickCount={5}
            unit=" mmol/L"
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="rounded-lg border bg-background/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
                  <p className="font-medium">{d.label}</p>
                  <p>Median Δ: <span className="font-mono font-medium">{d.median.toFixed(1)} mmol/L</span></p>
                  <p>IQR: {d.median - d.errorDown.toFixed(1)} – {(d.median + d.errorUp).toFixed(1)}</p>
                  <p>Pairs: {d.pairCount} | Spikes (&gt;3.0): {d.spikeCount}</p>
                </div>
              );
            }}
          />
          <ReferenceLine y={3.0} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1} label={{ value: "Spike threshold", position: "right", fontSize: 9, fill: "#ef4444" }} />
          <Bar dataKey="median" radius={[3, 3, 0, 0]}>
            {chartData.map((entry, i) => (
              <rect key={i} fill={entry.isSpike ? "#ef4444" : entry.median > 2.0 ? "#f97316" : "#22c55e"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        {deltas.map((d) => (
          <div key={d.mealKey} className={cn("rounded-md border p-2", d.medianDelta > 3.0 ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950" : d.medianDelta > 2.0 ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950" : "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950")}>
            <p className="font-medium">{d.mealLabel}</p>
            <p className={cn("font-mono text-sm font-bold", d.medianDelta > 3.0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
              +{d.medianDelta.toFixed(1)}
            </p>
            <p className="text-muted-foreground mt-0.5">{d.pairCount} pairs, {d.spikeCount} spikes</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DailyView({ stats, dailyReadings }: { stats: MealSlotStats[]; dailyReadings: DailyReading[] }) {
  if (stats.length === 0 || dailyReadings.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No meal-tagged readings available for daily view
      </div>
    );
  }

  const maxY = Math.max(...stats.map((s) => s.p95), 12);
  const yTicksList = yTicks(maxY);

  const sortedSlots = [...stats].sort((a, b) => MEAL_SLOT_ORDER[a.mealSlot] - MEAL_SLOT_ORDER[b.mealSlot]);
  const slotIndices = new Map(sortedSlots.map((s, i) => [s.mealSlot, i]));

  const groupedByDate = new Map<string, { mealSlot: string; level: number }[]>();
  for (const r of dailyReadings) {
    if (!groupedByDate.has(r.date)) groupedByDate.set(r.date, []);
    groupedByDate.get(r.date)!.push({ mealSlot: r.mealSlot, level: r.level });
  }

  const sortedDates = [...groupedByDate.keys()].sort();
  const recentDates = sortedDates.slice(-21);

  const dayPaths: { path: string; opacity: number }[] = [];
  const dayDots: { cx: number; cy: number; fill: string }[] = [];

  const spacing = 630 / sortedSlots.length;

  for (let di = 0; di < recentDates.length; di++) {
    const date = recentDates[di];
    const readings = groupedByDate.get(date) ?? [];
    readings.sort((a, b) => (MEAL_SLOT_ORDER[a.mealSlot] ?? 99) - (MEAL_SLOT_ORDER[b.mealSlot] ?? 99));

    const points: { x: number; y: number; level: number }[] = [];
    for (const r of readings) {
      const si = slotIndices.get(r.mealSlot);
      if (si === undefined) continue;
      const cx = 50 + spacing * (si + 0.5);
      const cy = 240 - ((r.level - 0) / (maxY - 0)) * 230;
      points.push({ x: cx, y: cy, level: r.level });
    }

    if (points.length < 2) continue;

    const age = recentDates.length - 1 - di;
    const opacity = Math.max(0.15, 0.7 - age * 0.03);

    const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    dayPaths.push({ path: d, opacity });

    for (const p of points) {
      const inRange = p.level >= TARGET_LOW && p.level <= TARGET_HIGH;
      dayDots.push({
        cx: p.x + (Math.random() - 0.5) * 3,
        cy: p.y,
        fill: inRange ? `rgba(34, 197, 94, ${opacity + 0.15})` : `rgba(239, 68, 68, ${opacity + 0.15})`,
      });
    }
  }

  return (
    <div className="w-full">
      <svg viewBox="0 0 700 300" className="w-full" style={{ height: "auto", maxHeight: 300 }}>
        <defs>
          <clipPath id="daily-chart-clip">
            <rect x={50} y={10} width={630} height={230} />
          </clipPath>
        </defs>

        <text x={14} y={130} textAnchor="middle" transform="rotate(-90, 14, 130)" className="fill-muted-foreground" fontSize={10}>
          mmol/L
        </text>

        {yTicksList.map((v) => {
          const y = 240 - ((v - 0) / (maxY - 0)) * 230;
          return (
            <g key={v}>
              <line x1={50} y1={y} x2={680} y2={y} stroke="hsl(var(--border))" strokeDasharray="3 3" strokeWidth={0.5} />
              <text x={46} y={y + 3} textAnchor="end" className="fill-muted-foreground" fontSize={9}>
                {v}
              </text>
            </g>
          );
        })}

        <rect x={50} y={240 - ((TARGET_HIGH - 0) / (maxY - 0)) * 230} width={630} height={((TARGET_HIGH - TARGET_LOW) / (maxY - 0)) * 230} fill={TARGET_COLOR} />

        <g clipPath="url(#daily-chart-clip)">
          {dayPaths.map((dp, i) => (
            <path key={i} d={dp.path} fill="none" stroke="hsl(221, 83%, 53%)" strokeWidth={0.75} opacity={dp.opacity} />
          ))}
          {dayDots.map((dot, i) => (
            <circle key={i} cx={dot.cx} cy={dot.cy} r={2.5} fill={dot.fill} />
          ))}
        </g>

        {sortedSlots.map((s, i) => {
          const cx = 50 + spacing * (i + 0.5);
          return (
            <g key={s.mealSlot}>
              <text x={cx} y={272} textAnchor="middle" className="fill-muted-foreground" fontSize={9}>
                {s.label}
              </text>
              <text x={cx} y={284} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={8} opacity={0.7}>
                n={s.count}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-1 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-6 bg-blue-700" />
          <span>Per-day line</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500/60" />
          <span>In range</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500/60" />
          <span>Low / High</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-6 bg-green-500/10" />
          <span>Target 3.9–10.0</span>
        </div>
      </div>
    </div>
  );
}
