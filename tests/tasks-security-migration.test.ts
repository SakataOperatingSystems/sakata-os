import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20261116120000_harden_task_access_and_lifecycle.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("task access and lifecycle migration", () => {
  it("replaces member-only task reads with permission-checked tenant reads", () => {
    expect(migration).toContain(
      'drop policy if exists "organization members can read tasks"',
    );
    expect(migration).toContain(
      "public.is_current_user_org_member(organization_id)",
    );
    expect(migration).toContain("'core.tasks.read'");
    expect(migration).not.toMatch(/disable row level security/i);
  });

  it("enforces initial task status and allowed transitions in the database", () => {
    expect(migration).toContain("public.organization_memberships om");
    expect(migration).toContain("up.status = 'active'");
    expect(migration).toContain(
      "before insert or update on public.tasks",
    );
    expect(migration).toContain("new.status <> 'open'");
    expect(migration).toContain("old.status = 'open'");
    expect(migration).toContain("new.status in ('in_progress', 'cancelled')");
    expect(migration).toContain("old.status = 'in_progress'");
    expect(migration).toContain(
      "new.status in ('open', 'completed', 'cancelled')",
    );
    expect(migration).toContain("using errcode = '23514'");
    expect(migration).toContain(
      "before insert or update on public.tasks",
    );
  });
});
