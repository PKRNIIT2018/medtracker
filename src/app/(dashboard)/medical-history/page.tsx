"use client";

import { useState } from "react";
import { useMedicalHistory, useCreateMedicalEntry, useDeleteMedicalEntry } from "@/features/medical-history/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { Plus, ClipboardList, Trash2, Heart, Scissors, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { parseISO, format } from "date-fns";
import { cn } from "@/lib/utils";

const categoryMeta: Record<string, { label: string; variant: "default" | "secondary" | "destructive"; icon: React.ElementType }> = {
  condition: { label: "Condition", variant: "default", icon: Heart },
  surgery: { label: "Surgery", variant: "secondary", icon: Scissors },
  allergy: { label: "Allergy", variant: "destructive", icon: AlertTriangle },
};

export default function MedicalHistoryPage() {
  const { data: entries, isLoading } = useMedicalHistory();
  const createEntry = useCreateMedicalEntry();
  const deleteEntry = useDeleteMedicalEntry();

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("condition");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createEntry.mutate({ category, title, description: description || undefined, event_date: eventDate || undefined }, {
      onSuccess: () => { toast.success("Entry added"); setOpen(false); setTitle(""); setDescription(""); setEventDate(""); },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header-bg rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-3xl font-bold tracking-tight">Medical History</h1><p className="text-muted-foreground">Track conditions, surgeries, and allergies</p></div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setCategory("condition"); setTitle(""); setDescription(""); setEventDate(""); } }}>
            <DialogTrigger className={buttonVariants({ variant: "default" })}><Plus className="mr-2 h-4 w-4" />Add Entry</DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Medical Entry</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2"><Label>Category</Label>
                  <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryMeta).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                <div className="space-y-2"><Label>Date (optional)</Label><Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} /></div>
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
          <p className="text-muted-foreground text-center">No conditions, surgeries, or allergies recorded yet. Track your medical history to stay informed during doctor visits.</p>
          <Button variant="outline" onClick={() => setOpen(true)}>Add your first entry</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {entries.map((e) => {
            const meta = categoryMeta[e.category] ?? categoryMeta.condition;
            const Icon = meta.icon;
            return (
            <Card key={e.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center rounded-full bg-muted p-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                  <div>
                    <p className="font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.event_date ? format(parseISO(e.event_date), "MMM d, yyyy") : ""}
                      {e.description && ` — ${e.description}`}
                    </p>
                  </div>
                </div>
                 <AlertDialog>
                   <AlertDialogTrigger render={<Button variant="ghost" size="icon" aria-label="Delete entry"><Trash2 className="h-4 w-4" /></Button>} />
                   <AlertDialogContent>
                     <AlertDialogHeader>
                       <AlertDialogTitle>Delete Entry</AlertDialogTitle>
                       <AlertDialogDescription>
                         Are you sure you want to delete this medical history entry? This cannot be undone.
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
            );
          })}
        </div>
      )}
    </div>
  );
}
