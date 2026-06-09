-- Drop the overly-permissive INSERT policy on video_sessions
DROP POLICY IF EXISTS "Users create own video sessions" ON public.video_sessions;

-- Create a hardened INSERT policy that ties video sessions to valid appointments
CREATE POLICY "Users create own video sessions"
ON public.video_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  patient_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.appointments
    WHERE id = appointment_id
      AND user_id = auth.uid()
      AND doctor_id = video_sessions.doctor_id
  )
);