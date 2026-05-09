"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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

    const doc = new jsPDF();
    doc.text(`${exportLabels[exportType]} Report`, 14, 16);
    doc.text(`Period: ${dateFrom} to ${dateTo}`, 14, 24);

    const headers = Object.keys(data[0]).map((k) => ({ header: k, dataKey: k }));
    const rows = data.map((r: Record<string, unknown>) =>
      Object.fromEntries(Object.keys(data[0]).map((k) => [k, String(r[k] ?? "")]))
    );

    autoTable(doc, { head: [headers.map((h) => h.header)], body: rows.map((r) => Object.values(r)) });
    doc.save(`${exportType}_${dateFrom}_${dateTo}.pdf`);
    toast.success("PDF exported");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Export</h1>
        <p className="text-muted-foreground">Export your data for doctor visits</p>
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
            <div className="space-y-2"><Label>From</Label><input type="date" className="w-full rounded-md border px-3 py-2 text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
            <div className="space-y-2"><Label>To</Label><input type="date" className="w-full rounded-md border px-3 py-2 text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
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
