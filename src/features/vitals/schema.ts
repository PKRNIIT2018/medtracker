import { z } from "zod";

export const bloodPressureSchema = z.object({
  reading_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reading_time: z.string().optional(),
  systolic: z.number().min(0).max(300),
  diastolic: z.number().min(0).max(200),
  heart_rate: z.number().min(0).max(300).optional().nullable(),
  notes: z.string().max(1000).optional(),
});

export const hba1cSchema = z.object({
  reading_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  percentage: z.number().min(0).max(20),
  notes: z.string().max(1000).optional(),
});

export const weightSchema = z.object({
  reading_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight_kg: z.number().min(0).max(500),
  notes: z.string().max(1000).optional(),
});

export type BloodPressureFormData = z.infer<typeof bloodPressureSchema>;
export type Hba1cFormData = z.infer<typeof hba1cSchema>;
export type WeightFormData = z.infer<typeof weightSchema>;
