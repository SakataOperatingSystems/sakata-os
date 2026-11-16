import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createClient,
  getOrganizationContext,
  revalidatePath,
  requirePermission,
} = vi.hoisted(() => ({
  createClient: vi.fn(),
  getOrganizationContext: vi.fn(),
  revalidatePath: vi.fn(),
  requirePermission: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/app/lib/auth/authorization", () => ({ requirePermission }));
vi.mock("@/app/lib/auth/organization-context", () => ({
  getOrganizationContext,
}));
vi.mock("@/app/lib/supabase/server", () => ({ createClient }));

import { updateAttendance } from "@/app/school/attendance/actions";

const organizationId = "123e4567-e89b-42d3-a456-426614174000";
const attendanceId = "123e4567-e89b-42d3-a456-426614174001";
const enrollmentId = "123e4567-e89b-42d3-a456-426614174002";

function createForm(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

function createSupabaseMock(enrollment: { id: string; status: string } | null) {
  const enrollmentMaybeSingle = vi.fn().mockResolvedValue({
    data: enrollment,
    error: null,
  });
  const enrollmentQuery: Record<string, ReturnType<typeof vi.fn>> = {};
  enrollmentQuery.select = vi.fn(() => enrollmentQuery);
  enrollmentQuery.eq = vi.fn(() => enrollmentQuery);
  enrollmentQuery.maybeSingle = enrollmentMaybeSingle;

  const attendanceSingle = vi.fn().mockResolvedValue({
    data: { id: attendanceId },
    error: null,
  });
  const attendanceQuery: Record<string, ReturnType<typeof vi.fn>> = {};
  attendanceQuery.update = vi.fn(() => attendanceQuery);
  attendanceQuery.eq = vi.fn(() => attendanceQuery);
  attendanceQuery.select = vi.fn(() => attendanceQuery);
  attendanceQuery.single = attendanceSingle;

  const from = vi.fn((table: string) => {
    if (table === "student_enrollments") {
      return enrollmentQuery;
    }
    if (table === "student_attendance") {
      return attendanceQuery;
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    client: { from },
    enrollmentMaybeSingle,
    enrollmentQuery,
    attendanceQuery,
    attendanceSingle,
    from,
  };
}

describe("attendance update enrollment integrity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePermission.mockResolvedValue(undefined);
    getOrganizationContext.mockResolvedValue({ organizationId });
  });

  const form = () =>
    createForm({
      id: attendanceId,
      enrollment_id: enrollmentId,
      attendance_date: "2026-10-17",
      status: "present",
      notes: "",
    });

  it("updates attendance only after confirming an active same-organization enrollment", async () => {
    const supabase = createSupabaseMock({ id: enrollmentId, status: "active" });
    createClient.mockResolvedValue(supabase.client);

    const result = await updateAttendance(
      { success: false, error: null },
      form(),
    );

    expect(result).toEqual({ success: true, error: null });
    expect(supabase.from).toHaveBeenCalledWith("student_enrollments");
    expect(supabase.enrollmentQuery.eq).toHaveBeenNthCalledWith(
      1,
      "id",
      enrollmentId,
    );
    expect(supabase.enrollmentQuery.eq).toHaveBeenNthCalledWith(
      2,
      "organization_id",
      organizationId,
    );
    expect(supabase.from).toHaveBeenCalledWith("student_attendance");
    expect(supabase.attendanceQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ enrollment_id: enrollmentId }),
    );
    expect(supabase.attendanceQuery.eq).toHaveBeenLastCalledWith(
      "organization_id",
      organizationId,
    );
    expect(supabase.attendanceSingle).toHaveBeenCalledOnce();
  });

  it.each([
    ["inactive", { id: enrollmentId, status: "completed" }],
    ["missing or outside the organization", null],
  ])("rejects an enrollment that is %s", async (_description, enrollment) => {
    const supabase = createSupabaseMock(enrollment);
    createClient.mockResolvedValue(supabase.client);

    const result = await updateAttendance(
      { success: false, error: null },
      form(),
    );

    expect(result.success).toBe(false);
    expect(supabase.from).not.toHaveBeenCalledWith("student_attendance");
    expect(supabase.attendanceQuery.update).not.toHaveBeenCalled();
    expect(supabase.attendanceSingle).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
