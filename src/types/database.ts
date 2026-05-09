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

export interface MedicationIntake {
  id: string
  user_id: string
  medication_id: string
  taken_at: string
  date: string
}

export interface BloodSugar {
  id: string
  user_id: string
  level: number
  meal_slot: 'before_breakfast' | 'after_breakfast' | 'before_lunch' | 'after_lunch' | 'before_dinner' | 'after_dinner' | 'fasting' | 'bedtime'
  notes: string | null
  date: string
  time: string
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

export interface WaterIntake {
  id: string
  user_id: string
  amount_ml: number
  date: string
  time: string
  created_at: string
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

export interface Appointment {
  id: string
  user_id: string
  title: string
  doctor_name: string | null
  appointment_date: string
  appointment_time: string | null
  location: string | null
  notes: string | null
  deleted_at: string | null
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
