import { z } from "zod";

export const appointmentSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  doctor_name: z.string().max(200).optional().or(z.literal("")),
  appointment_date: z.string().min(1, "Date is required"),
  appointment_time: z.string().optional().or(z.literal("")),
  location: z.string().max(300).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]).default("pending"),
});

export type AppointmentFormData = z.infer<typeof appointmentSchema>;
