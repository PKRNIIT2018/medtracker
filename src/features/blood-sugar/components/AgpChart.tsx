"use client";

import { Area, AreaChart, CartesianGrid, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AgpChartData } from "../agp-utils";

const TARGET_LOW = 3.9;
const TARGET_HIGH = 10.0;

interface AgpChartProps {
  data: AgpChartData;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const row = payload.find((p) => p.name === "p50");
  return (
    <div className="rounded-lg border bg-background/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
      <p className="font-mono font-medium">{label}</p>
      <p className="text-muted-foreground">Median: <span className="font-mono font-medium text-foreground">{row?.value?.toFixed(1)}</span></p>
    </div>
  );
}

export function AgpChart({ data }: AgpChartProps) {
  if (data.bins.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Not enough time-stamped readings to generate AGP chart
      </div>
    );
  }

  const chartData = data.bins.map((b) => {
    const hasData = b.p50 > 0;
    return {
      ...b,
      p95Band: hasData ? b.p95 - b.p5 : 0,
      p75Band: hasData ? b.p75 - b.p25 : 0,
    };
  });

  const targetColor = "rgba(34, 197, 94, 0.08)";

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            ticks={["00:00", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"]}
          />
          <YAxis
            domain={[0, data.maxY]}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            tickCount={6}
          />
          <Tooltip content={<CustomTooltip />} />

          <ReferenceLine y={TARGET_LOW} stroke="hsl(142, 71%, 45%)" strokeDasharray="4 4" strokeWidth={1} />
          <ReferenceLine y={TARGET_HIGH} stroke="hsl(142, 71%, 45%)" strokeDasharray="4 4" strokeWidth={1} />

          <Area type="monotone" dataKey="p95Band" stroke="none" fill="rgba(59, 130, 246, 0.15)" stackId="p95" />
          <Area type="monotone" dataKey="p5" stroke="none" fill="none" stackId="p95" />
          <Area type="monotone" dataKey="p75Band" stroke="none" fill="rgba(59, 130, 246, 0.3)" stackId="p75" />
          <Area type="monotone" dataKey="p25" stroke="none" fill="none" stackId="p75" />
          <Line type="monotone" dataKey="p50" stroke="hsl(221, 83%, 53%)" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-6 rounded bg-blue-500/15" />
          <span>5th–95th</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-6 rounded bg-blue-500/30" />
          <span>25th–75th</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-6 rounded bg-blue-700" />
          <span>Median</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-0 w-6 border-t border-dashed border-green-500" />
          <span>Target 3.9–10.0</span>
        </div>
      </div>
    </div>
  );
}
