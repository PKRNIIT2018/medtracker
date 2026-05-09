"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FlaskConical, Trash2 } from "lucide-react";
import { toast } from "sonner";

const supabase = createClient();

export default function QuarterlyResultsPage() {
  const qc = useQueryClient();
  const { data: results, isLoading } = useQuery({
    queryKey: ["quarterly-results"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quarterly_results")
        .select("*, quarterly_result_metrics(*)")
        .is("deleted_at", null)
        .order("result_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createResult = useMutation({
    mutationFn: async (values: { result_date: string; quarter_label: string; notes?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("quarterly_results").insert({ ...values, user_id: user.user.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quarterly-results"] }); toast.success("Result batch added"); setOpen(false); },
    onError: (err) => toast.error(err.message),
  });

  const deleteResult = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("quarterly_results").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quarterly-results"] }),
  });

  const [open, setOpen] = useState(false);
  const [quarterLabel, setQuarterLabel] = useState("");
  const [resultDate, setResultDate] = useState("");
  const [notes, setNotes] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createResult.mutate({ quarter_label: quarterLabel, result_date: resultDate, notes: notes || undefined });
    setQuarterLabel(""); setResultDate(""); setNotes("");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold tracking-tight">Quarterly Results</h1><p className="text-muted-foreground">Lab test results organized by quarter</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
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

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : !results?.length ? (
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <FlaskConical className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No quarterly results yet.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-6">
          {results.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{r.quarter_label}</CardTitle>
                    <p className="text-sm text-muted-foreground">{r.result_date}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteResult.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              <CardContent>
                {r.quarterly_result_metrics?.length ? (
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
                          <TableCell className="text-muted-foreground">{m.normal_range}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">No metrics added yet.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
