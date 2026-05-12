"use client";

import type { AgpMetrics } from "../agp-utils";
import { cn } from "@/lib/utils";

interface AgpMetricsProps {
  metrics: AgpMetrics;
}

function GaugeBar({ label, value, target, color, suffix = "%" }: { label: string; value: number; target: number; color: string; suffix?: string }) {
  const isMet = value <= target;

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-mono font-medium", isMet ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
          {value.toFixed(1)}{suffix}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all")}
          style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function AgpMetrics({ metrics }: AgpMetricsProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1 text-center">
          <p className="text-2xl font-bold tabular-nums">{metrics.avgGlucose.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">Avg Glucose<br />mmol/L</p>
        </div>
        <div className="space-y-1 text-center">
          <p className="text-2xl font-bold tabular-nums">{metrics.gmi.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">GMI</p>
        </div>
        <div className="space-y-1 text-center">
          <p className="text-2xl font-bold tabular-nums">{metrics.cv.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">%CV</p>
        </div>
        <div className="space-y-1 text-center">
          <p className="text-2xl font-bold tabular-nums">{metrics.readings}</p>
          <p className="text-xs text-muted-foreground">Readings<br />{metrics.days} days</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">Time in Ranges</p>

        <div className="flex h-6 w-full overflow-hidden rounded-md">
          <div
            className="flex items-center justify-center text-[10px] font-medium text-white"
            style={{ width: `${Math.max(metrics.timeBelowLevel2, 1)}%`, backgroundColor: "#ef4444" }}
            title={`Below 3.0: ${metrics.timeBelowLevel2.toFixed(1)}%`}
          >
            {metrics.timeBelowLevel2 > 5 && "L2"}
          </div>
          <div
            className="flex items-center justify-center text-[10px] font-medium text-white"
            style={{ width: `${Math.max(metrics.timeBelowLevel1, 1)}%`, backgroundColor: "#f97316" }}
            title={`Below 3.9: ${metrics.timeBelowLevel1.toFixed(1)}%`}
          >
            {metrics.timeBelowLevel1 > 5 && "L1"}
          </div>
          <div
            className="flex items-center justify-center text-[10px] font-medium text-white"
            style={{ width: `${Math.max(metrics.timeInRange, 1)}%`, backgroundColor: "#22c55e" }}
            title={`In Range: ${metrics.timeInRange.toFixed(1)}%`}
          >
            {metrics.timeInRange > 8 && "TIR"}
          </div>
          <div
            className="flex items-center justify-center text-[10px] font-medium text-white"
            style={{ width: `${Math.max(metrics.timeAboveLevel1, 1)}%`, backgroundColor: "#f97316" }}
            title={`Above 10.0: ${metrics.timeAboveLevel1.toFixed(1)}%`}
          >
            {metrics.timeAboveLevel1 > 5 && "L1"}
          </div>
          <div
            className="flex items-center justify-center text-[10px] font-medium text-white"
            style={{ width: `${Math.max(metrics.timeAboveLevel2, 1)}%`, backgroundColor: "#ef4444" }}
            title={`Above 13.9: ${metrics.timeAboveLevel2.toFixed(1)}%`}
          >
            {metrics.timeAboveLevel2 > 5 && "L2"}
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <GaugeBar label="Time Below L2 (&lt;3.0)" value={metrics.timeBelowLevel2} target={1} color="#ef4444" />
          <GaugeBar label="Time Below L1 (3.0–3.9)" value={metrics.timeBelowLevel1} target={4} color="#f97316" />
          <GaugeBar label="Time In Range (3.9–10.0)" value={metrics.timeInRange} target={70} color="#22c55e" suffix="% target >70%" />
          <GaugeBar label="Time Above L1 (10.0–13.9)" value={metrics.timeAboveLevel1} target={25} color="#f97316" />
          <GaugeBar label="Time Above L2 (&gt;13.9)" value={metrics.timeAboveLevel2} target={5} color="#ef4444" />
        </div>
      </div>
    </div>
  );
}
