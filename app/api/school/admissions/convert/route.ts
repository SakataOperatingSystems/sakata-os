import { NextResponse } from "next/server";

import { requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";

export async function GET() {
  try {
    await requirePermission("school.admission_requests.read");

    const { organizationId } = await getOrganizationContext();
    const supabase = await createClient();

    const { data: admissions, error } = await supabase
      .from("student_admission_requests")
      .select(
        "id, admission_request_id, applicant_name, applicant_gender, applicant_date_of_birth, requested_admission_date, status, created_at"
      )
      .eq("organization_id", organizationId)
      .in("status", ["open", "approved"])
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const admissionIds = (admissions ?? []).map((item) => item.id);

    let convertedIds = new Set<string>();

    if (admissionIds.length > 0) {
      const { data: converted } = await supabase
        .from("students")
        .select("admission_request_id")
        .eq("organization_id", organizationId)
        .in("admission_request_id", admissionIds);

      convertedIds = new Set(
        (converted ?? [])
          .map((item) => item.admission_request_id)
          .filter(Boolean)
      );
    }

    return NextResponse.json({
      admissions: (admissions ?? []).filter(
        (item) => !convertedIds.has(item.id)
      ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load admission requests.",
      },
      { status: 500 }
    );
  }
}
