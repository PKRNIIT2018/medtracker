"use client";

import { useState } from "react";
import { useWaterEntries, useAddWater } from "@/features/water/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplets, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const presetAmounts = [200, 250, 300, 500];

export default function WaterPage() {
  const { data: entries, isLoading } = useWaterEntries();
  const addWater = useAddWater();
  const [customAmount, setCustomAmount] = useState("");

  const todayTotal = entries
    ?.filter((e) => e.entry_date === format(new Date(), "yyyy-MM-dd"))
    .reduce((sum, e) => sum + Number(e.amount_ml), 0) ?? 0;

  const goal = 2000;
  const progress = Math.min((todayTotal / goal) * 100, 100);

  function handleAdd(amount: number) {
    addWater.mutate(amount, {
      onSuccess: () => toast.success(`${amount}ml added`),
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Water Intake</h1>
        <p className="text-muted-foreground">Track your daily water consumption</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold">{todayTotal}</span>
            <span className="text-muted-foreground mb-1">/ {goal} ml</span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex flex-wrap gap-2">
            {presetAmounts.map((amount) => (
              <Button key={amount} variant="outline" size="sm" onClick={() => handleAdd(amount)} disabled={addWater.isPending}>
                <Plus className="mr-1 h-3 w-3" />{amount}ml
              </Button>
            ))}
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Custom"
                className="w-20"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
              />
              <Button size="sm" variant="outline" onClick={() => { const n = Number(customAmount); if (n > 0) handleAdd(n); setCustomAmount(""); }}>
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Entries</CardTitle></CardHeader>
        <CardContent>
          {!entries?.length ? (
            <p className="text-sm text-muted-foreground">No entries yet.</p>
          ) : (
            <div className="space-y-2">
              {entries.slice(0, 20).map((e) => (
                <div key={e.id} className="flex items-center gap-3 text-sm">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{e.amount_ml} ml</span>
                  <span className="text-muted-foreground">{e.entry_date}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
