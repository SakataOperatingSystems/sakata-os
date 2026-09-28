-- ============================================================
-- SAKATA OS
-- Migration: Grant Notification Read Access
-- ============================================================
--
-- RLS policies already restrict rows to the authenticated
-- recipient. PostgreSQL table privileges must also permit the
-- authenticated role to perform SELECT.
--
-- No INSERT / UPDATE / DELETE access is granted.
-- ============================================================

grant select
on public.notifications
to authenticated;

grant select
on public.notification_deliveries
to authenticated;


-- ============================================================
-- COMPLETE
-- ============================================================
