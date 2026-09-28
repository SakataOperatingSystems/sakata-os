"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";

export async function convertAdmissionToStudent(admissionId: string) {
  await requirePermission("school.admission_requests.read");

  const { organizationId } = await getOrganizationContext();

  if (!admissionId) {
    throw new Error("Admission request is required.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "convert_student_admission_request",
    {
      p_organization_id: organizationId,
      p_admission_id: admissionId,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  const result = Array.isArray(data) ? data[0] : data;

  if (!result) {
    throw new Error("Student conversion did not return a result.");
  }

  revalidatePath("/school/admissions");
  revalidatePath("/school/students");
  revalidatePath("/school/admissions/convert");

  return {
    studentId: result.student_id,
    studentReference: result.student_reference,
    admissionId: result.admission_id,
    admissionReference: result.admission_reference,
  };
}
