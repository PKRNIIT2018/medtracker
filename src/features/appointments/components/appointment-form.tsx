"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { AppointmentFormData } from "../schema";
import { appointmentStatusLabels } from "@/lib/vitals-colors";

interface AppointmentFormProps {
  form: AppointmentFormData;
  onChange: (form: AppointmentFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  submitLabel: string;
}

export function AppointmentForm({ form, onChange, onSubmit, isPending, submitLabel }: AppointmentFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input required value={form.title} onChange={(e) => onChange({ ...form, title: e.target.value })} placeholder="Follow-up visit" />
      </div>
      <div className="space-y-2">
        <Label>Doctor Name</Label>
        <Input value={form.doctor_name ?? ""} onChange={(e) => onChange({ ...form, doctor_name: e.target.value })} placeholder="Dr. Smith" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date</Label>
          <Input type="date" required value={form.appointment_date} onChange={(e) => onChange({ ...form, appointment_date: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Time</Label>
          <Input type="time" value={form.appointment_time ?? ""} onChange={(e) => onChange({ ...form, appointment_time: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Location</Label>
        <Input value={form.location ?? ""} onChange={(e) => onChange({ ...form, location: e.target.value })} placeholder="Room 101, City Hospital" />
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={form.status} onValueChange={(v) => onChange({ ...form, status: v as AppointmentFormData["status"] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(["pending", "confirmed", "cancelled", "completed"] as const).map((s) => (
              <SelectItem key={s} value={s}>{appointmentStatusLabels[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={form.notes ?? ""} onChange={(e) => onChange({ ...form, notes: e.target.value })} rows={3} />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>{submitLabel}</Button>
    </form>
  );
}
