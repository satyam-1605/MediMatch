
-- 1) video_sessions: drop overly-permissive policies, scope to patient or assigned doctor
DROP POLICY IF EXISTS "Any authenticated read video sessions" ON public.video_sessions;
DROP POLICY IF EXISTS "Authenticated users update video sessions" ON public.video_sessions;

CREATE POLICY "Participants read own video sessions"
ON public.video_sessions
FOR SELECT TO authenticated
USING (
  patient_id = auth.uid()
  OR (
    public.has_role(auth.uid(), 'doctor'::app_role)
    AND doctor_id = (SELECT dp.doctor_id FROM public.doctor_profiles dp WHERE dp.id = auth.uid())
  )
);

CREATE POLICY "Participants update own video sessions"
ON public.video_sessions
FOR UPDATE TO authenticated
USING (
  patient_id = auth.uid()
  OR (
    public.has_role(auth.uid(), 'doctor'::app_role)
    AND doctor_id = (SELECT dp.doctor_id FROM public.doctor_profiles dp WHERE dp.id = auth.uid())
  )
)
WITH CHECK (
  patient_id = auth.uid()
  OR (
    public.has_role(auth.uid(), 'doctor'::app_role)
    AND doctor_id = (SELECT dp.doctor_id FROM public.doctor_profiles dp WHERE dp.id = auth.uid())
  )
);

-- 2) profiles: restrict doctors to patients who have an appointment with them
DROP POLICY IF EXISTS "Doctors read patient profiles" ON public.profiles;

CREATE POLICY "Doctors read appointed patient profiles"
ON public.profiles
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'doctor'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.doctor_profiles dp ON dp.doctor_id = a.doctor_id
    WHERE a.user_id = profiles.id
      AND dp.id = auth.uid()
  )
);

-- 3) user_roles: explicit deny for self-mutation (only service_role / SECURITY DEFINER functions can write)
DROP POLICY IF EXISTS "No self insert user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "No self update user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "No self delete user_roles" ON public.user_roles;

CREATE POLICY "No self insert user_roles"
ON public.user_roles AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (false);

CREATE POLICY "No self update user_roles"
ON public.user_roles AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "No self delete user_roles"
ON public.user_roles AS RESTRICTIVE
FOR DELETE TO authenticated
USING (false);

-- 4) storage.objects: add UPDATE policy for medical-reports bucket scoped to owner folder
DROP POLICY IF EXISTS "Users update own reports" ON storage.objects;
CREATE POLICY "Users update own reports"
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'medical-reports' AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'medical-reports' AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 5) realtime.messages: restrict broadcast/presence subscriptions to user-scoped topics
DROP POLICY IF EXISTS "Authenticated users access own realtime topics" ON realtime.messages;
CREATE POLICY "Authenticated users access own realtime topics"
ON realtime.messages
FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE '%' || auth.uid()::text || '%'
);

DROP POLICY IF EXISTS "Authenticated users send own realtime topics" ON realtime.messages;
CREATE POLICY "Authenticated users send own realtime topics"
ON realtime.messages
FOR INSERT TO authenticated
WITH CHECK (
  realtime.topic() LIKE '%' || auth.uid()::text || '%'
);

-- 6) Revoke execute on internal SECURITY DEFINER functions from public/anon
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.approve_doctor_registration(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_doctor_registration(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.register_doctor_with_code(uuid, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
