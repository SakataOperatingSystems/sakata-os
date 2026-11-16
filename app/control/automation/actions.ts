"use server";

import { requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";

export type AutomationActionState = {
  success: boolean;
  error: string | null;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}

export async function createAutomationRule(
  input: {
    name: string;
    description?: string | null;
    eventType: string;
    entityType?: string | null;
    actionType: string;
    actionConfig: Record<string, unknown>;
    enabled?: boolean;
  }
) {
  await requirePermission("core.automation.manage");

  const { organizationId } =
    await getOrganizationContext();

  const supabase = await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "create_automation_rule",
    {
      p_organization_id: organizationId,
      p_name: input.name,
      p_description:
        input.description ?? null,
      p_event_type: input.eventType,
      p_entity_type:
        input.entityType ?? null,
      p_action_type: input.actionType,
      p_action_config:
        input.actionConfig,
      p_enabled:
        input.enabled ?? true,
    }
  );

  if (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Failed to create automation rule."
      )
    );
  }

  if (!data) {
    throw new Error(
      "Automation rule creation did not return a rule."
    );
  }

  return data;
}

export async function executeAutomationJob(
  automationJobId: string
) {
  await requirePermission("core.automation.execute");

  const { organizationId } =
    await getOrganizationContext();

  if (!automationJobId) {
    throw new Error(
      "Automation job is required."
    );
  }

  const supabase = await createClient();

  const {
    data: jobs,
    error: jobError,
  } = await supabase
    .from("automation_jobs")
    .select("id, organization_id")
    .eq("id", automationJobId)
    .eq("organization_id", organizationId)
    .limit(1);

  if (jobError) {
    throw new Error(
      getErrorMessage(
        jobError,
        "Failed to resolve automation job."
      )
    );
  }

  if (!jobs?.length) {
    throw new Error(
      "Automation job not found or you do not have access to it."
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "execute_automation_job",
    {
      p_automation_job_id:
        automationJobId,
    }
  );

  if (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Failed to execute automation job."
      )
    );
  }

  const result =
    Array.isArray(data)
      ? data[0]
      : data;

  if (!result) {
    throw new Error(
      "Automation execution did not return a result."
    );
  }

  return result;
}
