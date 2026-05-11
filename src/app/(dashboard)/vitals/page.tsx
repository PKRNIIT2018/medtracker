"use client";

import { useState } from "react";
import { useBloodPressureReadings, useCreateBloodPressure, useUpdateBloodPressure, useWeightReadings, useCreateWeight, useUpdateWeight, useBloodPanelReadings, useCreateBloodPanel, useUpdateBloodPanel } from "@/features/vitals/hooks";
import { createClient } from "@/lib/supabase/client";
import { bloodPressureSchema, weightSchema, bloodPanelSchema, type BloodPressureFormData, type WeightFormData } from "@/features/vitals/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { Plus, Trash2, Pencil, HeartPulse, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { AddVitalsDialogContent } from "@/components/vitals/AddVitalsDialog";
import { summarizeBloodPressure } from "@/features/vitals/summary";
import { SummaryCard } from "@/components/vitals/SummaryCard";
import { getBpBorderColor, getBpStatusLabel, getPanelLevel, panelLevelColors, panelStatusIcons, panelStatusLabels } from "@/lib/vitals-colors";

const dateStr = format(new Date(), "yyyy-MM-dd");

const supabase = createClient();

const panelFields = [
  { key: "s_chol" as const, label: "S-CHOL", description: "Total cholesterol", unit: "mmol/l", range: "Normal: below 5.0 mmol/L" },
  { key: "s_tag" as const, label: "S-TAG", description: "Triglycerides", unit: "mmol/l", range: "Normal: below 1.7 mmol/L" },
  { key: "s_hdl" as const, label: "S-HDL", description: "HDL cholesterol", unit: "mmol/l", range: "Good: above 1.0 mmol/L (men), above 1.2 mmol/L (women)" },
  { key: "non_hdl" as const, label: "non-HDL", description: "Non-HDL cholesterol", unit: "mmol/l", range: "Normal: below 4.0 mmol/L" },
  { key: "s_ck" as const, label: "S-CK", description: "Creatine kinase", unit: "ukat/l", range: "Range: 0.2–2.27 ukat/L (may vary by lab/sex)" },
  { key: "b_hba1c_dc" as const, label: "B-HbA1c DC", description: "HbA1c in DCCT %", unit: "%", range: "Normal: <6.0%; 6.0–6.4% prediabetes; ≥6.5% diabetes" },
  { key: "b_hba1c_if" as const, label: "B-HbA1c IF", description: "HbA1c in IFCC mmol/mol", unit: "mmol/mol", range: "Normal: ≤41; 42–47 prediabetes; ≥48 diabetes" },
];

