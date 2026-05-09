"use client";

import { useState } from "react";
import { useMedications, useCreateMedication, useUpdateMedication, useToggleMedication, useDeleteMedication } from "@/features/medications/hooks";
import { medicationSchema, type MedicationFormData } from "@/features/medications/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { Plus, Pill, Pencil, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
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

export default function MedicationsPage() {
  const { data: medications, isLoading } = useMedications();
  const createMedication = useCreateMedication();
  const updateMedication = useUpdateMedication();
  const toggleMedication = useToggleMedication();
  const deleteMedication = useDeleteMedication();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MedicationFormData>({
    name: "",
    type: "tablet",
    strength: "",
    time_of_day: ["morning"],
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const emptyForm: MedicationFormData = {
    name: "", type: "tablet", strength: "",
    time_of_day: ["morning"], is_active: true,
  };

  function resetForm() { setForm(emptyForm); setErrors({}); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const result = medicationSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors(
        Object.fromEntries(
          Object.entries(fieldErrors).map(([key, val]) => [key, val?.[0] ?? ""])
        )
      );
      return;
    }

    createMedication.mutate(result.data, {
      onSuccess: () => {
        toast.success("Medication added");
        setOpen(false);
        resetForm();
      },
      onError: (err) => toast.error(err.message),
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
      product_links: med.product_links ?? "",
      ai_summary: med.ai_summary ?? "",
    });
    setErrors({});
    setEditOpen(true);
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const result = medicationSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors(
        Object.fromEntries(
          Object.entries(fieldErrors).map(([key, val]) => [key, val?.[0] ?? ""])
        )
      );
      return;
    }

    if (!editingId) return;
    updateMedication.mutate({ id: editingId, ...result.data }, {
      onSuccess: () => {
        toast.success("Medication updated");
        setEditOpen(false);
        setEditingId(null);
        resetForm();
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Medications</h1>
          <p className="text-muted-foreground">Manage your medications</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className={buttonVariants({ variant: "default" })}>
            <Plus className="mr-2 h-4 w-4" />
            Add Medication
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Medication</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={form.type} onValueChange={(v) => v && setForm({ ...form, type: v as "tablet" | "liquid" | "injection" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="strength">Strength</Label>
                <Input id="strength" placeholder="e.g. 80 mg" value={form.strength} onChange={(e) => setForm({ ...form, strength: e.target.value })} />
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
                <Label htmlFor="active_substance">Active Substance</Label>
                <Input id="active_substance" placeholder="e.g. Metformin" value={form.active_substance ?? ""} onChange={(e) => setForm({ ...form, active_substance: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product_links">Product Links</Label>
                <Input id="product_links" placeholder="https://..." value={form.product_links ?? ""} onChange={(e) => setForm({ ...form, product_links: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai_summary">AI Summary</Label>
                <Textarea id="ai_summary" placeholder="AI-generated summary..." rows={3} value={form.ai_summary ?? ""} onChange={(e) => setForm({ ...form, ai_summary: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={createMedication.isPending}>
                {createMedication.isPending ? "Adding..." : "Add Medication"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) { setEditingId(null); resetForm(); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Medication</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type">Type</Label>
                <Select value={form.type} onValueChange={(v) => v && setForm({ ...form, type: v as "tablet" | "liquid" | "injection" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-strength">Strength</Label>
                <Input id="edit-strength" placeholder="e.g. 80 mg" value={form.strength} onChange={(e) => setForm({ ...form, strength: e.target.value })} />
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
                <Label htmlFor="edit-active_substance">Active Substance</Label>
                <Input id="edit-active_substance" placeholder="e.g. Metformin" value={form.active_substance ?? ""} onChange={(e) => setForm({ ...form, active_substance: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-product_links">Product Links</Label>
                <Input id="edit-product_links" placeholder="https://..." value={form.product_links ?? ""} onChange={(e) => setForm({ ...form, product_links: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ai_summary">AI Summary</Label>
                <Textarea id="edit-ai_summary" placeholder="AI-generated summary..." rows={3} value={form.ai_summary ?? ""} onChange={(e) => setForm({ ...form, ai_summary: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={updateMedication.isPending}>
                {updateMedication.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !medications?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Pill className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No medications added yet.</p>
            <Button variant="outline" onClick={() => setOpen(true)}>Add your first medication</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {medications.map((med) => (
            <Card key={med.id} className={med.is_active ? "" : "opacity-60"}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{med.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{med.strength} — {typeLabels[med.type]}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(med)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMedication.mutate(med.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex flex-wrap gap-1">
                    {(med.time_of_day ?? []).map((t: string) => (
                      <Badge key={t} variant="outline">{timeOfDayLabels[t]}</Badge>
                    ))}
                  </div>
                  <Button
                    variant={med.is_active ? "default" : "secondary"}
                    size="sm"
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
                {med.product_links && (
                  <a href={med.product_links} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <ExternalLink className="h-3 w-3" />
                    Product Link
                  </a>
                )}
                {med.ai_summary && (
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    <span className="font-medium">AI Summary:</span> {med.ai_summary}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
