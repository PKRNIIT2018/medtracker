-- RBAC: user_roles table, shared_patients, JWT access token hook
-- Run this after deploying to Supabase. Then configure the hook in Dashboard.

-- ============================================================
-- 1. user_roles table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'doctor', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role    ON public.user_roles (role);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Only supabase_auth_admin / service_role can manage roles directly
CREATE POLICY "user_roles_admin_only"
  ON public.user_roles
  FOR ALL
  USING (auth.jwt()->'app_metadata'->>'user_role' = 'admin')
  WITH CHECK (auth.jwt()->'app_metadata'->>'user_role' = 'admin');

-- ============================================================
-- 2. shared_patients table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shared_patients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_tables TEXT[] NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_shared_patients_doctor  ON public.shared_patients (doctor_id);
CREATE INDEX IF NOT EXISTS idx_shared_patients_patient ON public.shared_patients (patient_id);

ALTER TABLE public.shared_patients ENABLE ROW LEVEL SECURITY;

-- Doctors can see their own share links
CREATE POLICY "shared_patients_doctor_select"
  ON public.shared_patients
  FOR SELECT
  USING (doctor_id = auth.uid());

-- Patients can manage who accesses their data
CREATE POLICY "shared_patients_patient_all"
  ON public.shared_patients
  FOR ALL
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- ============================================================
-- 3. Backfill roles for existing users
-- ============================================================
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user' FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = users.id)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- 4. Update handle_new_user() to also assign role
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 5. Custom Access Token Hook
-- ============================================================
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)

-- ============================================================
-- 6. Grant permissions to supabase_auth_admin
-- ============================================================
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

-- ============================================================
-- 7. Role promotion function (callable by admins via service_role)
-- ============================================================
CREATE OR REPLACE FUNCTION public.promote_to_doctor(target_email TEXT)

-- ============================================================
-- 8. Replace blood_sugar RLS with role-aware policies
-- ============================================================
DROP POLICY IF EXISTS "user_blood_sugar_all" ON blood_sugar;

-- ============================================================
-- 9. Allow doctors to read patient's name from user_settings
-- ============================================================
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = (event->>'user_id')::UUID;
  IF user_role IS NULL THEN
    user_role := 'user';
  END IF;
  RETURN jsonb_set(event, '{claims, app_metadata, user_role}', to_jsonb(user_role));
END;
$$;

-- ============================================================
-- 5. Grant permissions to supabase_auth_admin
-- ============================================================
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON ALL TABLES IN SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Revoke user_roles and shared_patients from public
REVOKE ALL ON public.user_roles     FROM anon, authenticated;
REVOKE ALL ON public.shared_patients FROM anon, authenticated;

-- ============================================================
-- 6. Role promotion function (callable by admins via service_role)
-- ============================================================
CREATE OR REPLACE FUNCTION public.promote_to_doctor(target_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id UUID;
BEGIN
  SELECT id INTO target_id FROM auth.users WHERE email = target_email;
  IF target_id IS NULL THEN
    RETURN 'User not found';
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_id, 'doctor')
  ON CONFLICT (user_id)
  DO UPDATE SET role = 'doctor';
  RETURN 'User promoted to doctor';
END;
$$;

REVOKE ALL ON FUNCTION public.promote_to_doctor FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_to_doctor TO service_role;

-- ============================================================
-- 7. Replace blood_sugar RLS with role-aware policies
-- ============================================================
DROP POLICY IF EXISTS "user_blood_sugar_all" ON blood_sugar;

-- Doctors can SELECT data for patients who shared with them
CREATE POLICY "blood_sugar_select"
  ON blood_sugar
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM shared_patients
      WHERE shared_patients.doctor_id = auth.uid()
        AND shared_patients.patient_id = blood_sugar.user_id
        AND 'blood_sugar' = ANY(shared_patients.access_tables)
    )
  );

-- Only the data owner can insert/update/delete
CREATE POLICY "blood_sugar_insert"
  ON blood_sugar
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "blood_sugar_update"
  ON blood_sugar
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "blood_sugar_delete"
  ON blood_sugar
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- 8. Allow doctors to read patient's name from user_settings
-- ============================================================
DROP POLICY IF EXISTS "user_settings_all" ON user_settings;

-- Patient can manage own settings
CREATE POLICY "user_settings_own"
  ON user_settings
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Doctors can only SELECT name/email for linked patients
CREATE POLICY "user_settings_doctor_select"
  ON user_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shared_patients
      WHERE shared_patients.doctor_id = auth.uid()
        AND shared_patients.patient_id = user_settings.user_id
    )
  );
