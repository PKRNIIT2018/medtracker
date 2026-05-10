"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { bloodSugarSchema, type BloodSugarFormData, mealSlotLabels } from "@/features/blood-sugar/schema";

interface BloodSugarFormProps {
  form: BloodSugarFormData;
  onChange: (form: BloodSugarFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  errors: Record<string, string>;
  isPending: boolean;
  submitLabel: string;
}

export function BloodSugarForm({ form, onChange, onSubmit, errors, isPending, submitLabel }: BloodSugarFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bs-date">Date</Label>
          <Input id="bs-date" type="date" value={form.reading_date} onChange={(e) => onChange({ ...form, reading_date: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bs-time">Time</Label>
          <Input id="bs-time" type="time" value={form.reading_time} onChange={(e) => onChange({ ...form, reading_time: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="bs-meal_slot">Meal Slot</Label>
        <Select value={form.meal_slot} onValueChange={(v) => v && onChange({ ...form, meal_slot: v as BloodSugarFormData["meal_slot"] })}>
          <SelectTrigger id="bs-meal_slot"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(mealSlotLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="bs-level">Level (mg/dL)</Label>
        <Input id="bs-level" type="number" value={form.level_mgdl || ""} onChange={(e) => onChange({ ...form, level_mgdl: Number(e.target.value) })} />
        {errors.level_mgdl && <p className="text-sm text-destructive">{errors.level_mgdl}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="bs-notes">Notes</Label>
        <Textarea id="bs-notes" value={form.notes} onChange={(e) => onChange({ ...form, notes: e.target.value })} />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
