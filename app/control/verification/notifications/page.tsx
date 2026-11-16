import { requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";

type NotificationRow = {
  id: string;
  organization_id: string;
  recipient_user_profile_id: string;
  notification_type: string;
  title: string;
  body: string;
  priority: string;
  status: string;
  dedupe_key: string | null;
  platform_event_id: string | null;
  automation_job_id: string | null;
  created_at: string;
};

type DeliveryRow = {
  id: string;
  organization_id: string;
  notification_id: string;
  channel: string;
  status: string;
  attempt_count: number;
  available_at: string;
  created_at: string;
};

type RpcResult = {
  notification_id: string;
  delivery_id: string;
  created: boolean;
};

export default async function NotificationVerificationPage() {
  await requirePermission("organization.read");

  const { organizationId, organization, profile } =
    await getOrganizationContext();

  const supabase = await createClient();

  const dedupeKey = `verification.in_app.${profile.id}`;

  const firstCall = await supabase.rpc("create_in_app_notification", {
    p_organization_id: organizationId,
    p_recipient_user_profile_id: profile.id,
    p_notification_type: "verification.notification_foundation",
    p_title: "Notification Foundation Verified",
    p_body:
      "SAKATA OS successfully created an authenticated in-app notification and its delivery record.",
    p_priority: "normal",
    p_platform_event_id: null,
    p_automation_job_id: null,
    p_dedupe_key: dedupeKey,
    p_metadata: {
      source: "control.notification_verification",
      verification: true,
    },
  });

  if (firstCall.error) {
    throw new Error(
      `Notification creation failed: ${firstCall.error.message}`
    );
  }

  const firstResult = (firstCall.data?.[0] ?? null) as RpcResult | null;

  if (!firstResult) {
    throw new Error("Notification creation returned no result.");
  }

  const secondCall = await supabase.rpc("create_in_app_notification", {
    p_organization_id: organizationId,
    p_recipient_user_profile_id: profile.id,
    p_notification_type: "verification.notification_foundation",
    p_title: "Notification Foundation Verified",
    p_body:
      "SAKATA OS successfully created an authenticated in-app notification and its delivery record.",
    p_priority: "normal",
    p_platform_event_id: null,
    p_automation_job_id: null,
    p_dedupe_key: dedupeKey,
    p_metadata: {
      source: "control.notification_verification",
      verification: true,
    },
  });

  if (secondCall.error) {
    throw new Error(
      `Notification idempotency test failed: ${secondCall.error.message}`
    );
  }

  const secondResult = (secondCall.data?.[0] ?? null) as RpcResult | null;

  if (!secondResult) {
    throw new Error("Notification idempotency test returned no result.");
  }

  const { data: notification, error: notificationError } = await supabase
    .from("notifications")
    .select(
      "id, organization_id, recipient_user_profile_id, notification_type, title, body, priority, status, dedupe_key, platform_event_id, automation_job_id, created_at"
    )
    .eq("id", firstResult.notification_id)
    .maybeSingle();

  if (notificationError) {
    throw new Error(
      `Failed to read notification through RLS: ${notificationError.message}`
    );
  }

  if (!notification) {
    throw new Error(
      "Notification was created but could not be read by the authenticated recipient."
    );
  }

  const { data: delivery, error: deliveryError } = await supabase
    .from("notification_deliveries")
    .select(
      "id, organization_id, notification_id, channel, status, attempt_count, available_at, created_at"
    )
    .eq("id", firstResult.delivery_id)
    .maybeSingle();

  if (deliveryError) {
    throw new Error(
      `Failed to read notification delivery through RLS: ${deliveryError.message}`
    );
  }

  if (!delivery) {
    throw new Error(
      "Notification delivery was created but could not be read by the authenticated recipient."
    );
  }

  const checks = [
    {
      label: "Authenticated recipient",
      pass:
        notification.recipient_user_profile_id === profile.id &&
        notification.organization_id === organizationId,
    },
    {
      label: "Tenant isolation",
      pass: notification.organization_id === organizationId,
    },
    {
      label: "Notification readable through RLS",
      pass: notification.id === firstResult.notification_id,
    },
    {
      label: "In-app delivery created",
      pass:
        delivery.notification_id === notification.id &&
        delivery.channel === "in_app",
    },
    {
      label: "Delivery queued",
      pass: delivery.status === "queued",
    },
    {
      label: "Notification persisted",
      pass:
        notification.status === "unread" &&
        notification.dedupe_key === dedupeKey,
    },
    {
      label: "Second call was idempotent",
      pass:
        secondResult.created === false &&
        secondResult.notification_id === firstResult.notification_id &&
        secondResult.delivery_id === firstResult.delivery_id,
    },
  ];

  const passed = checks.filter((check) => check.pass).length;
  const failed = checks.length - passed;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
            SAKATA OS / Verification
          </p>

          <h1 className="mt-2 text-3xl font-semibold">
            Notification Foundation
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Live authenticated verification of notification intent, recipient
            resolution, in-app delivery, RLS visibility, persistence, and
            idempotency.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Organization
              </p>

              <p className="mt-1 text-sm font-medium text-white">
                {organization.name}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Recipient
              </p>

              <p className="mt-1 text-sm font-medium text-white">
                {profile.display_name}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Recipient Profile
              </p>

              <p className="mt-1 break-all font-mono text-xs text-slate-400">
                {profile.id}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">
                Verification Checks
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {passed} passed · {failed} failed
              </p>
            </div>

            <div
              className={`rounded-full border px-4 py-2 text-xs font-semibold ${
                failed === 0
                  ? "border-emerald-700 bg-emerald-950/40 text-emerald-300"
                  : "border-red-700 bg-red-950/40 text-red-300"
              }`}
            >
              {failed === 0 ? "PASS" : "FAIL"}
            </div>
          </div>

          <div className="mt-6 divide-y divide-slate-800">
            {checks.map((check) => (
              <div
                key={check.label}
                className="flex items-center justify-between gap-4 py-4"
              >
                <span className="text-sm text-slate-300">
                  {check.label}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    check.pass
                      ? "bg-emerald-950/50 text-emerald-300"
                      : "bg-red-950/50 text-red-300"
                  }`}
                >
                  {check.pass ? "PASS" : "FAIL"}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Notification
            </p>

            <h2 className="mt-2 text-lg font-semibold">
              {notification.title}
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              {notification.body}
            </p>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Status</dt>
                <dd className="font-medium text-white">
                  {notification.status}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Priority</dt>
                <dd className="font-medium text-white">
                  {notification.priority}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Dedupe</dt>
                <dd className="font-mono text-xs text-slate-400">
                  {notification.dedupe_key}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Delivery
            </p>

            <h2 className="mt-2 text-lg font-semibold">
              In-App
            </h2>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Channel</dt>
                <dd className="font-medium text-white">
                  {delivery.channel}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Status</dt>
                <dd className="font-medium text-white">
                  {delivery.status}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Attempts</dt>
                <dd className="font-medium text-white">
                  {delivery.attempt_count}
                </dd>
              </div>

              <div>
                <dt className="text-slate-500">Delivery ID</dt>
                <dd className="mt-1 break-all font-mono text-xs text-slate-400">
                  {delivery.id}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Idempotency
          </p>

          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-slate-400">
                Current call
              </p>

              <p className="mt-1 font-medium text-emerald-300">
                {firstResult.created ? "Created" : "Reused"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-400">
                Second call
              </p>

              <p className="mt-1 font-medium text-emerald-300">
                {secondResult.created
                  ? "Created duplicate"
                  : "Reused existing"}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
