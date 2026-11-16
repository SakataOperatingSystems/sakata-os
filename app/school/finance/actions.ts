"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";

import {
  isValidFeeStatusTransition,
  validateFeeStructureInput,
  type FeeStatus,
} from "./validation";

export type FeeActionState = {
  success: boolean;
  error: string | null;
};

function getErrorMessage(
  error: { code?: string; message?: string },
  operation: string
): string {
  if (error.code === "23514") {
    return "The fee structure violates a financial rule.";
  }

  if (error.code === "23503") {
    return "The selected academic period or class is invalid for this organization.";
  }

  if (error.code === "42501") {
    return "You do not have permission to manage fee structures.";
  }

  if (error.code === "23505") {
    return "A matching fee structure already exists.";
  }

  return error.message
    ? `Unable to ${operation} fee structure: ${error.message}`
    : `Unable to ${operation} fee structure.`;
}

function parseInput(formData: FormData) {
  return {
    academicPeriodId: String(formData.get("academic_period_id") ?? ""),
    classId: String(formData.get("class_id") ?? "") || null,
    feeCategory: String(formData.get("fee_category") ?? ""),
    feeItem: String(formData.get("fee_item") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    paymentFrequency: String(formData.get("payment_frequency") ?? ""),
    dueDate: String(formData.get("due_date") ?? "") || null,
    applicability: String(formData.get("applicability") ?? ""),
    status: String(formData.get("status") ?? "draft") as FeeStatus,
    notes: String(formData.get("notes") ?? "") || null,
  };
}

export async function createFeeStructure(
  _previousState: FeeActionState,
  formData: FormData
): Promise<FeeActionState> {
  await requirePermission("school.fees.manage");

  const { organizationId } = await getOrganizationContext();
  const input = parseInput(formData);
  const validation = validateFeeStructureInput(input);

  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors.join(" "),
    };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("school_fee_structures")
    .insert({
      organization_id: organizationId,
      academic_period_id: input.academicPeriodId,
      class_id: input.classId,
      fee_category: input.feeCategory,
      fee_item: input.feeItem.trim(),
      amount: Number(input.amount),
      payment_frequency: input.paymentFrequency,
      due_date: input.dueDate,
      applicability: input.applicability,
      status: input.status,
      notes: input.notes?.trim() || null,
    });

  if (error) {
    return {
      success: false,
      error: getErrorMessage(error, "create"),
    };
  }

  revalidatePath("/school");
  revalidatePath("/school/finance");

  return { success: true, error: null };
}

export async function updateFeeStructure(
  _previousState: FeeActionState,
  formData: FormData
): Promise<FeeActionState> {
  await requirePermission("school.fees.manage");

  const { organizationId } = await getOrganizationContext();
  const id = String(formData.get("id") ?? "");

  if (!id) {
    return {
      success: false,
      error: "Fee structure ID is required.",
    };
  }

  const input = parseInput(formData);
  const validation = validateFeeStructureInput(input);

  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors.join(" "),
    };
  }

  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("school_fee_structures")
    .select("id, status")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (existingError) {
    return {
      success: false,
      error: getErrorMessage(existingError, "load"),
    };
  }

  if (!existing) {
    return {
      success: false,
      error: "Fee structure not found or you do not have access to it.",
    };
  }

  if (
    !isValidFeeStatusTransition(
      existing.status as FeeStatus,
      input.status
    )
  ) {
    return {
      success: false,
      error: `Invalid fee structure status transition: ${existing.status} ? ${input.status}.`,
    };
  }

  const { error } = await supabase
    .from("school_fee_structures")
    .update({
      academic_period_id: input.academicPeriodId,
      class_id: input.classId,
      fee_category: input.feeCategory,
      fee_item: input.feeItem.trim(),
      amount: Number(input.amount),
      payment_frequency: input.paymentFrequency,
      due_date: input.dueDate,
      applicability: input.applicability,
      status: input.status,
      notes: input.notes?.trim() || null,
    })
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (error) {
    return {
      success: false,
      error: getErrorMessage(error, "update"),
    };
  }

  revalidatePath("/school");
  revalidatePath("/school/finance");

  return { success: true, error: null };
}
