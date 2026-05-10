"use client";

import { useState } from "react";
import { useBloodSugarReadings, useCreateBloodSugar, useUpdateBloodSugar, useDeleteBloodSugar } from "@/features/blood-sugar/hooks";
import { bloodSugarSchema, type BloodSugarFormData, mealSlotLabels } from "@/features/blood-sugar/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Activity, Pencil, Trash2, ChevronRight, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { summarizeBloodSugar } from "@/features/vitals/summary";
import { SummaryCard } from "@/components/vitals/SummaryCard";
import type { BloodSugar } from "@/types/database";

const MEAL_SLOT_ORDER: string[] = [
  "before_breakfast",
  "after_breakfast",
  "before_lunch",
  "after_lunch",
  "before_dinner",
  "after_dinner",
];

export default function BloodSugarPage() {
  const { data: readings, isLoading, error, refetch } = useBloodSugarReadings();
  const createReading = useCreateBloodSugar();
  const updateReading = useUpdateBloodSugar();
  const deleteReading = useDeleteBloodSugar();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BloodSugarFormData>({
    reading_date: format(new Date(), "yyyy-MM-dd"),
    reading_time: format(new Date(), "HH:mm"),
    meal_slot: "before_breakfast",
    level_mgdl: 0,
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function resetForm() {
    setForm({
      reading_date: format(new Date(), "yyyy-MM-dd"),
      reading_time: format(new Date(), "HH:mm"),
      meal_slot: "before_breakfast",
      level_mgdl: 0,
      notes: "",
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const result = bloodSugarSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])));
      return;
    }

    createReading.mutate(result.data, {
      onSuccess: () => {
        toast.success("Reading added");
        setOpen(false);
        resetForm();
      },
      onError: (err) => toast.error(err.message),
    });
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const result = bloodSugarSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])));
      return;
    }

    if (!editingId) return;

    updateReading.mutate(
      { id: editingId, ...result.data },
      {
        onSuccess: () => {
          toast.success("Reading updated");
          setEditOpen(false);
          setEditingId(null);
          resetForm();
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function openEdit(r: { id: string; reading_date: string; reading_time: string | null; meal_slot: string; level_mgdl: number; notes: string | null }) {
    setEditingId(r.id);
    setForm({
      reading_date: r.reading_date,
      reading_time: r.reading_time ?? "",
      meal_slot: r.meal_slot as BloodSugarFormData["meal_slot"],
      level_mgdl: r.level_mgdl,
      notes: r.notes ?? "",
    });
    setEditOpen(true);
  }

  function getLevelColor(level: number) {
    if (level < 70) return "destructive";
    if (level > 140) return "destructive";
    return "default";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Blood Sugar</h1>
          <p className="text-muted-foreground">Track your blood sugar readings</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm({ reading_date: format(new Date(), "yyyy-MM-dd"), reading_time: format(new Date(), "HH:mm"), meal_slot: "before_breakfast", level_mgdl: 0, notes: "" }); }}>
          <DialogTrigger className={buttonVariants({ variant: "default" })}>
            <Plus className="mr-2 h-4 w-4" />Add Reading
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Blood Sugar Reading</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" value={form.reading_date} onChange={(e) => setForm({ ...form, reading_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input id="time" type="time" value={form.reading_time} onChange={(e) => setForm({ ...form, reading_time: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meal_slot">Meal Slot</Label>
                <Select value={form.meal_slot} onValueChange={(v) => v && setForm({ ...form, meal_slot: v as BloodSugarFormData["meal_slot"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(mealSlotLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">Level (mg/dL)</Label>
                <Input id="level" type="number" value={form.level_mgdl || ""} onChange={(e) => setForm({ ...form, level_mgdl: Number(e.target.value) })} />
                {errors.level_mgdl && <p className="text-sm text-destructive">{errors.level_mgdl}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={createReading.isPending}>
                {createReading.isPending ? "Saving..." : "Save Reading"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) { setEditingId(null); resetForm(); } }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Blood Sugar Reading</DialogTitle></DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-date">Date</Label>
                  <Input id="edit-date" type="date" value={form.reading_date} onChange={(e) => setForm({ ...form, reading_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-time">Time</Label>
                  <Input id="edit-time" type="time" value={form.reading_time} onChange={(e) => setForm({ ...form, reading_time: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-meal_slot">Meal Slot</Label>
                <Select value={form.meal_slot} onValueChange={(v) => v && setForm({ ...form, meal_slot: v as BloodSugarFormData["meal_slot"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(mealSlotLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-level">Level (mg/dL)</Label>
                <Input id="edit-level" type="number" value={form.level_mgdl || ""} onChange={(e) => setForm({ ...form, level_mgdl: Number(e.target.value) })} />
                {errors.level_mgdl && <p className="text-sm text-destructive">{errors.level_mgdl}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea id="edit-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={updateReading.isPending}>
                {updateReading.isPending ? "Saving..." : "Update Reading"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {readings && readings.length > 0 && (
        <SummaryCard summary={summarizeBloodSugar(readings[0].level_mgdl, readings[0].meal_slot, readings.length > 1 ? readings[1] : undefined)} />
      )}

      {error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-destructive font-medium">Failed to load readings</p>
            <p className="text-sm text-muted-foreground">There was an error fetching your blood sugar data. Please try again.</p>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />Retry
            </Button>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((group) => (
            <div key={group}>
              <div className="h-6 w-48 bg-muted rounded animate-pulse mb-3" />
              <div className="space-y-2">
                {[1, 2].map((card) => (
                  <Card key={card}>
                    <CardContent className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-4">
                        <div className="h-8 w-14 bg-muted rounded animate-pulse" />
                        <div className="space-y-1.5">
                          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                          <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <div className="h-8 w-8 bg-muted rounded animate-pulse" />
                        <div className="h-8 w-8 bg-muted rounded animate-pulse" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : !readings?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Activity className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No readings recorded yet.</p>
            <Button variant="outline" onClick={() => setOpen(true)}>Add your first reading</Button>
          </CardContent>
        </Card>
      ) : (() => {
        const grouped: Record<string, BloodSugar[]> = readings.reduce((acc: Record<string, BloodSugar[]>, r: BloodSugar) => {
          const date = r.reading_date;
          if (!acc[date]) acc[date] = [];
          acc[date].push(r);
          return acc;
        }, {} as Record<string, BloodSugar[]>);

        const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

        sortedDates.forEach((date) => {
          const entries = grouped[date];
          if (!entries) return;
          entries.sort((a, b) => {
            const aIdx = MEAL_SLOT_ORDER.indexOf(a.meal_slot);
            const bIdx = MEAL_SLOT_ORDER.indexOf(b.meal_slot);
            if (aIdx !== bIdx) return aIdx - bIdx;
            return (a.reading_time ?? "").localeCompare(b.reading_time ?? "");
          });
        });

        return (
          <div className="space-y-6">
            {sortedDates.map((date) => (
              <div key={date}>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  {format(new Date(date), "MMMM d, yyyy")}
                </h2>
                <div className="space-y-2">
                  {grouped[date].map((r) => (
                    <Card key={r.id}>
                      <CardContent className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-4">
                          <Badge variant={getLevelColor(r.level_mgdl) as "default" | "destructive"} className="text-base px-3 py-1 min-w-[3.5rem] justify-center">
                            {r.level_mgdl}
                          </Badge>
                          <div>
                            <p className="text-sm font-medium">{mealSlotLabels[r.meal_slot]}</p>
                            <p className="text-xs text-muted-foreground">
                              {r.reading_time && `at ${r.reading_time.slice(0, 5)}`}
                            </p>
                            {r.notes && <p className="text-xs text-muted-foreground mt-1">{r.notes}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" aria-label="Edit reading" onClick={() => openEdit(r)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger render={<Button variant="ghost" size="icon" aria-label="Delete reading"><Trash2 className="h-4 w-4" /></Button>} />
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Reading</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this blood sugar reading? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="flex justify-end gap-2">
                                <AlertDialogCancel render={<Button variant="outline" />}>Cancel</AlertDialogCancel>
                                <AlertDialogAction render={<Button variant="destructive" onClick={() => deleteReading.mutate(r.id)} />}>Delete</AlertDialogAction>
                              </div>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
