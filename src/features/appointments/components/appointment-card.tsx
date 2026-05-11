"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { appointmentStatusLabels, appointmentStatusBadgeColors, appointmentBorderColors, getAppointmentDateColor } from "@/lib/vitals-colors";
import type { Appointment } from "@/types/database";

interface AppointmentCardProps {
  appointment: Appointment;
  onEdit: (a: Appointment) => void;
  onDelete: (id: string) => void;
}

export function AppointmentCard({ appointment, onEdit, onDelete }: AppointmentCardProps) {
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
