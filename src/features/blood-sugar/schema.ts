import { z } from "zod";

export const bloodSugarSchema = z.object({
  reading_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  reading_time: z.string().optional(),
  meal_slot: z.enum(["before_breakfast", "before_lunch", "before_dinner"]),
  level_mgdl: z.number().min(0, "Must be >= 0").max(1000, "Must be <= 1000"),
  notes: z.string().max(1000).optional(),
});

export type BloodSugarFormData = z.infer<typeof bloodSugarSchema>;

export const mealSlotLabels: Record<string, string> = {
  before_breakfast: "Before Breakfast",
  before_lunch: "Before Lunch",
  before_dinner: "Before Dinner",
};
