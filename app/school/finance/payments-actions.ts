"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { requirePermission } from "@/app/lib/auth/authorization";
import {
  isValidPaymentStatusTransition,
  validatePaymentInput,
  type PaymentStatus,
} from "./payments-validation";

export type PaymentActionState = {
  success: boolean;
  error: string | null;
};

function getErrorMessage(
  error: { code?: string; message?: string },
  operation: string,
): string {
  if (error.code === "23505") {
    return "A payment with this reference already exists in this organization.";
  }

  if (error.code === "23503") {
    return "The selected financial record could not be found.";
  }

  if (error.code === "23514") {
    return "The payment violates a financial operating rule.";
  }

  if (error.code === "42501") {
    return "You do not have permission to perform this financial operation.";
  }

  return error.message ?? `Unable to ${operation} payment.`;
}

export async function createPayment(
  previousState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  try {
    await requirePermission("school.fees.manage");

    const { organizationId } = await getOrganizationContext();
    const supabase = await createClient();

    const input = {
      studentFeeAccountId: String(
        formData.get("student_fee_account_id") ?? "",
      ),
      amount: Number(formData.get("amount") ?? 0),
      paymentDate: String(formData.get("payment_date") ?? ""),
      paymentMethod: String(
        formData.get("payment_method") ?? "",
      ) as never,
      reference: String(formData.get("reference") ?? ""),
      receivedByUserId: String(
        formData.get("received_by_user_id") ?? "",
      ),
      receiptStatus: "pending" as const,
      status: "pending" as const,
      notes: String(formData.get("notes") ?? ""),
    };

    const errors = validatePaymentInput(input);

    if (errors.length > 0) {
      return {
        success: false,
        error: errors.join(" "),
      };
    }

    const { data: account, error: accountError } = await supabase
      .from("school_student_fee_accounts")
      .select("id, balance_amount, status")
      .eq("id", input.studentFeeAccountId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (accountError) {
      return {
        success: false,
        error: getErrorMessage(accountError, "load"),
      };
    }

    if (!account) {
      return {
        success: false,
        error: "Student fee account not found or you do not have access to it.",
      };
    }

    if (account.status === "closed") {
      return {
        success: false,
        error: "Payments cannot be recorded against a closed fee account.",
      };
    }

    if (Number(account.balance_amount) <= 0) {
      return {
        success: false,
        error: "This fee account has no outstanding balance.",
      };
    }

    if (input.amount > Number(account.balance_amount)) {
      return {
        success: false,
        error: "Payment amount cannot exceed the current outstanding balance.",
      };
    }

    const { data: receiverMembership, error: receiverMembershipError } =
      await supabase
        .from("organization_memberships")
        .select("user_profile_id")
        .eq("organization_id", organizationId)
        .eq("user_profile_id", input.receivedByUserId)
        .eq("status", "active")
        .maybeSingle();

    if (receiverMembershipError) {
      return {
        success: false,
        error: getErrorMessage(receiverMembershipError, "load"),
      };
    }

    if (!receiverMembership) {
      return {
        success: false,
        error: "Receiving staff member is not an active member of this organization.",
      };
    }

    const { data: receiver, error: receiverError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", input.receivedByUserId)
      .eq("status", "active")
      .maybeSingle();

    if (receiverError) {
      return {
        success: false,
        error: getErrorMessage(receiverError, "load"),
      };
    }

    if (!receiver) {
      return {
        success: false,
        error: "Receiving staff member is not active.",
      };
    }

    const { error } = await supabase
      .from("school_fee_payments")
      .insert({
        organization_id: organizationId,
        student_fee_account_id: input.studentFeeAccountId,
        amount: input.amount,
        payment_date: input.paymentDate,
        payment_method: input.paymentMethod,
        reference: input.reference.trim(),
        received_by_user_id: input.receivedByUserId,
        receipt_status: "pending",
        status: "pending",
        notes: input.notes.trim() || null,
      });

    if (error) {
      return {
        success: false,
        error: getErrorMessage(error, "create"),
      };
    }

    revalidatePath("/school");
    revalidatePath("/school/finance");
    revalidatePath("/school/finance/accounts");
    revalidatePath("/school/finance/payments");

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to create payment.",
    };
  }
}

async function changePaymentStatus(
  paymentId: string,
  nextStatus: PaymentStatus,
): Promise<PaymentActionState> {
  try {
    await requirePermission("school.fees.manage");

    const { organizationId } = await getOrganizationContext();
    const supabase = await createClient();

    const { data: payment, error: paymentError } = await supabase
      .from("school_fee_payments")
      .select("id, status, amount, student_fee_account_id")
      .eq("id", paymentId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (paymentError) {
      return {
        success: false,
        error: getErrorMessage(paymentError, "load"),
      };
    }

    if (!payment) {
      return {
        success: false,
        error: "Payment not found or you do not have access to it.",
      };
    }

    if (
      !isValidPaymentStatusTransition(
        payment.status as PaymentStatus,
        nextStatus,
      )
    ) {
      return {
        success: false,
        error: `Payment cannot move from ${payment.status} to ${nextStatus}.`,
      };
    }

    if (nextStatus === "confirmed") {
      const { data: account, error: accountError } = await supabase
        .from("school_student_fee_accounts")
        .select("status, balance_amount")
        .eq("id", payment.student_fee_account_id)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (accountError) {
        return {
          success: false,
          error: getErrorMessage(accountError, "load"),
        };
      }

      if (!account || account.status === "closed") {
        return {
          success: false,
          error: "The related fee account is unavailable or closed.",
        };
      }

      if (Number(payment.amount) > Number(account.balance_amount)) {
        return {
          success: false,
          error: "Payment amount exceeds the current outstanding balance.",
        };
      }
    }

    const { error } = await supabase
      .from("school_fee_payments")
      .update({ status: nextStatus })
      .eq("id", paymentId)
      .eq("organization_id", organizationId);

    if (error) {
      return {
        success: false,
        error: getErrorMessage(error, "update"),
      };
    }

    revalidatePath("/school");
    revalidatePath("/school/finance");
    revalidatePath("/school/finance/accounts");
    revalidatePath("/school/finance/payments");

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to change payment status.",
    };
  }
}

export async function confirmPayment(paymentId: string): Promise<void> {
  const result = await changePaymentStatus(paymentId, "confirmed");

  if (!result.success) {
    throw new Error(result.error ?? "Unable to confirm payment.");
  }
}

export async function cancelPayment(paymentId: string): Promise<void> {
  const result = await changePaymentStatus(paymentId, "cancelled");

  if (!result.success) {
    throw new Error(result.error ?? "Unable to cancel payment.");
  }
}

export async function reversePayment(paymentId: string): Promise<void> {
  const result = await changePaymentStatus(paymentId, "reversed");

  if (!result.success) {
    throw new Error(result.error ?? "Unable to reverse payment.");
  }
}
