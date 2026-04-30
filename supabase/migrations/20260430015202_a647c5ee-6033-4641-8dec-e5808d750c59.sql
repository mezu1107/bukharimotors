-- Fix search_path on trigger helper functions
ALTER FUNCTION public.gen_booking_no() SET search_path = public;
ALTER FUNCTION public.touch_updated_at() SET search_path = public;

-- Revoke anon execute on security definer helpers (only authenticated should call)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_staff_or_above(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_manager_or_above(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_or_above(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager_or_above(uuid) TO authenticated;