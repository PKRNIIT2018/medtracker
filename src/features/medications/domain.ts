export type TimeOfDaySlot = "morning" | "afternoon" | "evening";

export const TIME_SLOT_LABELS: Record<TimeOfDaySlot, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

export const TIME_OF_DAY_OPTIONS: { value: TimeOfDaySlot; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
];

export interface MedicationSchedule {
  timeSlots: TimeOfDaySlot[];
  dailyFrequency: number;
}

export interface DoseSlot {
  timeOfDay: TimeOfDaySlot;
  label: string;
}

export interface IntakeEvent {
  id: string;
  medicationId: string;
  medicationName: string;
  medicationStrength: string;
  medicationType: string;
  timeSlot: TimeOfDaySlot;
  status: "taken" | "skipped";
  takenDate: string;
  takenTime: string | null;
  notes: string | null;
}

export interface MedicationView {
  id: string;
  name: string;
  type: string;
  strength: string;
  schedule: MedicationSchedule;
  isActive: boolean;
  activeSubstance: string | null;
  stockCount: number | null;
  aiSummary: string | null;
}
