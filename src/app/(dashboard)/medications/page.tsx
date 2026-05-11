"use client";

import { useState } from "react";
import { useMedications, useCreateMedication, useUpdateMedication, useToggleMedication, useDeleteMedication, useTodayIntake, useLogIntake } from "@/features/medications/hooks";
import { medicationSchema, type MedicationFormData } from "@/features/medications/schema";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pill, Pencil, Trash2, Package, Check, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Medication } from "@/types/database";

const timeOfDayOptions = [
  { value: "morning" as const, label: "Morning" },
  { value: "afternoon" as const, label: "Afternoon" },
  { value: "evening" as const, label: "Evening" },
];

const timeOfDayLabels: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

const typeLabels: Record<string, string> = {
  tablet: "Tablet",
  liquid: "Liquid",
  injection: "Injection",
};

interface FormState {
  name: string; type: "tablet" | "liquid" | "injection";
  strength: string; time_of_day: string[]; is_active: boolean;
  active_substance: string; stock_count: string; ai_summary: string;
}

export default function MedicationsPage() {
  const { data: medications, isLoading } = useMedications();
  const createMedication = useCreateMedication();
  const updateMedication = useUpdateMedication();
  const toggleMedication = useToggleMedication();
  const deleteMedication = useDeleteMedication();
  const { data: todayIntake } = useTodayIntake();
  const logIntake = useLogIntake();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    name: "", type: "tablet", strength: "",
    time_of_day: ["morning"], is_active: true,
    active_substance: "", stock_count: "", ai_summary: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function toPayload(f: FormState): MedicationFormData {
    return {
      name: f.name, type: f.type, strength: f.strength,
      time_of_day: f.time_of_day as ("morning" | "afternoon" | "evening")[],
      is_active: f.is_active,
      active_substance: f.active_substance,
      stock_count: f.stock_count === "" ? undefined : Number(f.stock_count),
      ai_summary: f.ai_summary,
    };
  }

  const emptyForm: FormState = {
    name: "", type: "tablet", strength: "",
    time_of_day: ["morning"], is_active: true,
    active_substance: "", stock_count: "", ai_summary: "",
  };

  function resetForm() { setForm(emptyForm); setErrors({}); }

  function validate() {
    const payload = toPayload(form);
    const result = medicationSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors(
        Object.fromEntries(
          Object.entries(fieldErrors).map(([key, val]) => [key, val?.[0] ?? ""])
        )
      );
      return null;
    }
    return result.data;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const data = validate();
    if (!data) return;

    createMedication.mutate(data, {
      onSuccess: () => {
        toast.success("Medication added");
        setOpen(false);
        resetForm();
      },
      onError: () => toast.error("Something went wrong. Please try again."),
    });
  }

  function openEdit(med: Medication) {
    setEditingId(med.id);
    setForm({
      name: med.name,
      type: med.type as "tablet" | "liquid" | "injection",
      strength: med.strength,
      time_of_day: med.time_of_day as ("morning" | "afternoon" | "evening")[],
      is_active: med.is_active,
      active_substance: med.active_substance ?? "",
      stock_count: med.stock_count?.toString() ?? "",
      ai_summary: med.ai_summary ?? "",
    });
    setErrors({});
    setEditOpen(true);
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const data = validate();
    if (!data || !editingId) return;

    updateMedication.mutate({ id: editingId, ...data }, {
      onSuccess: () => {
        toast.success("Medication updated");
        setEditOpen(false);
        setEditingId(null);
        resetForm();
      },
      onError: () => toast.error("Something went wrong. Please try again."),
    });
  }

  function MedicationFormFields() {
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor="med-name">Name</Label>
          <Input id="med-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="med-type">Type</Label>
          <Select value={form.type} onValueChange={(v) => v && setForm({ ...form, type: v as "tablet" | "liquid" | "injection" })}>
            <SelectTrigger id="med-type"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(typeLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="med-strength">Strength</Label>
          <Input id="med-strength" placeholder="e.g. 80 mg" value={form.strength} onChange={(e) => setForm({ ...form, strength: e.target.value })} />
          {errors.strength && <p className="text-sm text-destructive">{errors.strength}</p>}
        </div>
        <div className="space-y-2">
          <Label>Time of Day</Label>
          <div className="flex flex-wrap gap-4">
            {timeOfDayOptions.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={form.time_of_day.includes(value)}
                  onCheckedChange={() =>
                    setForm({
                      ...form,
                      time_of_day: form.time_of_day.includes(value)
                        ? form.time_of_day.filter((t) => t !== value)
                        : [...form.time_of_day, value],
                    })
                  }
                />
                {label}
              </label>
            ))}
          </div>
          {errors.time_of_day && <p className="text-sm text-destructive">{errors.time_of_day}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="med-substance">Active Substance</Label>
          <Input id="med-substance" placeholder="e.g. Metformin" value={form.active_substance ?? ""} onChange={(e) => setForm({ ...form, active_substance: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="med-stock">Stock Count</Label>
          <Input id="med-stock" type="number" min="0" placeholder="0" value={form.stock_count} onChange={(e) => setForm({ ...form, stock_count: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="med-summary">AI Summary</Label>
          <Textarea id="med-summary" placeholder="AI-generated summary..." rows={3} value={form.ai_summary ?? ""} onChange={(e) => setForm({ ...form, ai_summary: e.target.value })} />
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header-bg rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Medications</h1>
            <p className="text-muted-foreground">Manage your medications</p>
          </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger className={buttonVariants({ variant: "default" })}>
            <Plus className="mr-2 h-4 w-4" />
            Add Medication
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Medication</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <MedicationFormFields />
              <Button type="submit" className="w-full" disabled={createMedication.isPending}>
                {createMedication.isPending ? "Adding..." : "Add Medication"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) { setEditingId(null); resetForm(); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Medication</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <MedicationFormFields />
              <Button type="submit" className="w-full" disabled={updateMedication.isPending}>
                {updateMedication.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      </div>

      {!isLoading && medications && medications.some((m) => m.is_active) && (
        <Card>
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Today&apos;s Log</CardTitle>
              <span className="text-sm text-muted-foreground">
                {(() => {
                  const totalSlots = medications
                    .filter((m) => m.is_active)
                    .reduce((sum, m) => sum + m.time_of_day.length, 0);
                  const done = todayIntake?.filter((i) => i.status === "taken").length ?? 0;
                  const skipped = todayIntake?.filter((i) => i.status === "skipped").length ?? 0;
                  const skippedText = skipped > 0 ? ` + ${skipped} skipped` : "";
                  return `${done} of ${totalSlots} taken${skippedText}`;
                })()}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {medications
              .filter((m) => m.is_active)
              .map((med) => (
                <div
                  key={med.id}
                  className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{med.name}</p>
                    <p className="text-xs text-muted-foreground">{med.strength} - {med.time_of_day.length}x daily</p>
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

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1,2,3].map(i => <Card key={i}><CardHeader><div className="h-5 w-32 animate-pulse bg-muted rounded" /></CardHeader><CardContent><div className="h-4 w-48 animate-pulse bg-muted rounded" /></CardContent></Card>)}
        </div>
      ) : !medications?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Pill className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground font-medium">No medications added yet</p>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Add your medications to track doses, set reminders, and log daily intake. Keeping a complete medication list also helps during doctor visits.
            </p>
            <Button variant="outline" onClick={() => setOpen(true)}>Add your first medication</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="rounded-lg bg-accent/30 px-3 py-2">
              <span className="font-medium">{medications.length}</span> total
            </div>
            <div className="rounded-lg bg-accent/30 px-3 py-2">
              <span className="font-medium">{medications.filter((m) => m.is_active).length}</span> active
            </div>
            <div className="rounded-lg bg-accent/30 px-3 py-2">
              <span className="font-medium">{medications.filter((m) => m.stock_count != null && m.stock_count <= 5).length}</span> need refill
            </div>
            <div className="rounded-lg bg-green-100 dark:bg-green-900/20 px-3 py-2">
              <span className="font-medium">{todayIntake?.filter((i) => i.status === "taken").length ?? 0}</span> taken today
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {medications.map((med, i) => (
            <Card key={med.id} className={cn("animate-fade-in", !med.is_active && "opacity-70")} style={{ animationDelay: `${i * 60}ms` }}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">{med.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{med.strength} - {typeLabels[med.type]}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit medication" onClick={() => openEdit(med)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger render={<Button variant="ghost" size="icon" aria-label="Delete medication"><Trash2 className="h-4 w-4" /></Button>} />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Medication</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this medication? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="flex justify-end gap-2">
                          <AlertDialogCancel render={<Button variant="outline" />}>Cancel</AlertDialogCancel>
                          <AlertDialogAction render={<Button variant="destructive" onClick={() => deleteMedication.mutate(med.id)} />}>Delete</AlertDialogAction>
                        </div>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex flex-wrap gap-1">
                    {(med.time_of_day ?? []).map((t: string) => (
                      <Badge key={t} variant="outline" className="text-xs">{timeOfDayLabels[t]}</Badge>
                    ))}
                  </div>
                  <Button
                    variant={med.is_active ? "default" : "outline"}
                    size="sm"
                    className={cn(!med.is_active && "opacity-60")}
                    onClick={() => toggleMedication.mutate({ id: med.id, is_active: !med.is_active })}
                  >
                    {med.is_active ? "Active" : "Inactive"}
                  </Button>
                </div>
                {med.active_substance && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Substance:</span> {med.active_substance}
                  </p>
                )}
                {med.stock_count != null && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Package className="h-3 w-3" />
                    Stock: {med.stock_count}
                    {med.stock_count <= 5 && (
                      <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0 h-4">Refill soon</Badge>
                    )}
                  </p>
                )}
                {med.ai_summary && (
                  <div className="rounded-lg bg-accent/30 p-2.5 border border-accent/50">
                    <p className="text-xs font-medium text-accent-foreground mb-0.5">AI Summary</p>
                    <p className="text-xs text-muted-foreground line-clamp-3">{med.ai_summary}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </>)}
    </div>
  );
}