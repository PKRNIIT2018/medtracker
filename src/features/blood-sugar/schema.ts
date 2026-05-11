import { z } from "zod";

export const bloodSugarSchema = z.object({
  reading_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  reading_time: z.string().optional(),
  meal_slot: z.enum(["before_breakfast", "after_breakfast", "before_lunch", "after_lunch", "before_dinner", "after_dinner"]),
  level: z.number().min(0.5, "Must be >= 0.5").max(35, "Must be <= 35"),
  notes: z.string().max(1000).optional(),
});

export type BloodSugarFormData = z.infer<typeof bloodSugarSchema>;

export const mealSlotLabels: Record<string, string> = {
  before_breakfast: "Before Breakfast",
  after_breakfast: "After Breakfast",
  before_lunch: "Before Lunch",
  after_lunch: "After Lunch",
  before_dinner: "Before Dinner",
  after_dinner: "After Dinner",
};
