-- Phase 1 Execution: Database Schema & Overhauls
-- This script safely injects all missing PRD variables into the existing tables.

-- ============================================
-- 1. Profiles Table Expansions
-- ============================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS designation TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- ============================================
-- 2. Jobs Table Expansions
-- ============================================
-- Migrating from implicit binary 'is_active' to an explicit state machine 'status'
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS responsibilities TEXT,
  ADD COLUMN IF NOT EXISTS benefits TEXT,
  ADD COLUMN IF NOT EXISTS required_skills TEXT,
  ADD COLUMN IF NOT EXISTS vacancies INTEGER,
  ADD COLUMN IF NOT EXISTS gender_requirement TEXT,
  ADD COLUMN IF NOT EXISTS age_min INTEGER,
  ADD COLUMN IF NOT EXISTS age_max INTEGER,
  ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Published';

-- Sync legacy 'is_active' boolean to the new textual 'status' flow
UPDATE public.jobs 
SET status = CASE WHEN is_active = true THEN 'Published' ELSE 'Closed' END
WHERE status IS NULL;

-- ============================================
-- 3. Interviews Table Expansions
-- ============================================
ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS interview_location TEXT,
  ADD COLUMN IF NOT EXISTS interviewer_name TEXT,
  ADD COLUMN IF NOT EXISTS additional_instructions TEXT;

-- ============================================
-- 4. Automated Expiration Routine (pg_cron or Trigger Alternative)
-- ============================================
-- Note: 'pg_cron' requires specific Supabase extension activation which the user must toggle in the dashboard.
-- To ensure native compliance without extension risks, we will create a helper function that the frontend 
-- can passively ping, or the admin dashboard can trigger to sweep expired tests.

CREATE OR REPLACE FUNCTION sweep_expired_tests()
RETURNS void AS $$
BEGIN
    UPDATE public.applications
    SET status = 'Test Expired'
    WHERE status = 'Test Assigned' 
      AND test_deadline IS NOT NULL 
      AND test_deadline < now();
END;
$$ LANGUAGE plpgsql;
