-- SafeX Jobs: Backend Automation & Security Audits Fixes
-- This script contains Row-Level Security policies and Postgres Triggers for PRD compliance.

-- ==========================================
-- 1. MODULE 7: SECURE MESSAGING RLS
-- ==========================================
-- The frontend correctly restricts the Chat UI, but the Database allowed anyone to INSERT messages.
-- This RLS policy ensures that ONLY applicants who are currently in an active interview stage 
-- (and their respective hiring companies) can insert messages.

-- Enable RLS on Messages (if not already enabled)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enforce Active Stage for Messages" ON public.messages;

-- A user can only insert a message if the associated application is in a valid stage.
CREATE POLICY "Enforce Active Stage for Messages"
ON public.messages
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.applications a
        WHERE a.id = application_id
        AND a.status IN ('Shortlisted', 'Test Assigned', 'Test Passed', 'Interview Scheduled', 'Interview Completed', 'Selected', 'Offer Sent', 'Hired')
        AND (a.candidate_id = auth.uid() OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = a.job_id AND (j.company_id = auth.uid() OR j.hiring_manager_id = auth.uid())))
    )
);

-- ==========================================
-- 2. MODULE 6/24: AUTOMATED TEST DEADLINES
-- ==========================================
-- The frontend rejects late tests via JS validation, but an API spoofing could bypass it.
-- This backend Trigger executes BEFORE UPDATE to throw an exception if the deadline has passed.

-- Create the Trigger Function
CREATE OR REPLACE FUNCTION enforce_test_deadline()
RETURNS trigger AS $$
BEGIN
    -- If the candidate is trying to submit the test (changing status to 'Test Submitted')
    IF NEW.status = 'Test Submitted' AND OLD.status != 'Test Submitted' THEN
        -- Check if current time is past the test deadline
        IF now() > NEW.test_deadline THEN
            RAISE EXCEPTION 'TEST_DEADLINE_PASSED: Cannot submit assessment. The deadline has expired.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind the trigger to the `applications` table (assuming tests update the application test fields).
-- Note: Adjust table name if you store Test submissions in a separate `tests` or `submissions` table.
DROP TRIGGER IF EXISTS trigger_enforce_test_deadline ON public.applications;
CREATE TRIGGER trigger_enforce_test_deadline
    BEFORE UPDATE ON public.applications
    FOR EACH ROW
    EXECUTE FUNCTION enforce_test_deadline();
