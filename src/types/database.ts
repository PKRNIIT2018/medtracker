export interface Profile {
  id: string
  email: string
  full_name: string
  created_at: string
  updated_at: string
}

export interface Medication {
  id: string
  user_id: string
  name: string
  type: string
  strength: string
  time_of_day: string[]
  is_active: boolean
  active_substance: string | null
  stock_count: number | null
  ai_summary: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface MedicationDose {
  id: string
  user_id: string
  medication_id: string
  dose_time: string
  amount: string
  deleted_at: string | null
  created_at: string
}

export interface MedicationIntake {
  id: string
  user_id: string
  medication_id: string
  dose_id: string | null
  taken_date: string
  taken_time: string | null
  time_slot: string | null
  status: "taken" | "skipped" | "rescheduled"
  notes: string | null
  deleted_at: string | null
  created_at: string
}

export type MealSlot = 'before_breakfast' | 'after_breakfast' | 'before_lunch' | 'after_lunch' | 'before_dinner' | 'after_dinner';

export interface BloodSugar {
  id: string
  user_id: string
  reading_date: string
  reading_time: string | null
  meal_slot: MealSlot
  level: number
  notes: string | null
  created_at: string
  deleted_at: string | null
}

export interface Vitals {
  id: string
  user_id: string
  systolic: number
  diastolic: number
  heart_rate: number | null
  date: string
  time: string
  notes: string | null
  created_at: string
  deleted_at: string | null
}

export type BeverageType = 'water' | 'tea' | 'coffee' | 'beer' | 'alcohol';

export interface WaterIntake {
  id: string
  user_id: string
  amount_ml: number
  entry_date: string
  beverage_type: BeverageType
  created_at: string
  deleted_at: string | null
}

export interface Activity {
  id: string
  user_id: string
  type: string
  duration_minutes: number
  intensity: 'light' | 'moderate' | 'vigorous'
  calories: number | null
  notes: string | null
  date: string
  created_at: string
  deleted_at: string | null
}

export interface MedicalHistory {
  id: string
  user_id: string
  condition: string
  diagnosis_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface QuarterlyResult {
  id: string
  user_id: string
  test_name: string
  result: string
  unit: string | null
  normal_range: string | null
  date: string
  notes: string | null
  created_at: string
  deleted_at: string | null
}

export interface BloodPanel {
  id: string
  user_id: string
  reading_date: string
  s_chol: number | null
  s_tag: number | null
  s_hdl: number | null
  non_hdl: number | null
  s_ck: number | null
  b_hba1c_dc: number | null
  b_hba1c_if: number | null
  notes: string | null
  deleted_at: string | null
  created_at: string
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Appointment {
  id: string
  user_id: string
  title: string
  doctor_name: string | null
  appointment_date: string
  appointment_time: string | null
  location: string | null
  notes: string | null
  status: AppointmentStatus
  deleted_at: string | null
  created_at: string
}

export interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh_key: string
  auth_key: string
  user_agent: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string
  action: string
  table_name: string
  record_id: string
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
}
