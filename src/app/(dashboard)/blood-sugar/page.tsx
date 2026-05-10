"use client";

import { useState } from "react";
import { useBloodSugarReadings, useCreateBloodSugar, useDeleteBloodSugar } from "@/features/blood-sugar/hooks";
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
import { Plus, Activity, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function BloodSugarPage() {
  const { data: readings, isLoading } = useBloodSugarReadings();
  const createReading = useCreateBloodSugar();
  const deleteReading = useDeleteBloodSugar();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BloodSugarFormData>({
    reading_date: format(new Date(), "yyyy-MM-dd"),
    reading_time: format(new Date(), "HH:mm"),
    meal_slot: "before_breakfast",
    level_mgdl: 0,
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

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
        setForm({ ...form, level_mgdl: 0, notes: "" });
      },
      onError: (err) => toast.error(err.message),
    });
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
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !readings?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Activity className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No readings recorded yet.</p>
            <Button variant="outline" onClick={() => setOpen(true)}>Add your first reading</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {readings.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <Badge variant={getLevelColor(r.level_mgdl) as "default" | "destructive"} className="text-base px-3 py-1">
                    {r.level_mgdl}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">{mealSlotLabels[r.meal_slot]}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.reading_date} {r.reading_time && `at ${r.reading_time}`}
                    </p>
                    {r.notes && <p className="text-xs text-muted-foreground mt-1">{r.notes}</p>}
                  </div>
                </div>
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