export default function VitalsPage() {
  const { data: bpReadings } = useBloodPressureReadings();
  const { data: weightReadings } = useWeightReadings();
  const { data: panelReadings } = useBloodPanelReadings();
  const createBP = useCreateBloodPressure();
  const updateBP = useUpdateBloodPressure();
  const createWeight = useCreateWeight();
  const updateWeight = useUpdateWeight();
  const createPanel = useCreateBloodPanel();
  const updatePanel = useUpdateBloodPanel();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editType, setEditType] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [tab, setTab] = useState<"blood-pressure" | "weight" | "blood-panel">("blood-pressure");

  const [bpForm, setBpForm] = useState<BloodPressureFormData>({ reading_date: dateStr, reading_time: "", systolic: 120, diastolic: 80, heart_rate: null, notes: "" });
  const [weightForm, setWeightForm] = useState<WeightFormData>({ reading_date: dateStr, weight_kg: 70, notes: "" });
  const [panelForm, setPanelForm] = useState({ reading_date: dateStr, s_chol: "", s_tag: "", s_hdl: "", non_hdl: "", s_ck: "", b_hba1c_dc: "", b_hba1c_if: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmitBP(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const result = bloodPressureSchema.safeParse(bpForm);
    if (!result.success) {
      const f = result.error.flatten().fieldErrors;
      setErrors(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v?.[0] ?? ""])));
      return;
    }
    createBP.mutate({ ...result.data, reading_time: result.data.reading_time || undefined, notes: result.data.notes || undefined }, {
      onSuccess: () => { toast.success("Reading saved"); setOpen(false); },
      onError: (err) => toast.error(err.message),
    });
  }

  function handleSubmitWeight(e: React.FormEvent) {
    e.preventDefault();
    const result = weightSchema.safeParse(weightForm);
    if (!result.success) { toast.error("Invalid values"); return; }
    createWeight.mutate(result.data, {
      onSuccess: () => { toast.success("Weight saved"); setOpen(false); },
      onError: (err) => toast.error(err.message),
    });
  }

  function openEditVitals(type: string, row: { id: string; reading_date: string; reading_time?: string | null; notes?: string | null; systolic?: number; diastolic?: number; heart_rate?: number | null; weight_kg?: number }) {
    setEditType(type);
    setEditId(row.id);
    if (type === "bp") {
      setBpForm({ reading_date: row.reading_date, reading_time: row.reading_time ?? "", systolic: row.systolic, diastolic: row.diastolic, heart_rate: row.heart_rate, notes: row.notes ?? "" });
    } else if (type === "weight") {
      setWeightForm({ reading_date: row.reading_date, weight_kg: row.weight_kg, notes: row.notes ?? "" });
    }
    setEditOpen(true);
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId || !editType) return;
    if (editType === "bp") {
      const r = bloodPressureSchema.safeParse(bpForm);
      if (!r.success) { toast.error("Invalid values"); return; }
      updateBP.mutate({ id: editId, ...r.data, reading_time: r.data.reading_time || undefined, notes: r.data.notes || undefined }, { onSuccess: () => { toast.success("BP updated"); setEditOpen(false); }, onError: (err) => toast.error(err.message) });
    } else if (editType === "weight") {
      const r = weightSchema.safeParse(weightForm);
      if (!r.success) { toast.error("Invalid values"); return; }
      updateWeight.mutate({ id: editId, ...r.data }, { onSuccess: () => { toast.success("Weight updated"); setEditOpen(false); }, onError: (err) => toast.error(err.message) });
    } else if (editType === "panel") {
      const payload = {
        reading_date: panelForm.reading_date,
        s_chol: panelForm.s_chol === "" ? undefined : Number(panelForm.s_chol),
        s_tag: panelForm.s_tag === "" ? undefined : Number(panelForm.s_tag),
        s_hdl: panelForm.s_hdl === "" ? undefined : Number(panelForm.s_hdl),
        non_hdl: panelForm.non_hdl === "" ? undefined : Number(panelForm.non_hdl),
        s_ck: panelForm.s_ck === "" ? undefined : Number(panelForm.s_ck),
        b_hba1c_dc: panelForm.b_hba1c_dc === "" ? undefined : Number(panelForm.b_hba1c_dc),
        b_hba1c_if: panelForm.b_hba1c_if === "" ? undefined : Number(panelForm.b_hba1c_if),
        notes: panelForm.notes,
      };
      const r = bloodPanelSchema.safeParse(payload);
      if (!r.success) { toast.error("Invalid values"); return; }
      updatePanel.mutate({ id: editId, ...r.data }, { onSuccess: () => { toast.success("Blood panel updated"); setEditOpen(false); }, onError: (err) => toast.error(err.message) });
    }
  }

  function handleSubmitPanel(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      reading_date: panelForm.reading_date,
      s_chol: panelForm.s_chol === "" ? undefined : Number(panelForm.s_chol),
      s_tag: panelForm.s_tag === "" ? undefined : Number(panelForm.s_tag),
      s_hdl: panelForm.s_hdl === "" ? undefined : Number(panelForm.s_hdl),
      non_hdl: panelForm.non_hdl === "" ? undefined : Number(panelForm.non_hdl),
      s_ck: panelForm.s_ck === "" ? undefined : Number(panelForm.s_ck),
      b_hba1c_dc: panelForm.b_hba1c_dc === "" ? undefined : Number(panelForm.b_hba1c_dc),
      b_hba1c_if: panelForm.b_hba1c_if === "" ? undefined : Number(panelForm.b_hba1c_if),
      notes: panelForm.notes,
    };
    const result = bloodPanelSchema.safeParse(payload);
    if (!result.success) { toast.error("Invalid values"); return; }
    createPanel.mutate(result.data, {
      onSuccess: () => { toast.success("Blood panel saved"); setOpen(false); },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header-bg rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Vitals</h1>
            <p className="text-muted-foreground">Track blood pressure, HbA1c, and weight</p>
          </div>
<Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setTab("blood-pressure"); } }}>
  <DialogTrigger className={buttonVariants({ variant: "default" })}><Plus className="mr-2 h-4 w-4" />Add Reading</DialogTrigger>
  <DialogContent>
    <DialogHeader><DialogTitle>Add Vitals Reading</DialogTitle></DialogHeader>
    <AddVitalsDialogContent
      tab={tab}
      setTab={setTab}
      bpForm={bpForm}
      setBpForm={setBpForm}
      weightForm={weightForm}
      setWeightForm={setWeightForm}
      panelForm={panelForm}
      setPanelForm={setPanelForm}
      handleSubmitBP={handleSubmitBP}
      handleSubmitWeight={handleSubmitWeight}
      handleSubmitPanel={handleSubmitPanel}
    />
  </DialogContent>
