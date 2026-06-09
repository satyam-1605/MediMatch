DROP POLICY IF EXISTS "Users insert own notifications" ON public.notifications;

CREATE POLICY "Users insert own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND type IN ('booking_confirmed', 'booking_cancelled')
  AND booking_ref IS NOT NULL
  AND length(booking_ref) BETWEEN 1 AND 64
  AND title IS NOT NULL AND length(title) BETWEEN 1 AND 120
  AND message IS NOT NULL AND length(message) BETWEEN 1 AND 1000
  AND COALESCE(read, false) = false
  AND EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.booking_ref = notifications.booking_ref
      AND a.user_id = auth.uid()
  )
);