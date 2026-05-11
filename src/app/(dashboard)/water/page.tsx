"use client";

import { useState } from "react";
import { useWaterEntries, useAddWater } from "@/features/water/hooks";
import type { WaterIntake } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";
import { Droplets, Coffee, Beer, Wine, Plus, CupSoda, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import type { BeverageType } from "@/types/database";

const BEVERAGES: { type: BeverageType; label: string; icon: typeof Droplets; color: string; bgColor: string; selectedBg: string; defaultAmount: number }[] = [
  { type: "water", label: "Water", icon: Droplets, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30", selectedBg: "bg-blue-500 text-white shadow-sm", defaultAmount: 250 },
  { type: "tea", label: "Tea", icon: CupSoda, color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30", selectedBg: "bg-green-600 text-white shadow-sm", defaultAmount: 250 },
  { type: "coffee", label: "Coffee", icon: Coffee, color: "text-amber-700 dark:text-amber-500", bgColor: "bg-amber-100 dark:bg-amber-900/30", selectedBg: "bg-amber-700 text-white shadow-sm", defaultAmount: 300 },
  { type: "beer", label: "Beer", icon: Beer, color: "text-yellow-600 dark:text-yellow-500", bgColor: "bg-yellow-100 dark:bg-yellow-900/30", selectedBg: "bg-yellow-500 text-white shadow-sm", defaultAmount: 330 },
  { type: "alcohol", label: "Spirits", icon: Wine, color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/30", selectedBg: "bg-red-600 text-white shadow-sm", defaultAmount: 45 },
];

const HYDRATION_RATIO: Record<BeverageType, number> = {
  water: 1,
  tea: 1,
  coffee: 0.8,
  beer: 0.5,
  alcohol: 0,
};

const beverageMap = Object.fromEntries(BEVERAGES.map((b) => [b.type, b])) as Record<BeverageType, typeof BEVERAGES[number]>;

function getProgressColor(pct: number) {
  if (pct >= 100) return "bg-green-500";
  if (pct >= 80) return "bg-green-400";
  if (pct >= 50) return "bg-blue-400";
  return "bg-blue-500";
}

function getMilestone(pct: number) {
  if (pct >= 100) return "Goal reached!";
  if (pct >= 75) return "Almost there!";
  if (pct >= 50) return "Halfway there!";
  if (pct >= 25) return "Good start!";
  return null;
}

function formatDateHeader(date: string): string {
  if (isToday(parseISO(date))) return "Today";
  if (isYesterday(parseISO(date))) return "Yesterday";
  return format(parseISO(date), "MMMM d, yyyy");
}

export default function WaterPage() {
  const { data: entries, isLoading } = useWaterEntries();
  const addWater = useAddWater();
  const [selectedType, setSelectedType] = useState<BeverageType>("water");
  const [customAmount, setCustomAmount] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAmount, setDialogAmount] = useState("");
  const [dialogType, setDialogType] = useState<BeverageType>("water");

  const today = format(new Date(), "yyyy-MM-dd");
  const todayEntries = entries?.filter((e) => e.entry_date === today) ?? [];

  const todayTotal = todayEntries.reduce((sum, e) => sum + Number(e.amount_ml), 0);
  const todayHydrationAdjusted = todayEntries.reduce(
    (sum, e) => sum + Number(e.amount_ml) * HYDRATION_RATIO[(e.beverage_type ?? "water") as BeverageType],
    0,
  );
  const goal = 2000;
  const progress = Math.min((todayHydrationAdjusted / goal) * 100, 100);

  const breakdown = todayEntries.reduce(
    (acc, e) => {
      const t = e.beverage_type ?? "water";
      acc[t] = (acc[t] ?? 0) + Number(e.amount_ml);
      return acc;
    },
    {} as Record<string, number>,
  );

  const hasNonWater = Object.keys(breakdown).some((t) => t !== "water" && t !== "tea");

  function handleAdd(amount: number, beverage_type: BeverageType) {
    addWater.mutate({ amount_ml: amount, beverage_type }, {
      onSuccess: () => toast.success(`${amount}ml ${beverageMap[beverage_type].label} added`),
      onError: () => toast.error("Something went wrong. Please try again."),
    });
  }

  function handleDialogSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(dialogAmount);
    if (n > 0) {
      handleAdd(n, dialogType);
      setDialogAmount("");
      setDialogOpen(false);
    }
  }

  const ButtonIcon = beverageMap[selectedType].icon;
  const milestone = getMilestone(progress);

  const grouped = entries?.reduce((acc, e) => {
    const date = e.entry_date;
    if (!acc[date]) acc[date] = [];
    acc[date]!.push(e);
    return acc;
  }, {} as Record<string, WaterIntake[]>);
  const sortedDates = grouped ? Object.keys(grouped).sort((a, b) => b.localeCompare(a)) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hydration</h1>
          <p className="text-muted-foreground">Track your daily fluid intake</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setDialogAmount(""); setDialogType("water"); } }}>
          <DialogTrigger className={buttonVariants({ variant: "default" })}>
            <Plus className="mr-2 h-4 w-4" />Add Drink
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Drink</DialogTitle></DialogHeader>
            <form onSubmit={handleDialogSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dialog-type">Type</Label>
                <Select value={dialogType} onValueChange={(v) => v && setDialogType(v as BeverageType)}>
                  <SelectTrigger id="dialog-type" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BEVERAGES.map((b) => (
                      <SelectItem key={b.type} value={b.type}>
                        <span className="flex items-center gap-2">
                          <b.icon className={`h-4 w-4 ${b.color}`} />
                          {b.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (ml)</Label>
                <Input id="amount" type="number" min="1" placeholder="e.g. 250" value={dialogAmount} onChange={(e) => setDialogAmount(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={addWater.isPending}>Add</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Hydration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold">{Math.round(todayHydrationAdjusted)}</span>
            <span className="text-muted-foreground mb-1">/ {goal} ml</span>
            {milestone && <span className={cn("text-sm font-medium ml-2 mb-1", progress >= 100 ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400")}>{milestone}</span>}
          </div>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", getProgressColor(progress))} style={{ width: `${progress}%` }} />
          </div>

          {todayEntries.length > 0 && (
            <div className="flex flex-wrap gap-3 pt-2">
              {(Object.entries(breakdown) as [string, number][]).filter(([, ml]) => ml > 0).map(([type, ml]) => {
                const b = beverageMap[type as BeverageType];
                return (
                  <div key={type} className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium", b.bgColor, b.color)}>
                    <b.icon className="h-3.5 w-3.5" />
                    <span>{Math.round(ml)}ml</span>
                  </div>
                );
              })}
              <span className="text-xs text-muted-foreground self-center">
                Total: {Math.round(todayTotal)}ml
              </span>
              {hasNonWater && <span className="text-xs text-muted-foreground self-center italic">(adjusted for hydration)</span>}
            </div>
          )}

          <div className="space-y-2 pt-2">
            <p className="text-xs text-muted-foreground">Quick add:</p>
            <div className="flex flex-wrap gap-2">
              {BEVERAGES.map((b) => (
                <Button
                  key={b.type}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedType(b.type);
                    handleAdd(b.defaultAmount, b.type);
                  }}
                  disabled={addWater.isPending}
                  className={cn("gap-1.5", selectedType === b.type && b.selectedBg)}
                >
                  <b.icon className="h-4 w-4" />
                  {b.defaultAmount}ml
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Custom"
                className="w-20"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
              />
              <Button size="sm" variant="outline" onClick={() => { const n = Number(customAmount); if (n > 0) handleAdd(n, selectedType); setCustomAmount(""); }}>
                <ButtonIcon className="mr-1 h-3 w-3" />Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Entries</CardTitle></CardHeader>
        <CardContent>
          {!entries?.length ? (
            <p className="text-sm text-muted-foreground">No entries yet. Use the quick-add buttons above to log your drinks throughout the day.</p>
          ) : (
            <div className="space-y-6">
              {sortedDates.map((date) => (
                <div key={date}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    {formatDateHeader(date)}
                  </h3>
                  <div className="space-y-1">
                    {grouped[date].map((e: WaterIntake) => {
                      const b = beverageMap[(e.beverage_type ?? "water") as BeverageType];
                      const Icon = b.icon;
                      return (
                        <div key={e.id} className="flex items-center gap-3 text-sm py-1.5">
                          <Icon className={cn("h-4 w-4 shrink-0", b.color)} />
                          <span className="font-medium">{e.amount_ml} ml</span>
                          <span className="text-muted-foreground text-xs">{b.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}