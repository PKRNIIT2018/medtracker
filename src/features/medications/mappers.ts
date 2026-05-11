import type { Medication, MedicationIntake } from "@/types/database";
import type { MedicationView, IntakeEvent, TimeOfDaySlot } from "./domain";

export function dbMedicationToView(db: Medication): MedicationView {
  const timeSlots = (db.time_of_day ?? []) as TimeOfDaySlot[];

  return {
    id: db.id,
    name: db.name,
    type: db.type,
    strength: db.strength,
    schedule: {
      timeSlots,
      dailyFrequency: timeSlots.length,
    },
    isActive: db.is_active,
    activeSubstance: db.active_substance,
    stockCount: db.stock_count,
    aiSummary: db.ai_summary,
  };
}

export function dbIntakeToEvent(
  db: MedicationIntake & { medications?: Pick<Medication, "name" | "strength" | "type"> }
): IntakeEvent {
  return {
    id: db.id,
    medicationId: db.medication_id,
    medicationName: db.medications?.name ?? "",
    medicationStrength: db.medications?.strength ?? "",
    medicationType: db.medications?.type ?? "",
    timeSlot: (db as MedicationIntake & { time_slot?: string }).time_slot as TimeOfDaySlot ?? "morning",
    status: db.status === "rescheduled" ? "skipped" : db.status,
    takenDate: db.taken_date,
    takenTime: db.taken_time,
    notes: db.notes,
  };
}
