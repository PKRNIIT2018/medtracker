"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, Stethoscope } from "lucide-react";
import { useUserSettings, useSettingsMutation, useDoctors, useCreateDoctor, useUpdateDoctor, useDeleteDoctor } from "@/features/settings/hooks";
import type { Doctor } from "@/types/database";

function DoctorForm({
  initial,
  onSave,
  saving,
}: {
  initial?: Doctor;
  onSave: (values: { name: string; specialty: string; phone: string; email: string; is_primary: boolean; notes: string }) => void;
  saving: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [specialty, setSpecialty] = useState(initial?.specialty ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [isPrimary, setIsPrimary] = useState(initial?.is_primary ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const canSave = name.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Name *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Smith" />
      </div>
      <div className="space-y-2">
        <Label>Specialty</Label>
        <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Cardiologist" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 890" />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="dr.smith@example.com" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special instructions, clinic address..." rows={3} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} className="rounded border-border" />
        Set as primary doctor
      </label>
      <DialogFooter>
        <Button disabled={!canSave || saving} onClick={() => onSave({ name: name.trim(), specialty: specialty.trim(), phone: phone.trim(), email: email.trim(), is_primary: isPrimary, notes: notes.trim() })}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {initial ? "Update Doctor" : "Add Doctor"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function DoctorCard({
  doctor,
  onEdit,
  onDelete,
}: {
  doctor: Doctor;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start justify-between rounded-lg border p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{doctor.name}</span>
          {doctor.is_primary && <Badge variant="default">Primary</Badge>}
        </div>
        {doctor.specialty && <p className="text-sm text-muted-foreground">{doctor.specialty}</p>}
        {doctor.phone && <p className="text-sm text-muted-foreground">{doctor.phone}</p>}
        {doctor.email && <p className="text-sm text-muted-foreground">{doctor.email}</p>}
        {doctor.notes && <p className="text-sm text-muted-foreground/70 mt-1">{doctor.notes}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label="Edit doctor">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label="Remove doctor">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

export function ProfileSection() {
  const { data: settings } = useUserSettings();
  const updateSettings = useSettingsMutation();
  const { data: doctors = [], isLoading: doctorsLoading } = useDoctors();
  const createDoctor = useCreateDoctor();
  const updateDoctor = useUpdateDoctor();
  const deleteDoctor = useDeleteDoctor();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Doctor | null>(null);

  const handleAdd = (values: { name: string; specialty: string; phone: string; email: string; is_primary: boolean; notes: string }) => {
    createDoctor.mutate(values, { onSuccess: () => setAddOpen(false) });
  };

  const handleEdit = (values: { name: string; specialty: string; phone: string; email: string; is_primary: boolean; notes: string }) => {
    if (!editTarget) return;
    updateDoctor.mutate({ id: editTarget.id, ...values }, { onSuccess: () => setEditTarget(null) });
  };

  const handleDelete = (doctor: Doctor) => {
    if (window.confirm(`Remove ${doctor.name} from your doctors?`)) {
      deleteDoctor.mutate(doctor.id);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Personal Information</CardTitle><CardDescription>Your details</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <div className="relative">
              <Input defaultValue={settings?.full_name ?? ""} placeholder="John Doe"
                onBlur={(e) => updateSettings.mutate({ full_name: e.target.value || null })} />
              {updateSettings.isPending && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>
          <div className="space-y-2">
            <Label>ID Card Number</Label>
            <div className="relative">
              <Input defaultValue={settings?.id_card_number ?? ""} placeholder="e.g. A12345678"
                onBlur={(e) => updateSettings.mutate({ id_card_number: e.target.value || null })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <div className="relative">
              <Textarea defaultValue={settings?.description ?? ""} placeholder="Allergies, conditions, notes..." rows={4}
                onBlur={(e) => updateSettings.mutate({ description: e.target.value || null })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Doctors
            </CardTitle>
            <CardDescription>Manage your healthcare providers</CardDescription>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
              <Plus className="h-4 w-4" />
              Add Doctor
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Doctor</DialogTitle>
                <DialogDescription>Add a new healthcare provider</DialogDescription>
              </DialogHeader>
              <DoctorForm onSave={handleAdd} saving={createDoctor.isPending} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-3">
          {doctorsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : doctors.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No doctors added yet. Click &ldquo;Add Doctor&rdquo; to get started.</p>
          ) : (
            doctors.map((doctor) => (
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
                onEdit={() => setEditTarget(doctor)}
                onDelete={() => handleDelete(doctor)}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Doctor</DialogTitle>
            <DialogDescription>Update doctor information</DialogDescription>
          </DialogHeader>
          {editTarget && (
            <DoctorForm
              key={editTarget.id}
              initial={editTarget}
              onSave={handleEdit}
              saving={updateDoctor.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
