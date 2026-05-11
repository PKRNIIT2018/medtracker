import type { MedicationFormData } from "./schema";

export function cleanMedicationFields(values: MedicationFormData) {
  return {
    ...values,
    active_substance: values.active_substance || undefined,
    stock_count: values.stock_count ?? undefined,
    ai_summary: values.ai_summary || undefined,
  };
}

export function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowTime(): string {
  return new Date().toISOString().slice(11, 16);
}
