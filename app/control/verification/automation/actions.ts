"use server";

import { requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";

export type AutomationVerificationResult = {
  success: boolean;
  error: string | null;
  ruleId: string | null;
  eventId: string | null;
  jobId: string | null;
  executionStatus: string | null;
  notificationId: string | null;
  deliveryId: string | null;
};

export async function runAutomationVerification(): Promise<AutomationVerificationResult> {
  const base: AutomationVerificationResult = {
    success: false,
    error: null,
    ruleId: null,
    eventId: null,
    jobId: null,
    executionStatus: null,
    notificationId: null,
    deliveryId: null,
  };

  try {
    await requirePermission("core.automation.manage");
    await requirePermission("core.automation.read");
    await requirePermission("core.automation.execute");

    const { organizationId } = await getOrganizationContext();
    const supabase = await createClient();

    const verificationKey = `automation-verification-${Date.now()}`;

    const { data: rule, error: ruleError } = await supabase.rpc(
      "create_automation_rule",
      {
        p_organization_id: organizationId,
        p_name: `Automation Verification ${verificationKey}`,
        p_description:
          "Temporary verification rule proving the authenticated automation event-to-notification execution path.",
        p_event_type: "automation.verification.created",
        p_entity_type: "automation_verification",
        p_action_type: "notification.in_app",
        p_action_config: {
          notification_type: "automation_verification",
          title: "Automation verification completed",
          body: "SAKATA OS successfully executed an automation rule and created an in-app notification.",
          priority: "normal",
          recipient_mode: "event_actor",
        },
        p_enabled: true,
      }
    );

    if (ruleError) {
      throw new Error(ruleError.message);
    }

    const createdRule = Array.isArray(rule) ? rule[0] : rule;

    if (!createdRule?.id) {
      throw new Error("Automation rule creation returned no rule.");
    }

    base.ruleId = createdRule.id;

    const { data: event, error: eventError } = await supabase.rpc(
      "emit_platform_event",
      {
        p_organization_id: organizationId,
        p_event_type: "automation.verification.created",
        p_entity_type: "automation_verification",
        p_entity_id: null,
        p_occurred_at: new Date().toISOString(),
        p_payload: {
          verification_key: verificationKey,
          purpose: "authenticated_automation_e2e",
        },
      }
    );

    if (eventError) {
      throw new Error(eventError.message);
    }

    const createdEvent = Array.isArray(event) ? event[0] : event;

    if (!createdEvent?.id) {
      throw new Error("Platform event creation returned no event.");
    }

    base.eventId = createdEvent.id;

    const { data: jobs, error: jobError } = await supabase
      .from("automation_jobs")
      .select("id, organization_id, automation_rule_id, platform_event_id, status")
      .eq("organization_id", organizationId)
      .eq("automation_rule_id", createdRule.id)
      .eq("platform_event_id", createdEvent.id)
      .limit(1);

    if (jobError) {
      throw new Error(jobError.message);
    }

    const job = jobs?.[0];

    if (!job?.id) {
      throw new Error("Automation event did not produce a queued job.");
    }

    base.jobId = job.id;

    const { data: execution, error: executionError } = await supabase.rpc(
      "execute_automation_job",
      {
        p_automation_job_id: job.id,
      }
    );

    if (executionError) {
      throw new Error(executionError.message);
    }

    const result = Array.isArray(execution) ? execution[0] : execution;

    if (!result) {
      throw new Error("Automation execution returned no result.");
    }

    base.executionStatus = result.status ?? null;
    base.notificationId = result.notification_id ?? null;
    base.deliveryId = result.delivery_id ?? null;
    base.success =
      result.status === "completed" &&
      Boolean(result.notification_id) &&
      Boolean(result.delivery_id);

    if (!base.success) {
      throw new Error(
        `Automation execution did not complete successfully. Status: ${result.status ?? "unknown"}.`
      );
    }

    return base;
  } catch (error) {
    return {
      ...base,
      error: error instanceof Error ? error.message : "Automation verification failed.",
    };
  }
}
