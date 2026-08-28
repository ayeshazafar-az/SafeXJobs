-- SafeX Jobs: Fix RLS for Complete Recruitment Ecosystem
-- Fixes critical gap where Companies and Hiring Managers could not view Candidate profiles.

-- Drop the restrictive policy that prevents Job Matching and Candidate Review
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- FIX: Allow all authenticated users to view profiles on the platform.
-- Standard operation for professional networks and job boards.
-- The application UI will gate what data is shown.
CREATE POLICY "Allow authenticated users to view profiles"
  ON public.profiles
  FOR SELECT
  USING ( auth.role() = 'authenticated' );
