-- ============================================================
-- SAKATA OS
-- In-App Notification Delivery Processor
-- ============================================================
--
-- Converts eligible in-app notification deliveries:
--
--   queued → processing → delivered
--
-- This is a trusted internal worker boundary.
-- Authenticated clients cannot execute it directly.
--
-- External channels are intentionally not handled here.
-- ============================================================

create or replace function public.dispatch_notification_deliveries(
    p_limit integer default 25
)
returns table (
    processed_count integer,
    delivered_count integer,
    failed_count integer,
    skipped_count integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_delivery record;
    v_processed integer := 0;
    v_delivered integer := 0;
    v_failed integer := 0;
    v_skipped integer := 0;
begin
    if p_limit < 1 or p_limit > 100 then
        raise exception 'Delivery dispatch limit must be between 1 and 100.';
    end if;

    for v_delivery in
        select
            nd.id,
            nd.organization_id,
            nd.notification_id,
            nd.status,
            nd.attempt_count,
            nd.available_at,
            n.recipient_user_profile_id,
            n.title,
            n.body
        from public.notification_deliveries nd
        join public.notifications n
          on n.id = nd.notification_id
         and n.organization_id = nd.organization_id
        join public.organization_memberships om
          on om.organization_id = n.organization_id
         and om.user_profile_id = n.recipient_user_profile_id
         and om.status = 'active'
        join public.user_profiles up
          on up.id = n.recipient_user_profile_id
         and up.status = 'active'
        where nd.channel = 'in_app'
          and nd.status = 'queued'
          and nd.available_at <= now()
        order by nd.available_at, nd.created_at
        limit p_limit
        for update of nd skip locked
    loop
        v_processed := v_processed + 1;

        begin
            update public.notification_deliveries
            set
                status = 'processing',
                attempt_count = attempt_count + 1,
                started_at = now(),
                last_error = null,
                updated_at = now()
            where id = v_delivery.id
              and status = 'queued';

            if not found then
                v_skipped := v_skipped + 1;
                continue;
            end if;

            /*
             * In-app delivery has no external provider call.
             *
             * The notification intent already exists in the
             * tenant-scoped notification store and is readable
             * by the active recipient through RLS.
             *
             * Therefore successful materialization is the
             * delivery boundary for the current in-app channel.
             */
            update public.notification_deliveries
            set
                status = 'delivered',
                delivered_at = now(),
                failed_at = null,
                last_error = null,
                updated_at = now()
            where id = v_delivery.id
              and status = 'processing';

            if found then
                v_delivered := v_delivered + 1;
            else
                v_skipped := v_skipped + 1;
            end if;

        exception
            when others then
                update public.notification_deliveries
                set
                    status = 'failed',
                    failed_at = now(),
                    delivered_at = null,
                    last_error = left(sqlerrm, 2000),
                    updated_at = now()
                where id = v_delivery.id
                  and status = 'processing';

                if found then
                    v_failed := v_failed + 1;
                else
                    v_skipped := v_skipped + 1;
                end if;
        end;
    end loop;

    return query
    select
        v_processed,
        v_delivered,
        v_failed,
        v_skipped;
end;
$$;


revoke all on function public.dispatch_notification_deliveries(integer)
from public;

revoke all on function public.dispatch_notification_deliveries(integer)
from authenticated;


comment on function public.dispatch_notification_deliveries(integer) is
'Trusted internal delivery processor for tenant-scoped in-app notification deliveries. Claims eligible queued deliveries and advances successful in-app deliveries to delivered. External channels are intentionally outside this processor.';


-- ============================================================
-- COMPLETE
-- ============================================================