</Dialog>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) { setEditId(null); setEditType(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit {editType === "bp" ? "Blood Pressure" : editType === "panel" ? "Blood Panel" : "Weight"}</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {editType === "bp" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Systolic</Label><Input type="number" value={bpForm.systolic} onChange={(e) => setBpForm({ ...bpForm, systolic: Number(e.target.value) })} /></div>
                  <div className="space-y-2"><Label>Diastolic</Label><Input type="number" value={bpForm.diastolic} onChange={(e) => setBpForm({ ...bpForm, diastolic: Number(e.target.value) })} /></div>
                </div>
                <div className="space-y-2"><Label>Heart Rate</Label><Input type="number" value={bpForm.heart_rate ?? ""} onChange={(e) => setBpForm({ ...bpForm, heart_rate: e.target.value ? Number(e.target.value) : null })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Date</Label><Input type="date" value={bpForm.reading_date} onChange={(e) => setBpForm({ ...bpForm, reading_date: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Time</Label><Input type="time" value={bpForm.reading_time} onChange={(e) => setBpForm({ ...bpForm, reading_time: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>Notes</Label><Textarea value={bpForm.notes} onChange={(e) => setBpForm({ ...bpForm, notes: e.target.value })} /></div>
              </>
            )}
            {editType === "weight" && (
              <>
                <div className="space-y-2"><Label>Weight (kg)</Label><Input type="number" step="0.1" value={weightForm.weight_kg} onChange={(e) => setWeightForm({ ...weightForm, weight_kg: Number(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Date</Label><Input type="date" value={weightForm.reading_date} onChange={(e) => setWeightForm({ ...weightForm, reading_date: e.target.value })} /></div>
                <div className="space-y-2"><Label>Notes</Label><Textarea value={weightForm.notes} onChange={(e) => setWeightForm({ ...weightForm, notes: e.target.value })} /></div>
              </>
            )}
            {editType === "panel" && (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {panelFields.map((f) => (
                    <div key={f.key} className={f.key === "b_hba1c_if" ? "col-span-2" : ""}>
                      <Label>{f.label} ({f.unit})</Label>
                      <Input type="number" step="0.01" min="0" value={panelForm[f.key]} onChange={(e) => setPanelForm({ ...panelForm, [f.key]: e.target.value })} />
                      <p className="mt-0.5 text-xs text-muted-foreground">{f.range}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2"><Label>Date</Label><Input type="date" value={panelForm.reading_date} onChange={(e) => setPanelForm({ ...panelForm, reading_date: e.target.value })} /></div>
                <div className="space-y-2"><Label>Notes</Label><Textarea value={panelForm.notes} onChange={(e) => setPanelForm({ ...panelForm, notes: e.target.value })} rows={2} /></div>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={updateBP.isPending || updateWeight.isPending || updatePanel.isPending}>Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="blood-pressure">Blood Pressure</TabsTrigger>
          <TabsTrigger value="weight">Weight</TabsTrigger>
          <TabsTrigger value="blood-panel">Blood Panel</TabsTrigger>
        </TabsList>
<TabsContent value="blood-pressure" className="space-y-3 pt-4">
          {bpReadings && bpReadings.length > 0 && (
            <SummaryCard summary={summarizeBloodPressure(bpReadings[0].systolic, bpReadings[0].diastolic, bpReadings[0].heart_rate, bpReadings[1] ? { systolic: bpReadings[1].systolic, diastolic: bpReadings[1].diastolic } : undefined)[0]} />
          )}
          {!bpReadings?.length ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No blood pressure readings yet. Track your systolic and diastolic readings to monitor heart health.</CardContent></Card>
          ) : bpReadings.map((r) => (
            <Card key={r.id} className={cn("border-l-4 pl-0", getBpBorderColor(r.systolic, r.diastolic))}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-2xl font-bold leading-none">{r.systolic}<span className="text-lg font-normal text-muted-foreground">/{r.diastolic}</span></p>
                    <p className="text-sm font-medium text-muted-foreground mt-0.5">{getBpStatusLabel(r.systolic, r.diastolic)}</p>
                  </div>
                  {r.heart_rate && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                      <Activity className="h-3 w-3" />
                      {r.heart_rate} bpm
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="text-xs text-muted-foreground">{format(parseISO(r.reading_date), "MMM d, yyyy")}{r.reading_time && ` · ${r.reading_time.slice(0,5)}`}</p>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" aria-label="Edit blood pressure" onClick={() => openEditVitals("bp", r)}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger render={<Button variant="ghost" size="icon" aria-label="Delete blood pressure"><Trash2 className="h-4 w-4" /></Button>} />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Blood Pressure Reading</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this blood pressure reading? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="flex justify-end gap-2">
                          <AlertDialogCancel render={<Button variant="outline" />}>Cancel</AlertDialogCancel>
                          <AlertDialogAction render={<Button variant="destructive" onClick={async () => { await supabase.from("blood_pressure").update({ deleted_at: new Date().toISOString() }).eq("id", r.id); qc.invalidateQueries({ queryKey: ["blood-pressure"] }); }} />}>Delete</AlertDialogAction>
                        </div>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="weight" className="space-y-3 pt-4">
          {!weightReadings?.length ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No weight readings yet. Log your weight regularly to spot trends and share with your doctor.</CardContent></Card>
          ) : weightReadings.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-bold">{r.weight_kg} kg</p>
                  <p className="text-xs text-muted-foreground">{r.reading_date}</p>
                </div>
                 <div className="flex gap-1">
                   <Button variant="ghost" size="icon" aria-label="Edit weight" onClick={() => openEditVitals("weight", r)}><Pencil className="h-4 w-4" /></Button>
                   <AlertDialog>
                     <AlertDialogTrigger render={<Button variant="ghost" size="icon" aria-label="Delete weight"><Trash2 className="h-4 w-4" /></Button>} />
                     <AlertDialogContent>
                       <AlertDialogHeader>
                         <AlertDialogTitle>Delete Weight Reading</AlertDialogTitle>
                         <AlertDialogDescription>
                           Are you sure you want to delete this weight reading? This action cannot be undone.
                         </AlertDialogDescription>
                       </AlertDialogHeader>
                       <div className="flex justify-end gap-2">
                         <AlertDialogCancel render={<Button variant="outline" />}>Cancel</AlertDialogCancel>
                         <AlertDialogAction render={<Button variant="destructive" onClick={async () => { await supabase.from("weight_log").update({ deleted_at: new Date().toISOString() }).eq("id", r.id); qc.invalidateQueries({ queryKey: ["weight"] }); }} />}>Delete</AlertDialogAction>
                       </div>
                     </AlertDialogContent>
                   </AlertDialog>
                 </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="blood-panel" className="pt-4">
          {!panelReadings?.length ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No blood panel readings yet. Add your lab results to track cholesterol, HbA1c, and other markers over time.</CardContent></Card>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="whitespace-nowrap">Date</TableHead>
                    {panelFields.map((f) => (
                      <TableHead key={f.key} className="whitespace-nowrap">
                        <div>{f.label}</div>
                        <div className="text-xs font-normal text-muted-foreground">{f.range}</div>
                      </TableHead>
                    ))}
                    <TableHead className="w-16" />
                  </TableRow>
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={panelFields.length + 2} className="text-xs text-muted-foreground">
                      <span className="flex items-center gap-3">
                        <span>▲ <span className="text-red-600 dark:text-red-400">High</span></span>
                        <span>▼ <span className="text-red-600 dark:text-red-400">Low</span></span>
                        <span>✓ <span className="text-green-600 dark:text-green-400">Normal</span></span>
                        <span>⚠ <span className="text-amber-600 dark:text-amber-400">Borderline</span></span>
                      </span>
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {panelReadings.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{r.reading_date}</TableCell>
                      {panelFields.map((f) => {
                        const val = r[f.key as keyof typeof r] as number | null;
                        const level = getPanelLevel(val, f.key);
                        return (
                          <TableCell key={f.key} className="whitespace-nowrap">
                            {val != null ? (
                              <span className={cn("font-medium", level ? panelLevelColors[level] : "")} title={level ? `${f.label}: ${val} ${f.unit} — ${panelStatusLabels[level]}` : undefined} aria-label={level ? `${f.label}: ${val} ${f.unit} — ${panelStatusLabels[level]}` : undefined}>
                                {level && <span aria-hidden="true">{panelStatusIcons[level]} </span>}
                                {val} <span className="text-xs text-muted-foreground">{f.unit}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="whitespace-nowrap">
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Edit blood panel"
                            onClick={() => {
                              setEditId(r.id);
                              setEditType("panel");
                              setPanelForm({
                                reading_date: r.reading_date,
                                s_chol: r.s_chol?.toString() ?? "",
                                s_tag: r.s_tag?.toString() ?? "",
                                s_hdl: r.s_hdl?.toString() ?? "",
                                non_hdl: r.non_hdl?.toString() ?? "",
                                s_ck: r.s_ck?.toString() ?? "",
                                b_hba1c_dc: r.b_hba1c_dc?.toString() ?? "",
                                b_hba1c_if: r.b_hba1c_if?.toString() ?? "",
                                notes: r.notes ?? "",
                              });
                              setEditOpen(true);
                            }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Delete blood panel"><Trash2 className="h-3.5 w-3.5" /></Button>} />
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Blood Panel Reading</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this blood panel reading? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="flex justify-end gap-2">
                                <AlertDialogCancel render={<Button variant="outline" />}>Cancel</AlertDialogCancel>
                                <AlertDialogAction render={<Button variant="destructive" onClick={async () => { await supabase.from("blood_panel").update({ deleted_at: new Date().toISOString() }).eq("id", r.id); qc.invalidateQueries({ queryKey: ["blood-panel"] }); }} />}>Delete</AlertDialogAction>
                              </div>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
