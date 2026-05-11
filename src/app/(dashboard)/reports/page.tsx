"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";
import { FileText, Download } from "lucide-react";

const supabase = createClient();

type ExportType = "blood_sugar" | "blood_pressure" | "medication_intake";

const exportLabels: Record<ExportType, string> = {
  blood_sugar: "Blood Sugar",
  blood_pressure: "Blood Pressure",
  medication_intake: "Medication Intake",
};

export default function ReportsPage() {
  const [exportType, setExportType] = useState<ExportType>("blood_sugar");
  const [dateFrom, setDateFrom] = useState(format(new Date().setDate(1), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));

  async function fetchData() {
    const { data, error } = await supabase
      .from(exportType)
      .select("*")
      .is("deleted_at", null)
      .gte(
        exportType === "medication_intake" ? "taken_date" : exportType === "blood_sugar" ? "reading_date" : "reading_date",
        dateFrom
      )
      .lte(
        exportType === "medication_intake" ? "taken_date" : exportType === "blood_sugar" ? "reading_date" : "reading_date",
        dateTo
      )
      .order(exportType === "medication_intake" ? "taken_date" : "reading_date", { ascending: true });

    if (error) { toast.error(error.message); return null; }
    return data ?? [];
  }

  async function exportCSV() {
    const data = await fetchData();
    if (!data) return;
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${exportType}_${dateFrom}_${dateTo}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }

  async function exportPDF() {
    const data = await fetchData();
    if (!data || data.length === 0) { toast.error("No data to export"); return; }

    const { data: userData } = await supabase.auth.getUser();
    const userName = userData?.user?.email ?? "User";

    const { data: settings } = await supabase
      .from("user_settings")
      .select("full_name")
      .eq("user_id", userData?.user?.id)
      .maybeSingle();
    const displayName = settings?.full_name || userName;

    const skipCols = new Set(["id", "user_id", "created_at", "deleted_at", "updated_at"]);

    const dateCol = exportType === "medication_intake" ? "taken_date" : "reading_date";
    const timeCol = exportType === "medication_intake" ? "taken_time" : "reading_time";

    const mealSlotMap: Record<string, string> = {
      before_breakfast: "Before Breakfast",
      after_breakfast: "After Breakfast",
      before_lunch: "Before Lunch",
      after_lunch: "After Lunch",
      before_dinner: "Before Dinner",
      after_dinner: "After Dinner",
      fasting: "Fasting",
      bedtime: "Bedtime",
    };

    const columnLabels: Record<string, string> = {
      reading_date: "Date",
      reading_time: "Time",
      taken_date: "Date",
      taken_time: "Time",
      meal_slot: "Meal Slot",
      level: "Level (mmol/L)",
      systolic: "Systolic",
      diastolic: "Diastolic",
      heart_rate: "Heart Rate",
      status: "Status",
      medication_id: "Medication",
      dose_id: "Dose",
      notes: "Notes",
    };

    function formatVal(k: string, v: unknown): string {
      if (v == null) return "";
      if (k === dateCol) return format(new Date(v as string), "dd-MM-yyyy");
      if (k === timeCol) return v as string;
      if (k === "meal_slot") return mealSlotMap[v as string] ?? (v as string);
      return String(v);
    }

    const filteredKeys = Object.keys(data[0]).filter((k) => !skipCols.has(k));
    const headers = filteredKeys.map((k) => ({ header: columnLabels[k] ?? k, dataKey: k }));
    const rows = data.map((r: Record<string, unknown>) =>
      Object.fromEntries(filteredKeys.map((k) => [k, formatVal(k, r[k])]))
    );

    const doc = new jsPDF();
    doc.text(`${exportLabels[exportType]} Report`, 14, 16);
    doc.text(`Patient: ${displayName}`, 14, 24);
    doc.text(`Period: ${format(new Date(dateFrom), "dd-MM-yyyy")} to ${format(new Date(dateTo), "dd-MM-yyyy")}`, 14, 32);

    autoTable(doc, { head: [headers.map((h) => h.header)], body: rows.map((r) => Object.values(r)), startY: 38 });
    doc.save(`${exportType}_${dateFrom}_${dateTo}.pdf`);
    toast.success("PDF exported");
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header-bg rounded-xl p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Export</h1>
          <p className="text-muted-foreground">Export your data for doctor visits</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Export Data</CardTitle><CardDescription>Choose a data type and date range</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Data Type</Label>
            <Select value={exportType} onValueChange={(v) => v && setExportType(v as ExportType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(exportLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>From</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
            <div className="space-y-2"><Label>To</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportCSV} variant="outline"><Download className="mr-2 h-4 w-4" />Export CSV</Button>
            <Button onClick={exportPDF}><FileText className="mr-2 h-4 w-4" />Export PDF</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
