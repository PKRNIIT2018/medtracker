"use client";

import { useMedications, useTodayIntake, useLogIntake } from "@/features/medications/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const timeOfDayLabels: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

export default function MedicationLogPage() {
  const { data: medications, isLoading } = useMedications();
  const { data: todayIntake } = useTodayIntake();
  const logIntake = useLogIntake();

  const active = (medications ?? []).filter((m) => m.is_active);
  const totalSlots = active.reduce((sum, m) => sum + m.time_of_day.length, 0);
  const taken = todayIntake?.filter((i) => i.status === "taken").length ?? 0;
  const skipped = todayIntake?.filter((i) => i.status === "skipped").length ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header-bg rounded-xl p-6">
        <h1 className="text-3xl font-bold tracking-tight">Today&apos;s Log</h1>
        <p className="text-muted-foreground">Track your daily medication intake</p>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <div className="rounded-lg bg-green-100 dark:bg-green-900/20 px-3 py-2">
          <span className="font-medium">{taken}</span> taken
        </div>
        {skipped > 0 && (
          <div className="rounded-lg bg-red-100 dark:bg-red-900/20 px-3 py-2">
            <span className="font-medium">{skipped}</span> skipped
          </div>
        )}
        <div className="rounded-lg bg-accent/30 px-3 py-2">
          <span className="font-medium">{totalSlots - taken - skipped}</span> remaining
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardHeader><div className="h-5 w-48 animate-pulse bg-muted rounded" /></CardHeader>
          <CardContent>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse bg-muted rounded mb-2" />
            ))}
          </CardContent>
        </Card>
      ) : active.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <p className="text-muted-foreground font-medium">No active medications</p>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Activate medications from your inventory to start tracking daily intake.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</CardTitle>
              <span className="text-sm text-muted-foreground">{taken} of {totalSlots} taken{skipped > 0 ? `, ${skipped} skipped` : ""}</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {active.map((med) => (
              <div
                key={med.id}
                className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{med.name}</p>
                  <p className="text-xs text-muted-foreground">{med.strength} &middot; {med.time_of_day.length}x daily</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {med.time_of_day.map((slot: string) => {
                    const entry = todayIntake?.find(
                      (i) => i.medication_id === med.id && i.time_slot === slot
                    );
                    const isTaken = entry?.status === "taken";
                    const isSkipped = entry?.status === "skipped";

                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={logIntake.isPending}
                        onClick={() =>
                          logIntake.mutate({
                            medication_id: med.id,
                            time_slot: slot,
                            status: isTaken ? "skipped" : "taken",
                          })
                        }
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 min-w-[5rem] justify-center",
                          isTaken && "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 shadow-sm",
                          isSkipped && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                          !isTaken && !isSkipped && "bg-muted text-muted-foreground hover:bg-primary/15 hover:text-primary"
                        )}
                      >
                        <span>{timeOfDayLabels[slot]}</span>
                        {isTaken && <Check className="h-3 w-3" />}
                        {isSkipped && <X className="h-3 w-3" />}
                        {!isTaken && !isSkipped && <Plus className="h-3 w-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
