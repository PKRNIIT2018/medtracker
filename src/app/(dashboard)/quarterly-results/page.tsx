"use client";

import { useState } from "react";
import { useQuarterlyResults, useCreateQuarterlyResult, useDeleteQuarterlyResult } from "@/features/quarterly-results/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FlaskConical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { parseISO, format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";

function formatDateHeader(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMM d, yyyy");
}

export default function QuarterlyResultsPage() {
  const { data: results, isLoading } = useQuarterlyResults();
  const createResult = useCreateQuarterlyResult();
  const deleteResult = useDeleteQuarterlyResult();

  const [open, setOpen] = useState(false);
  const [quarterLabel, setQuarterLabel] = useState("");
  const [resultDate, setResultDate] = useState("");
  const [notes, setNotes] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createResult.mutate({ quarter_label: quarterLabel, result_date: resultDate, notes: notes || undefined }, {
      onSuccess: () => { toast.success("Result batch added"); setOpen(false); setQuarterLabel(""); setResultDate(""); setNotes(""); },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold tracking-tight">Quarterly Results</h1><p className="text-muted-foreground">Lab test results organized by quarter</p></div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setQuarterLabel(""); setResultDate(""); setNotes(""); } }}>
          <DialogTrigger className={buttonVariants({ variant: "default" })}><Plus className="mr-2 h-4 w-4" />Add Batch</DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Quarterly Result Batch</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Quarter Label</Label><Input placeholder="e.g. Q1 2026" value={quarterLabel} onChange={(e) => setQuarterLabel(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={resultDate} onChange={(e) => setResultDate(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
              <Button type="submit" className="w-full" disabled={createResult.isPending}>Save</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2].map(i => <Card key={i}><CardContent className="p-0"><div className="h-48 animate-pulse bg-muted rounded-b-lg" /></CardContent></Card>)}
        </div>
      ) : !results?.length ? (
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <FlaskConical className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground text-center">No quarterly lab results yet. Add your bloodwork to track trends over time and share with your doctor.</p>
          <Button variant="outline" onClick={() => setOpen(true)}>Add your first batch</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-6">
          {results.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center rounded-full bg-primary/10 p-2">
                      <FlaskConical className="h-5 w-5 text-primary" />
                    </span>
                    <div>
                      <CardTitle className="text-lg">{r.quarter_label}</CardTitle>
                      <p className="text-sm text-muted-foreground">{formatDateHeader(r.result_date)}</p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger render={<Button variant="ghost" size="icon" aria-label="Delete batch"><Trash2 className="h-4 w-4" /></Button>} />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Batch</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this quarterly results batch? This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="flex justify-end gap-2">
                        <AlertDialogCancel render={<Button variant="outline" />}>Cancel</AlertDialogCancel>
                        <AlertDialogAction render={<Button variant="destructive" onClick={() => deleteResult.mutate(r.id)} />}>Delete</AlertDialogAction>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {r.quarterly_result_metrics?.length ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Test</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Normal Range</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {r.quarterly_result_metrics.map((m: { id: string; metric_name: string; value: number; unit: string | null; normal_range: string | null }) => (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium">{m.metric_name}</TableCell>
                            <TableCell>{m.value}</TableCell>
                            <TableCell>{m.unit}</TableCell>
                            <TableCell className="text-muted-foreground">{m.normal_range ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="py-4 text-center text-sm text-muted-foreground">No metrics added yet.</div>
                )}
                {r.notes && (
                  <div className="border-t px-4 py-2 bg-accent/20">
                    <p className="text-xs text-muted-foreground">{r.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
