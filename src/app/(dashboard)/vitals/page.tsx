"use client";

import { useState } from "react";
import { useBloodPressureReadings, useCreateBloodPressure, useHba1cReadings, useCreateHba1c, useWeightReadings, useCreateWeight } from "@/features/vitals/hooks";
import { createClient } from "@/lib/supabase/client";
import { bloodPressureSchema, hba1cSchema, weightSchema, type BloodPressureFormData, type Hba1cFormData, type WeightFormData } from "@/features/vitals/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { Plus, Heart, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

const dateStr = format(new Date(), "yyyy-MM-dd");

const supabase = createClient();

export default function VitalsPage() {
  const { data: bpReadings } = useBloodPressureReadings();
  const { data: hba1cReadings } = useHba1cReadings();
  const { data: weightReadings } = useWeightReadings();
  const createBP = useCreateBloodPressure();
  const createHba1c = useCreateHba1c();
  const createWeight = useCreateWeight();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("blood-pressure");

  const [bpForm, setBpForm] = useState<BloodPressureFormData>({ reading_date: dateStr, reading_time: "", systolic: 120, diastolic: 80, heart_rate: null, notes: "" });
  const [hba1cForm, setHba1cForm] = useState<Hba1cFormData>({ reading_date: dateStr, percentage: 5.7, notes: "" });
  const [weightForm, setWeightForm] = useState<WeightFormData>({ reading_date: dateStr, weight_kg: 70, notes: "" });
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
    createBP.mutate(result.data, {
      onSuccess: () => { toast.success("Reading saved"); setOpen(false); },
      onError: (err) => toast.error(err.message),
    });
  }

  function handleSubmitHba1c(e: React.FormEvent) {
    e.preventDefault();
    const result = hba1cSchema.safeParse(hba1cForm);
    if (!result.success) { toast.error("Invalid values"); return; }
    createHba1c.mutate(result.data, {
      onSuccess: () => { toast.success("HbA1c saved"); setOpen(false); },
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vitals</h1>
          <p className="text-muted-foreground">Track blood pressure, HbA1c, and weight</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className={buttonVariants({ variant: "default" })}><Plus className="mr-2 h-4 w-4" />Add Reading</DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Vitals Reading</DialogTitle></DialogHeader>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="blood-pressure">BP</TabsTrigger>
                <TabsTrigger value="hba1c">HbA1c</TabsTrigger>
                <TabsTrigger value="weight">Weight</TabsTrigger>
              </TabsList>
              <TabsContent value="blood-pressure">
                <form onSubmit={handleSubmitBP} className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Systolic</Label><Input type="number" value={bpForm.systolic} onChange={(e) => setBpForm({ ...bpForm, systolic: Number(e.target.value) })} /></div>
                    <div className="space-y-2"><Label>Diastolic</Label><Input type="number" value={bpForm.diastolic} onChange={(e) => setBpForm({ ...bpForm, diastolic: Number(e.target.value) })} /></div>
                  </div>
                  <div className="space-y-2"><Label>Heart Rate (optional)</Label><Input type="number" value={bpForm.heart_rate ?? ""} onChange={(e) => setBpForm({ ...bpForm, heart_rate: e.target.value ? Number(e.target.value) : null })} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Date</Label><Input type="date" value={bpForm.reading_date} onChange={(e) => setBpForm({ ...bpForm, reading_date: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Time</Label><Input type="time" value={bpForm.reading_time} onChange={(e) => setBpForm({ ...bpForm, reading_time: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label>Notes</Label><Textarea value={bpForm.notes} onChange={(e) => setBpForm({ ...bpForm, notes: e.target.value })} /></div>
                  <Button type="submit" className="w-full" disabled={createBP.isPending}>Save</Button>
                </form>
              </TabsContent>
              <TabsContent value="hba1c">
                <form onSubmit={handleSubmitHba1c} className="space-y-4 pt-4">
                  <div className="space-y-2"><Label>HbA1c (%)</Label><Input type="number" step="0.1" value={hba1cForm.percentage} onChange={(e) => setHba1cForm({ ...hba1cForm, percentage: Number(e.target.value) })} /></div>
                  <div className="space-y-2"><Label>Date</Label><Input type="date" value={hba1cForm.reading_date} onChange={(e) => setHba1cForm({ ...hba1cForm, reading_date: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Notes</Label><Textarea value={hba1cForm.notes} onChange={(e) => setHba1cForm({ ...hba1cForm, notes: e.target.value })} /></div>
                  <Button type="submit" className="w-full" disabled={createHba1c.isPending}>Save</Button>
                </form>
              </TabsContent>
              <TabsContent value="weight">
                <form onSubmit={handleSubmitWeight} className="space-y-4 pt-4">
                  <div className="space-y-2"><Label>Weight (kg)</Label><Input type="number" step="0.1" value={weightForm.weight_kg} onChange={(e) => setWeightForm({ ...weightForm, weight_kg: Number(e.target.value) })} /></div>
                  <div className="space-y-2"><Label>Date</Label><Input type="date" value={weightForm.reading_date} onChange={(e) => setWeightForm({ ...weightForm, reading_date: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Notes</Label><Textarea value={weightForm.notes} onChange={(e) => setWeightForm({ ...weightForm, notes: e.target.value })} /></div>
                  <Button type="submit" className="w-full" disabled={createWeight.isPending}>Save</Button>
                </form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="blood-pressure">Blood Pressure</TabsTrigger>
          <TabsTrigger value="hba1c">HbA1c</TabsTrigger>
          <TabsTrigger value="weight">Weight</TabsTrigger>
        </TabsList>
        <TabsContent value="blood-pressure" className="space-y-3 pt-4">
          {!bpReadings?.length ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No blood pressure readings yet.</CardContent></Card>
          ) : bpReadings.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-bold">{r.systolic}/{r.diastolic} <span className="text-sm font-normal text-muted-foreground">mmHg</span></p>
                  <p className="text-xs text-muted-foreground">{r.reading_date}{r.heart_rate && ` | HR: ${r.heart_rate} bpm`}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={async () => { await supabase.from("blood_pressure").update({ deleted_at: new Date().toISOString() }).eq("id", r.id); qc.invalidateQueries({ queryKey: ["blood-pressure"] }); }}><Trash2 className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="hba1c" className="space-y-3 pt-4">
          {!hba1cReadings?.length ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No HbA1c readings yet.</CardContent></Card>
          ) : hba1cReadings.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-bold">{r.percentage}%</p>
                  <p className="text-xs text-muted-foreground">{r.reading_date}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={async () => { await supabase.from("hba1c").update({ deleted_at: new Date().toISOString() }).eq("id", r.id); qc.invalidateQueries({ queryKey: ["hba1c"] }); }}><Trash2 className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="weight" className="space-y-3 pt-4">
          {!weightReadings?.length ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No weight readings yet.</CardContent></Card>
          ) : weightReadings.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-bold">{r.weight_kg} kg</p>
                  <p className="text-xs text-muted-foreground">{r.reading_date}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={async () => { await supabase.from("weight_log").update({ deleted_at: new Date().toISOString() }).eq("id", r.id); qc.invalidateQueries({ queryKey: ["weight"] }); }}><Trash2 className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
