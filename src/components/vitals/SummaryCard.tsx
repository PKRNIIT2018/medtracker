import { Card, CardContent } from "@/components/ui/card";
import type { VitalsSummary } from "@/features/vitals/summary";

const trendColors = { improved: "text-green-600", unchanged: "text-muted-foreground", worse: "text-red-600" };

export function SummaryCard({ summary }: { summary: VitalsSummary }) {
  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{summary.category}</p>
            <p className="text-sm font-semibold">{summary.label}</p>
            <p className="text-xs text-muted-foreground">{summary.summary}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>Current: <strong>{summary.currentValue}</strong></span>
              {summary.previousValue && (
                <span>
                  Previous: <strong>{summary.previousValue}</strong>
                  <span className={`ml-1 ${trendColors[summary.trend]}`}>
                    {summary.trend === "improved" && "↓ Better"}
                    {summary.trend === "worse" && "↑ Worse"}
                    {summary.trend === "unchanged" && "→ Same"}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SummaryCardSkeleton() {
  return (
    <Card className="border-l-4 border-l-muted">
      <CardContent className="py-3 space-y-2">
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}
