"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAgpDataByDateRange } from "@/features/blood-sugar/agp-hooks";
import { AgpChart } from "@/features/blood-sugar/components/AgpChart";
import { AgpMetrics } from "@/features/blood-sugar/components/AgpMetrics";
import { Download, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const supabase = createClient();

export function AgpReport() {
  const defaultFrom = format(new Date().setDate(new Date().getDate() - 30), "yyyy-MM-dd");
  const today = format(new Date(), "yyyy-MM-dd");

  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(today);

  const { metrics, chart, mealData, isLoading, hasData } = useAgpDataByDateRange(dateFrom, dateTo);

  async function exportPDF() {
    if (!metrics) return;

    const { data: userData } = await supabase.auth.getUser();
    const { data: settings } = await supabase
      .from("user_settings")
      .select("full_name")
      .eq("user_id", userData?.user?.id)
      .maybeSingle();
    const displayName = settings?.full_name || userData?.user?.email || "User";

    const doc = new jsPDF();
    let y = 16;

    doc.setFontSize(16);
    doc.text("Ambulatory Glucose Profile Report", 14, y);
    y += 10;

    doc.setFontSize(10);
    doc.text(`Patient: ${displayName}`, 14, y);
    y += 6;
    doc.text(`Period: ${format(new Date(dateFrom), "dd-MM-yyyy")} to ${format(new Date(dateTo), "dd-MM-yyyy")}`, 14, y);
    y += 6;
    doc.text(`Total Readings: ${metrics.readings} over ${metrics.days} days`, 14, y);
    y += 12;

    doc.setFontSize(12);
    doc.text("Key Metrics", 14, y);
    y += 8;

    const tableBody = [
      ["Average Glucose", `${metrics.avgGlucose.toFixed(1)} mmol/L`],
      ["GMI (Glucose Management Indicator)", `${metrics.gmi.toFixed(1)}%`],
      ["Glucose Variability (%CV)", `${metrics.cv.toFixed(1)}%`],
      ["Standard Deviation", `${metrics.sd.toFixed(2)} mmol/L`],
      ["Time In Range (3.9-10.0)", `${metrics.timeInRange.toFixed(1)}%`],
      ["Time Above Level 1 (10.0-13.9)", `${metrics.timeAboveLevel1.toFixed(1)}%`],
      ["Time Above Level 2 (>13.9)", `${metrics.timeAboveLevel2.toFixed(1)}%`],
      ["Time Below Level 1 (3.0-3.9)", `${metrics.timeBelowLevel1.toFixed(1)}%`],
      ["Time Below Level 2 (<3.0)", `${metrics.timeBelowLevel2.toFixed(1)}%`],
    ];

    autoTable(doc, {
      head: [["Metric", "Value"]],
      body: tableBody,
      startY: y,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

    if (mealData && mealData.mealStats.length > 0) {
      doc.setFontSize(12);
      doc.text("Meal-Context Percentiles", 14, y);
      y += 8;

      const mealRows = mealData.mealStats.map((s) => [
        s.label,
        s.count.toString(),
        s.avg.toFixed(1),
        s.p5.toFixed(1),
        s.p25.toFixed(1),
        s.median.toFixed(1),
        s.p75.toFixed(1),
        s.p95.toFixed(1),
      ]);

      autoTable(doc, {
        head: [["Meal Slot", "n", "Avg", "5th", "25th", "50th", "75th", "95th"]],
        body: mealRows,
        startY: y,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
    }

    if (mealData && mealData.prePostDeltas.length > 0) {
      doc.setFontSize(12);
      doc.text("Pre/Post Meal Deltas", 14, y);
      y += 8;

      const deltaRows = mealData.prePostDeltas.map((d) => [
        d.mealLabel,
        d.pairCount.toString(),
        `${d.medianDelta.toFixed(1)} mmol/L`,
        d.spikeCount.toString(),
      ]);

      autoTable(doc, {
        head: [["Meal", "Pairs", "Median Δ", "Spikes (>3.0)"]],
        body: deltaRows,
        startY: y,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] },
      });
    }

    doc.save(`agp_report_${dateFrom}_${dateTo}.pdf`);
    toast.success("AGP report exported as PDF");
  }

  return (
    <div className="space-y-4">
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

      <div className="flex gap-2">
        <Button onClick={exportPDF} disabled={!hasData || isLoading}>
          <FileText className="mr-2 h-4 w-4" />Export PDF
        </Button>
      </div>

      {isLoading && (
        <div className="flex h-64 items-center justify-center rounded-lg border">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      )}

      {!isLoading && !hasData && (
        <Card>
          <CardContent className="flex h-48 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No blood sugar readings found for the selected period. AGP requires at least a few readings with timestamps to generate a profile.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && hasData && metrics && chart && mealData && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Meal-Context AGP
                <span className="ml-2 text-xs font-normal">— {metrics.readings} readings, {metrics.days} days</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AgpChart mealData={mealData} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <AgpMetrics metrics={metrics} mealStats={mealData.mealStats} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
