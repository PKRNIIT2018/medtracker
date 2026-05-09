import { z } from "zod";

export const medicationSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  type: z.enum(["tablet", "liquid", "injection"]),
  strength: z.string().min(1, "Strength is required").max(100),
  time_of_day: z.array(z.enum(["morning", "afternoon", "evening"])).min(1, "Select at least one time"),
  is_active: z.boolean().default(true),
  active_substance: z.string().max(300).optional().or(z.literal("")),
  product_links: z.string().optional().or(z.literal("")),
  ai_summary: z.string().optional().or(z.literal("")),
});

export type MedicationFormData = z.infer<typeof medicationSchema>;

export const medicationUpdateSchema = medicationSchema.partial();
export type MedicationUpdateData = z.infer<typeof medicationUpdateSchema>;
