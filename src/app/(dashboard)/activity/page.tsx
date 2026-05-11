"use client";

import { useState } from "react";
import { useActivityEntries, useCreateActivity, useDeleteActivity } from "@/features/activity/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { Plus, ClipboardList, Trash2, Footprints, Flame } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";

function formatDateHeader(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMM d");
}

function groupByDate(entries: { id: string; entry_date: string; steps: number; calories_burned: number | null; notes: string | null }[]) {
  const groups: { date: string; entries: typeof entries }[] = [];
  for (const e of entries) {
    const g = groups.find((g) => g.date === e.entry_date);
    if (g) g.entries.push(e);
    else groups.push({ date: e.entry_date, entries: [e] });
  }
  return groups;
}

export default function ActivityPage() {
  const { data: entries, isLoading } = useActivityEntries();
  const createEntry = useCreateActivity();
  const deleteEntry = useDeleteActivity();

  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState("");
  const [calories, setCalories] = useState("");
  const [notes, setNotes] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createEntry.mutate({
      steps: Number(steps),
      calories_burned: calories ? Number(calories) : null,
      notes: notes || undefined,
    }, {
      onSuccess: () => { toast.success("Activity logged"); setOpen(false); setSteps(""); setCalories(""); setNotes(""); },
      onError: (err) => toast.error(err.message),
    });
  }

  const grouped = entries ? groupByDate([...entries]) : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header-bg rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-3xl font-bold tracking-tight">Activity</h1><p className="text-muted-foreground">Track your daily steps and calories</p></div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSteps(""); setCalories(""); setNotes(""); } }}>
            <DialogTrigger className={buttonVariants({ variant: "default" })}><Plus className="mr-2 h-4 w-4" />Log Activity</DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Log Activity</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2"><Label>Steps</Label><Input type="number" min="0" value={steps} onChange={(e) => setSteps(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Calories Burned (optional, kcal)</Label><Input type="number" min="0" value={calories} onChange={(e) => setCalories(e.target.value)} /></div>
                <div className="space-y-2"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
                <Button type="submit" className="w-full" disabled={createEntry.isPending}>Save</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Card key={i}><CardContent className="h-16 animate-pulse bg-muted rounded-lg" /></Card>)}
        </div>
      ) : !entries?.length ? (
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <ClipboardList className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground text-center">No activity logged yet. Start tracking your steps and calories.</p>
          <Button variant="outline" onClick={() => setOpen(true)}>Log your first activity</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-6">
          <div className="bg-accent/30 border rounded-lg px-4 py-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{entries.reduce((s, e) => s + e.steps, 0).toLocaleString()}</span> total steps · <span className="font-medium text-foreground">{entries.reduce((s, e) => s + (e.calories_burned ?? 0), 0).toLocaleString()}</span> kcal burned (last 50 entries)
            </p>
          </div>
          {grouped.map(({ date, entries: dayEntries }) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-2 sticky top-0 bg-background py-1">{formatDateHeader(date)}</h2>
              <div className="space-y-2">
                {dayEntries.map((e) => (
                  <Card key={e.id}>
                    <CardContent className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-2xl font-bold leading-none">{e.steps.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground">steps</span>
                        </div>
                        {e.calories_burned != null && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 dark:bg-orange-900/30 px-2.5 py-1 text-xs font-medium text-orange-700 dark:text-orange-400">
                            <Flame className="h-3 w-3" />
                            {e.calories_burned.toLocaleString()} kcal
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {e.notes && <p className="text-xs text-muted-foreground max-w-32 truncate">{e.notes}</p>}
                        <AlertDialog>
                          <AlertDialogTrigger render={<Button variant="ghost" size="icon" aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>} />
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Activity Entry</AlertDialogTitle>
                              <AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="flex justify-end gap-2">
                              <AlertDialogCancel render={<Button variant="outline" />}>Cancel</AlertDialogCancel>
                              <AlertDialogAction render={<Button variant="destructive" onClick={() => deleteEntry.mutate(e.id)} />}>Delete</AlertDialogAction>
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
      )}
    </div>
  );
}


