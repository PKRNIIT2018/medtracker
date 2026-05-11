"use client";

import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, CalendarCheck } from "lucide-react";
import { format } from "date-fns";
import { useAppointments, useCreateAppointment, useUpdateAppointment, useDeleteAppointment } from "@/features/appointments/hooks";
import { AppointmentCard } from "@/features/appointments/components/appointment-card";
import { AppointmentForm } from "@/features/appointments/components/appointment-form";
import type { AppointmentFormData } from "@/features/appointments/schema";
import type { Appointment } from "@/types/database";

const emptyForm: AppointmentFormData = {
  title: "", doctor_name: "", appointment_date: format(new Date(), "yyyy-MM-dd"),
  appointment_time: "", location: "", notes: "", status: "pending",
};

export default function AppointmentsPage() {
  const { data: appointments } = useAppointments();
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const deleteAppointment = useDeleteAppointment();
  const [apptOpen, setApptOpen] = useState(false);
  const [apptForm, setApptForm] = useState<AppointmentFormData>(emptyForm);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AppointmentFormData>(emptyForm);

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    createAppointment.mutate(apptForm, {
      onSuccess: () => { setApptOpen(false); setApptForm(emptyForm); },
    });
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    updateAppointment.mutate({ id: editId, ...editForm }, {
      onSuccess: () => { setEditOpen(false); setEditId(null); },
    });
  }

  function openEdit(a: Appointment) {
    setEditId(a.id);
    setEditForm({
      title: a.title,
      doctor_name: a.doctor_name ?? "",
      appointment_date: a.appointment_date,
      appointment_time: a.appointment_time ?? "",
      location: a.location ?? "",
      notes: a.notes ?? "",
      status: a.status,
    });
    setEditOpen(true);
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const upcoming = (appointments ?? []).filter((a) => a.appointment_date >= today)
    .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));
  const past = (appointments ?? []).filter((a) => a.appointment_date < today)
    .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header-bg rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
            <p className="text-muted-foreground">Schedule and track your doctor visits</p>
          </div>
          <Dialog open={apptOpen} onOpenChange={(v) => { setApptOpen(v); if (!v) setApptForm(emptyForm); }}>
            <DialogTrigger className={buttonVariants({ variant: "default" })}>
              <Plus className="mr-2 h-4 w-4" />Add Appointment
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Appointment</DialogTitle></DialogHeader>
              <AppointmentForm form={apptForm} onChange={setApptForm} onSubmit={handleCreateSubmit}
                isPending={createAppointment.isPending} submitLabel="Save Appointment" />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) setEditId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Appointment</DialogTitle></DialogHeader>
          <AppointmentForm form={editForm} onChange={setEditForm} onSubmit={handleEditSubmit}
            isPending={updateAppointment.isPending} submitLabel="Update Appointment" />
        </DialogContent>
      </Dialog>

      {!appointments?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <CalendarCheck className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground font-medium">No appointments scheduled</p>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Add your upcoming doctor visits to stay organized. You&apos;ll see them here grouped into upcoming and past appointments.
            </p>
            <Button variant="outline" onClick={() => setApptOpen(true)}>Add your first appointment</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />Upcoming ({upcoming.length})
              </h3>
              <div className="space-y-2">
                {upcoming.map((a) => (
                  <AppointmentCard key={a.id} appointment={a} onEdit={openEdit} onDelete={(id) => deleteAppointment.mutate(id)} />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />Past ({past.length})
              </h3>
              <div className="space-y-2">
                {past.map((a) => (
                  <AppointmentCard key={a.id} appointment={a} onEdit={openEdit} onDelete={(id) => deleteAppointment.mutate(id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
