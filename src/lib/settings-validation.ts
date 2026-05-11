const ALLOWED_FIELDS = new Set([
  "full_name",
  "id_card_number",
  "doctor_name",
  "description",
  "theme",
  "daily_water_goal_ml",
  "sugar_unit",
  "notifications_enabled",
  "medication_reminder_enabled",
  "sugar_reminder_enabled",
  "water_reminder_enabled",
  "notification_privacy",
  "reminder_window_start",
  "reminder_window_end",
]);

const SENSITIVE_FIELDS = new Set(["app_pin_hash", "app_pin_enabled"]);

export interface ValidationResult {
  allowed: Record<string, unknown>;
  rejected: string[];
  hasValidFields: boolean;
}

export function validateSettingsFields(body: Record<string, unknown>): ValidationResult {
  const rejected: string[] = [];
  const allowed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body)) {
    if (SENSITIVE_FIELDS.has(key)) {
      rejected.push(key);
    } else if (ALLOWED_FIELDS.has(key)) {
      allowed[key] = value;
    } else {
      rejected.push(key);
    }
  }

  return {
    allowed,
    rejected,
    hasValidFields: Object.keys(allowed).length > 0,
  };
}
