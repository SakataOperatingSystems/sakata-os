"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { requirePermission } from "@/app/lib/auth/authorization";
import {
  getBursarFollowUpTaskDetails,
  getBursarOperationalState,
  type BursarAccount,
} from "./validation";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function createBursarFollowUpTask(
  formData: FormData
): Promise<void> {
  await requirePermission("school.fees.read");
  await requirePermission("core.tasks.manage");

  const accountId = String(formData.get("accountId") ?? "").trim();

  if (!UUID_PATTERN.test(accountId)) {
    throw new Error("Invalid fee account ID.");
  }

  const { organizationId, profile } = await getOrganizationContext();
  const supabase = await createClient();

  const { data: accountRow, error: accountError } = await supabase
    .from("school_student_fee_accounts")
    .select(
      "id, student_id, fee_structure_id, gross_required_amount, approved_support_amount, net_required_amount, confirmed_payments_amount, balance_amount, due_date, status"
    )
    .eq("id", accountId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (accountError) {
    throw new Error(
      `Failed to load fee account for follow-up: ${accountError.message}`
    );
  }

  if (!accountRow) {
    throw new Error("Fee account not found or you do not have access to it.");
  }

  const balance = Number(accountRow.balance_amount ?? 0);

  if (balance <= 0 || accountRow.status === "closed") {
    throw new Error(
      "Only an open fee account with an outstanding balance can receive a follow-up task."
    );
  }

  const [
    { data: student, error: studentError },
    { data: feeStructure, error: feeStructureError },
  ] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name")
      .eq("id", accountRow.student_id)
      .eq("organization_id", organizationId)
      .maybeSingle(),

    supabase
      .from("school_fee_structures")
      .select("id, fee_category, fee_item")
      .eq("id", accountRow.fee_structure_id)
      .eq("organization_id", organizationId)
      .maybeSingle(),
  ]);

  if (studentError) {
    throw new Error(
      `Failed to load student for follow-up: ${studentError.message}`
    );
  }

  if (feeStructureError) {
    throw new Error(
      `Failed to load fee structure for follow-up: ${feeStructureError.message}`
    );
  }

  if (!student) {
    throw new Error(
      "The fee account references a student that is not available in this organization."
    );
  }

  if (!feeStructure) {
    throw new Error(
      "The fee account references a fee structure that is not available in this organization."
    );
  }

  const account: BursarAccount = {
    id: accountRow.id,
    studentName: student.full_name,
    feeItem: feeStructure.fee_item,
    feeCategory: feeStructure.fee_category,
    grossRequired: Number(accountRow.gross_required_amount ?? 0),
    approvedSupport: Number(accountRow.approved_support_amount ?? 0),
    netRequired: Number(accountRow.net_required_amount ?? 0),
    confirmedPayments: Number(accountRow.confirmed_payments_amount ?? 0),
    balance,
    dueDate: accountRow.due_date,
    status: accountRow.status,
  };

  const today = new Date().toISOString().slice(0, 10);
  const operationalState = getBursarOperationalState(account, today);

  if (
    operationalState.state === "current" ||
    operationalState.state === "settled"
  ) {
    throw new Error(
      "This account does not currently require an exception follow-up task."
    );
  }

  const taskDetails = getBursarFollowUpTaskDetails(account, today);

  if (!taskDetails) {
    throw new Error("Unable to build the Bursar follow-up task.");
  }

  const { error: taskError } = await supabase.rpc(
    "create_task_for_current_user",
    {
      p_organization_id: organizationId,
      p_title: taskDetails.title,
      p_description: taskDetails.description,
      p_priority: taskDetails.priority,
      p_assigned_to_user_id: profile.id,
      p_due_at: taskDetails.dueAt,
    }
  );

  if (taskError) {
    throw new Error(
      `Failed to create Bursar follow-up task: ${taskError.message}`
    );
  }

  revalidatePath("/school/finance/bursar");
  revalidatePath("/control/tasks");
}
