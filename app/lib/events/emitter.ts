import "server-only";

import { createClient } from "@/app/lib/supabase/server";

export type PlatformEventInput = {
  organizationId: string;
  eventType: string;
  entityType: string;
  entityId?: string | null;
  occurredAt?: string;
  payload?: Record<string, unknown>;
};

export async function emitPlatformEvent(
  input: PlatformEventInput
) {
  const eventType = input.eventType.trim();
  const entityType = input.entityType.trim();

  if (!input.organizationId) {
    throw new Error("Organization ID is required to emit a platform event.");
  }

  if (!eventType) {
    throw new Error("Event type is required.");
  }

  if (!entityType) {
    throw new Error("Entity type is required.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "emit_platform_event",
    {
      p_organization_id: input.organizationId,
      p_event_type: eventType,
      p_entity_type: entityType,
      p_entity_id: input.entityId ?? null,
      p_occurred_at: input.occurredAt ?? new Date().toISOString(),
      p_payload: input.payload ?? {},
    }
  );

  if (error) {
    throw new Error(
      `Failed to emit platform event: ${error.message}`
    );
  }

  return data;
}
