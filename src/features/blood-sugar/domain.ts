export type MealSlot =
  | "before_breakfast" | "after_breakfast"
  | "before_lunch" | "after_lunch"
  | "before_dinner" | "after_dinner"
  | "fasting" | "bedtime";

export interface BloodSugarReading {
  id: string;
  date: string;
  time: string | null;
  mealSlot: MealSlot;
  levelMgdl: number;
  notes: string | null;
}

export type TrendDirection = "rising" | "falling" | "stable";
export type ReadingStatus = "low" | "normal" | "elevated" | "high";

export interface BloodSugarTrend {
  current: BloodSugarReading;
  previous: BloodSugarReading | null;
  direction: TrendDirection;
  status: ReadingStatus;
}
