import type { BloodSugar } from "@/types/database";
import type { BloodSugarReading, BloodSugarTrend, MealSlot, ReadingStatus, TrendDirection } from "./domain";
import { getSugarLevel } from "@/lib/vitals-colors";

export function dbReadingToDomain(db: BloodSugar): BloodSugarReading {
  return {
    id: db.id,
    date: db.reading_date,
    time: db.reading_time,
    mealSlot: db.meal_slot as MealSlot,
    levelMgdl: db.level_mgdl,
    notes: db.notes,
  };
}

export function calculateTrend(
  current: BloodSugarReading,
  previous?: BloodSugarReading | null
): BloodSugarTrend {
  const direction: TrendDirection = !previous
    ? "stable"
    : current.levelMgdl > previous.levelMgdl + 5
    ? "rising"
    : current.levelMgdl < previous.levelMgdl - 5
    ? "falling"
    : "stable";

  const status = getSugarLevel(current.levelMgdl) as ReadingStatus;

  return { current, previous: previous ?? null, direction, status };
}
