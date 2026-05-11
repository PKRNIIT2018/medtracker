"use client";

import { useState } from "react";
import { useBloodSugarReadings, useCreateBloodSugar, useUpdateBloodSugar, useDeleteBloodSugar } from "@/features/blood-sugar/hooks";
import { bloodSugarSchema, type BloodSugarFormData, mealSlotLabels } from "@/features/blood-sugar/schema";
import { BloodSugarForm } from "@/features/blood-sugar/components/BloodSugarForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Activity, Pencil, Trash2, ChevronRight, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import { summarizeBloodSugar } from "@/features/vitals/summary";
import { SummaryCard } from "@/components/vitals/SummaryCard";
import { getSugarLevel, sugarBorderColors, sugarBadgeColors, sugarIconConfig } from "@/lib/vitals-colors";
import { cn } from "@/lib/utils";
import type { BloodSugar } from "@/types/database";

const MEAL_SLOT_ORDER: string[] = [
  "before_breakfast",
  "after_breakfast",
  "before_lunch",
  "after_lunch",
  "before_dinner",
  "after_dinner",
];

function formatDateHeader(date: string): string {
  if (isToday(parseISO(date))) return "Today";
  if (isYesterday(parseISO(date))) return "Yesterday";
  return format(parseISO(date), "MMMM d, yyyy");
}

function toastError(err: unknown) {
  console.error(err);
  toast.error("Something went wrong. Please try again.");
}

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

  function validate() {
    const result = bloodSugarSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])));
      return null;
    }
    setErrors({});
    return result.data;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = validate();
    if (!data) return;

    createReading.mutate(data, {
      onSuccess: () => {
        toast.success("Reading added");
        setOpen(false);
        resetForm();
      },
      onError: toastError,
    });
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = validate();
    if (!data || !editingId) return;

    updateReading.mutate(
      { id: editingId, ...data },
      {
        onSuccess: () => {
          toast.success("Reading updated");
          setEditOpen(false);
          setEditingId(null);
          resetForm();
        },
        onError: toastError,
      },
    );
  }

  function openEdit(r: BloodSugar) {
    setEditingId(r.id);
    setForm({
      reading_date: r.reading_date,
      reading_time: r.reading_time ?? "",
      meal_slot: r.meal_slot,
      level_mgdl: r.level_mgdl,
      notes: r.notes ?? "",
    });
    setEditOpen(true);
  }

  function StatusIcon({ status }: { status: string }) {
    const config = sugarIconConfig[status as keyof typeof sugarIconConfig];
    if (!config) return null;
    const Icon = config.icon;
    return <Icon className={`h-4 w-4 ${config.className}`} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header-bg rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Blood Sugar</h1>
            <p className="text-muted-foreground">Track your blood sugar readings</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger className={buttonVariants({ variant: "default" })}>
              <Plus className="mr-2 h-4 w-4" />Add Reading
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Blood Sugar Reading</DialogTitle></DialogHeader>
              <BloodSugarForm form={form} onChange={setForm} onSubmit={handleSubmit} errors={errors} isPending={createReading.isPending} submitLabel="Save Reading" />
            </DialogContent>
          </Dialog>

          <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) { setEditingId(null); resetForm(); } }}>
            <DialogContent>
              <DialogHeader><DialogTitle>Edit Blood Sugar Reading</DialogTitle></DialogHeader>
              <BloodSugarForm form={form} onChange={setForm} onSubmit={handleEditSubmit} errors={errors} isPending={updateReading.isPending} submitLabel="Update Reading" />
            </DialogContent>
          </Dialog>
        </div>
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
                      {formatDateHeader(date)}
                    </h2>
                    <div className="space-y-2">
                      {grouped[date].map((r) => {
                        const status = getSugarLevel(r.level_mgdl);
                        return (
                          <Card key={r.id} className={cn("border-l-4 pl-0", sugarBorderColors[status])}>
                            <CardContent className="flex items-center justify-between py-3">
                              <div className="flex items-center gap-3">
                                <span className={cn("inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-bold min-w-[3.5rem]", sugarBadgeColors[status])}>
                                  {r.level_mgdl}
                                </span>
                                <div>
                                  <p className="text-sm font-medium">{mealSlotLabels[r.meal_slot]}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {r.reading_time && format(parseISO("2000-01-01T" + r.reading_time), "h:mm a")}
                                  </p>
                                  {r.notes && <p className="text-xs text-muted-foreground mt-1">{r.notes}</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <StatusIcon status={status} />
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
                        );
                      })}
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
