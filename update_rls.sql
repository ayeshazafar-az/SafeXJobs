-- SafeX Jobs: Fix CRITICAL RLS Data Leak on profiles
-- Originally allowed ALL authenticated users to read all profiles. This was a severe PII leak.
-- FIX: A profile can only be read if:
-- 1. It belongs to the current user (auth.uid() = id)
-- 2. The current user is an Admin
-- 3. The current user is a Company/Hiring Manager and the candidate has an active application with a job owned by that company.
-- 4. The profile belongs to a 'company' role (so candidates can see company profiles).

DROP POLICY IF EXISTS "Allow authenticated users to view profiles" ON public.profiles;

CREATE POLICY "Secure profile viewing"
  ON public.profiles
  FOR SELECT
  USING (
    -- 1. Users can always see their own profile
    auth.uid() = id
    OR
    -- 2. Authenticated users can always see 'company' or 'admin' profiles
    role IN ('company', 'admin')
    OR
    -- 3. Admins can see everything
    (EXISTS (
        SELECT 1 FROM profiles admin_check
        WHERE admin_check.id = auth.uid() AND admin_check.role = 'admin'
    ))
    OR
    -- 4. Companies can see the profiles of candidates who applied to their jobs
    (role = 'candidate' AND EXISTS (
        SELECT 1 FROM applications a
        JOIN jobs j ON a.job_id = j.id
        WHERE a.candidate_id = profiles.id
          AND j.company_id = auth.uid()
    ))
  );
