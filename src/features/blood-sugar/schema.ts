import { z } from "zod";

export const bloodSugarSchema = z.object({
  reading_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  reading_time: z.string().optional(),
  meal_slot: z.enum(["before_breakfast", "after_breakfast", "before_lunch", "after_lunch", "before_dinner", "after_dinner", "fasting", "bedtime"]),
  level: z.number().min(0.5, "Must be >= 0.5").max(35, "Must be <= 35"),
  notes: z.string().max(1000).optional(),
});

export type BloodSugarFormData = z.infer<typeof bloodSugarSchema>;

export function getMealSlotsForTime(time: string): string[] {
  const h = parseInt(time.split(":")[0], 10);
  if (h >= 5 && h < 11) return ["before_breakfast", "after_breakfast", "fasting"];
  if (h >= 11 && h < 16) return ["before_lunch", "after_lunch"];
  if (h >= 16 && h < 22) return ["before_dinner", "after_dinner"];
  return ["bedtime", "fasting"];
}

export function getDefaultMealSlot(time: string): string {
  const h = parseInt(time.split(":")[0], 10);
  if (h >= 5 && h < 11) return h < 8 ? "before_breakfast" : "after_breakfast";
  if (h >= 11 && h < 16) return h < 13 ? "before_lunch" : "after_lunch";
  if (h >= 16 && h < 22) return h < 18 ? "before_dinner" : "after_dinner";
  return "bedtime";
}

export const mealSlotLabels: Record<string, string> = {
  before_breakfast: "Before Breakfast",
  after_breakfast: "After Breakfast",
  before_lunch: "Before Lunch",
  after_lunch: "After Lunch",
  before_dinner: "Before Dinner",
  after_dinner: "After Dinner",
  fasting: "Fasting",
  bedtime: "Bedtime",
};
