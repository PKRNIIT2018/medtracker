import type { BloodSugar } from "@/types/database";
import type { BloodSugarReading, BloodSugarTrend, MealSlot, ReadingStatus, TrendDirection } from "./domain";
import { getSugarLevel } from "@/lib/vitals-colors";

export function dbReadingToDomain(db: BloodSugar): BloodSugarReading {
  return {
    id: db.id,
    date: db.reading_date,
    time: db.reading_time,
    mealSlot: db.meal_slot as MealSlot,
    level: db.level,
    notes: db.notes,
  };
}

export function calculateTrend(
  current: BloodSugarReading,
  previous?: BloodSugarReading | null
): BloodSugarTrend {
  const direction: TrendDirection = !previous
    ? "stable"
    : current.level > previous.level + 0.3
    ? "rising"
    : current.level < previous.level - 0.3
    ? "falling"
    : "stable";

  const status = getSugarLevel(current.level) as ReadingStatus;

  return { current, previous: previous ?? null, direction, status };
}
