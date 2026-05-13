"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { usePatientBloodSugar } from "@/features/doctor/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AgpMetrics } from "@/features/blood-sugar/components/AgpMetrics";
import { AgpChart } from "@/features/blood-sugar/components/AgpChart";
import { computeAgpMetrics, computeAgpModalDay, computeAgpMealData } from "@/features/blood-sugar/agp-utils";
import type { AgpReading } from "@/features/blood-sugar/agp-utils";

export default function DoctorPatientDetailPage() {
  const params = useParams();
  const patientId = params.id as string;

  const today = format(new Date(), "yyyy-MM-dd");
  const thirtyDaysAgo = format(new Date().setDate(new Date().getDate() - 30), "yyyy-MM-dd");

  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo);
  const [dateTo, setDateTo] = useState(today);

  const { data: readings, isLoading } = usePatientBloodSugar(patientId, dateFrom, dateTo);

  const agpReadings: AgpReading[] = (readings ?? []).map((r) => ({
    level: r.level,
    time: r.reading_time ?? "",
    date: r.reading_date,
    mealSlot: r.meal_slot,
  }));

  const metrics = agpReadings.length > 0 ? computeAgpMetrics(agpReadings) : null;
  const chart = agpReadings.length > 0 ? computeAgpModalDay(agpReadings) : null;
  const mealData = agpReadings.length > 0 ? computeAgpMealData(agpReadings) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link href="/doctor/patients">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patient Reports</h1>
          <p className="text-sm text-muted-foreground">Blood Sugar & AGP Report</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>To</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <div className="h-48 w-full animate-pulse rounded-lg bg-muted" />
          <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
        </div>
      )}

      {!isLoading && readings && readings.length === 0 && (
        <Card>
          <CardContent className="flex h-48 items-center justify-center">
            <div className="text-center">
              <Activity className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <p className="mt-2 text-sm text-muted-foreground">No blood sugar readings for this period.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && metrics && chart && mealData && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Ambulatory Glucose Profile
              </CardTitle>
              <CardDescription>
                {agpReadings.length} readings across {metrics.days} days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AgpMetrics metrics={metrics} mealStats={mealData.mealStats} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Meal-Context AGP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AgpChart mealData={mealData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Raw Readings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Time</th>
                      <th className="pb-2 font-medium">Meal Slot</th>
                      <th className="pb-2 font-medium text-right">Level (mmol/L)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readings!.map((r) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-1.5">{r.reading_date}</td>
                        <td className="py-1.5">{r.reading_time ?? "-"}</td>
                        <td className="py-1.5 capitalize">{r.meal_slot.replace(/_/g, " ")}</td>
                        <td className="py-1.5 text-right font-mono">{r.level}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
