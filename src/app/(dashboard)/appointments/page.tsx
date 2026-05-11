"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Calendar, CalendarCheck } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { appointmentStatusLabels, appointmentStatusBadgeColors, appointmentBorderColors, getAppointmentDateColor } from "@/lib/vitals-colors";
import type { Appointment } from "@/types/database";

const supabase = createClient();

function AppointmentCard({
  appointment,
  onEdit,
  onDelete,
}: {
  appointment: Appointment;
  onEdit: (a: Appointment) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className={cn("border-l-4 pl-0 transition-all", appointmentBorderColors[appointment.status], getAppointmentDateColor(appointment.appointment_date))}>
      <CardContent className="flex items-start justify-between py-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="inline-flex items-center justify-center rounded-full bg-primary/10 p-2 mt-0.5 shrink-0">
            <Calendar className="h-4 w-4 text-primary" />
          </span>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium">{appointment.title}</p>
              <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", appointmentStatusBadgeColors[appointment.status])}>
                {appointmentStatusLabels[appointment.status]}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3 shrink-0" />{appointment.appointment_date}{appointment.appointment_time && ` ${appointment.appointment_time.slice(0, 5)}`}</span>
              {appointment.doctor_name && <span>{appointment.doctor_name}</span>}
              {appointment.location && <span>{appointment.location}</span>}
            </div>
            {appointment.notes && <p className="text-xs text-muted-foreground pt-1 line-clamp-2">{appointment.notes}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <Button variant="ghost" size="icon" aria-label="Edit appointment"
            onClick={() => onEdit(appointment)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="ghost" size="icon" aria-label="Delete appointment"><Trash2 className="h-4 w-4" /></Button>} />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Appointment</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this appointment? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex justify-end gap-2">
                <AlertDialogCancel render={<Button variant="outline" />}>Cancel</AlertDialogCancel>
                <AlertDialogAction render={<Button variant="destructive" onClick={() => onDelete(appointment.id)} />}>Delete</AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AppointmentsPage() {
  const qc = useQueryClient();
  const [apptOpen, setApptOpen] = useState(false);
  const [apptForm, setApptForm] = useState({ title: "", doctor_name: "", appointment_date: format(new Date(), "yyyy-MM-dd"), appointment_time: "", location: "", notes: "", status: "pending" as Appointment["status"] });
  const [editApptOpen, setEditApptOpen] = useState(false);
  const [editApptId, setEditApptId] = useState<string | null>(null);
  const [editApptForm, setEditApptForm] = useState({ title: "", doctor_name: "", appointment_date: format(new Date(), "yyyy-MM-dd"), appointment_time: "", location: "", notes: "", status: "pending" as Appointment["status"] });

  const { data: appointments } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data } = await supabase.from("appointments").select("*").is("deleted_at", null).order("appointment_date", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const createAppointment = useMutation({
    mutationFn: async (values: typeof apptForm) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");
      const { error } = await supabase.from("appointments").insert({ ...values, user_id: user.user.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["appointments"] }); toast.success("Appointment added"); setApptOpen(false); setApptForm({ title: "", doctor_name: "", appointment_date: format(new Date(), "yyyy-MM-dd"), appointment_time: "", location: "", notes: "", status: "pending" }); },
    onError: (err) => toast.error(err.message),
  });

  const updateAppointment = useMutation({
    mutationFn: async ({ id, ...values }: { id: string } & typeof apptForm) => {
      const { error } = await supabase.from("appointments").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["appointments"] }); toast.success("Appointment updated"); setEditApptOpen(false); setEditApptId(null); },
    onError: (err) => toast.error(err.message),
  });

  const deleteAppointment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["appointments"] }); toast.success("Appointment removed"); },
    onError: (err) => toast.error(err.message),
  });

  function resetApptForm() {
    setApptForm({ title: "", doctor_name: "", appointment_date: format(new Date(), "yyyy-MM-dd"), appointment_time: "", location: "", notes: "", status: "pending" });
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const upcoming = (appointments ?? []).filter((a) => a.appointment_date >= today).sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));
  const past = (appointments ?? []).filter((a) => a.appointment_date < today).sort((a, b) => b.appointment_date.localeCompare(a.appointment_date));

  function handleEdit(a: Appointment) {
    setEditApptId(a.id);
    setEditApptForm({
      title: a.title,
      doctor_name: a.doctor_name ?? "",
      appointment_date: a.appointment_date,
      appointment_time: a.appointment_time ?? "",
      location: a.location ?? "",
      notes: a.notes ?? "",
      status: a.status,
    });
    setEditApptOpen(true);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header-bg rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
            <p className="text-muted-foreground">Schedule and track your doctor visits</p>
          </div>
          <Dialog open={apptOpen} onOpenChange={(v) => { setApptOpen(v); if (!v) resetApptForm(); }}>
            <DialogTrigger className={buttonVariants({ variant: "default" })}>
              <Plus className="mr-2 h-4 w-4" />Add Appointment
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Appointment</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createAppointment.mutate(apptForm); }} className="space-y-4">
                <div className="space-y-2"><Label>Title</Label><Input required value={apptForm.title} onChange={(e) => setApptForm({ ...apptForm, title: e.target.value })} placeholder="Follow-up visit" /></div>
                <div className="space-y-2"><Label>Doctor Name</Label><Input value={apptForm.doctor_name} onChange={(e) => setApptForm({ ...apptForm, doctor_name: e.target.value })} placeholder="Dr. Smith" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Date</Label><Input type="date" required value={apptForm.appointment_date} onChange={(e) => setApptForm({ ...apptForm, appointment_date: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Time</Label><Input type="time" value={apptForm.appointment_time} onChange={(e) => setApptForm({ ...apptForm, appointment_time: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>Location</Label><Input value={apptForm.location} onChange={(e) => setApptForm({ ...apptForm, location: e.target.value })} placeholder="Room 101, City Hospital" /></div>
                <div className="space-y-2"><Label>Notes</Label><Textarea value={apptForm.notes} onChange={(e) => setApptForm({ ...apptForm, notes: e.target.value })} rows={3} /></div>
                <Button type="submit" className="w-full" disabled={createAppointment.isPending}>Save Appointment</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={editApptOpen} onOpenChange={(v) => { setEditApptOpen(v); if (!v) { setEditApptId(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Appointment</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); if (!editApptId) return; updateAppointment.mutate({ id: editApptId, ...editApptForm }); }} className="space-y-4">
            <div className="space-y-2"><Label>Title</Label><Input required value={editApptForm.title} onChange={(e) => setEditApptForm({ ...editApptForm, title: e.target.value })} placeholder="Follow-up visit" /></div>
            <div className="space-y-2"><Label>Doctor Name</Label><Input value={editApptForm.doctor_name} onChange={(e) => setEditApptForm({ ...editApptForm, doctor_name: e.target.value })} placeholder="Dr. Smith" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Date</Label><Input type="date" required value={editApptForm.appointment_date} onChange={(e) => setEditApptForm({ ...editApptForm, appointment_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Time</Label><Input type="time" value={editApptForm.appointment_time} onChange={(e) => setEditApptForm({ ...editApptForm, appointment_time: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Location</Label><Input value={editApptForm.location} onChange={(e) => setEditApptForm({ ...editApptForm, location: e.target.value })} placeholder="Room 101, City Hospital" /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editApptForm.status} onValueChange={(v) => setEditApptForm({ ...editApptForm, status: v as Appointment["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["pending", "confirmed", "cancelled", "completed"] as const).map((s) => (
                    <SelectItem key={s} value={s}>{appointmentStatusLabels[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={editApptForm.notes} onChange={(e) => setEditApptForm({ ...editApptForm, notes: e.target.value })} rows={3} /></div>
            <Button type="submit" className="w-full" disabled={updateAppointment.isPending}>Update Appointment</Button>
          </form>
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
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Upcoming ({upcoming.length})
              </h3>
                      <div className="space-y-2">{upcoming.map((a) => <AppointmentCard key={a.id} appointment={a} onEdit={handleEdit} onDelete={(id) => deleteAppointment.mutate(id)} />)}</div>
                    </div>
                  )}
                  {past.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                        Past ({past.length})
                      </h3>
                      <div className="space-y-2">{past.map((a) => <AppointmentCard key={a.id} appointment={a} onEdit={handleEdit} onDelete={(id) => deleteAppointment.mutate(id)} />)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
