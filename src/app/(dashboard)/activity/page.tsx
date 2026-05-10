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
import { Plus, ClipboardList, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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
      onSuccess: () => { toast.success("Entry added"); setOpen(false); setSteps(""); setCalories(""); setNotes(""); },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold tracking-tight">Activity</h1><p className="text-muted-foreground">Log your daily activity</p></div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSteps(""); setCalories(""); setNotes(""); } }}>
          <DialogTrigger className={buttonVariants({ variant: "default" })}><Plus className="mr-2 h-4 w-4" />Log Activity</DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log Activity</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Steps</Label><Input type="number" value={steps} onChange={(e) => setSteps(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Calories Burned (optional)</Label><Input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} /></div>
              <div className="space-y-2"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
              <Button type="submit" className="w-full" disabled={createEntry.isPending}>Save</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : !entries?.length ? (
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <ClipboardList className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No activity logged yet.</p>
          <Button variant="outline" onClick={() => setOpen(true)}>Log your first activity</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{e.steps.toLocaleString()} steps</p>
                  <p className="text-xs text-muted-foreground">{e.entry_date}{e.calories_burned && ` | ${e.calories_burned} cal`}</p>
                  {e.notes && <p className="text-xs text-muted-foreground mt-1">{e.notes}</p>}
                </div>
                  <AlertDialog>
                    <AlertDialogTrigger render={<Button variant="ghost" size="icon" aria-label="Delete activity entry"><Trash2 className="h-4 w-4" /></Button>} />
                   <AlertDialogContent>
                     <AlertDialogHeader>
                       <AlertDialogTitle>Delete Activity Entry</AlertDialogTitle>
                       <AlertDialogDescription>
                         Are you sure you want to delete this activity entry? This action cannot be undone.
                       </AlertDialogDescription>
                     </AlertDialogHeader>
                     <div className="flex justify-end gap-2">
                        <AlertDialogCancel render={<Button variant="outline" />}>Cancel</AlertDialogCancel>
                        <AlertDialogAction render={<Button variant="destructive" onClick={() => deleteEntry.mutate(e.id)} />}>Delete</AlertDialogAction>
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
