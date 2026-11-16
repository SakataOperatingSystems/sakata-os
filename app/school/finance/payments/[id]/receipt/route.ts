import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    await requirePermission("school.fees.read");

    const { organizationId } = await getOrganizationContext();
    const { id } = await context.params;
    const supabase = await createClient();

    const { data: payment, error } = await supabase
      .from("school_fee_payments")
      .select("id, organization_id, student_fee_account_id, amount, payment_date, payment_method, reference, received_by_user_id, receipt_status, status, notes")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Unable to load payment." }, { status: 500 });
    }

    if (!payment) {
      return NextResponse.json({ error: "Payment not found." }, { status: 404 });
    }

    if (payment.status !== "confirmed" || payment.receipt_status !== "issued") {
      return NextResponse.json(
        { error: "A receipt is available only for a confirmed payment with an issued receipt status." },
        { status: 409 },
      );
    }

    const [
      { data: account, error: accountError },
      { data: organization, error: organizationError },
      { data: receiver, error: receiverError },
    ] = await Promise.all([
      supabase
        .from("school_student_fee_accounts")
        .select("id, student_id")
        .eq("id", payment.student_fee_account_id)
        .eq("organization_id", organizationId)
        .maybeSingle(),
      supabase
        .from("organizations")
        .select("id, name")
        .eq("id", organizationId)
        .maybeSingle(),
      supabase
        .from("user_profiles")
        .select("id, display_name")
        .eq("id", payment.received_by_user_id)
        .maybeSingle(),
    ]);

    if (accountError || organizationError || receiverError || !account || !organization) {
      return NextResponse.json(
        { error: "Unable to load receipt details." },
        { status: 500 },
      );
    }

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, full_name")
      .eq("id", account.student_id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json(
        { error: "Unable to load student details." },
        { status: 500 },
      );
    }

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]);
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const dark = rgb(0.10, 0.15, 0.23);
    const muted = rgb(0.40, 0.44, 0.50);
    const left = 52;

    page.drawRectangle({
      x: 0, y: 720, width: 595.28, height: 121.89, color: dark,
    });

    page.drawText(String(organization.name).slice(0, 75), {
      x: left, y: 792, size: 21, font: bold, color: rgb(1, 1, 1),
    });
    page.drawText("OFFICIAL PAYMENT RECEIPT", {
      x: left, y: 761, size: 12, font: bold, color: rgb(1, 1, 1),
    });
    page.drawText(`Reference: ${payment.reference}`.slice(0, 90), {
      x: left, y: 739, size: 10, font: regular, color: rgb(1, 1, 1),
    });

    page.drawText("PAYMENT DETAILS", {
      x: left, y: 681, size: 11, font: bold, color: dark,
    });

    const rows: Array<[string, string]> = [
      ["Student", String(student.full_name)],
      ["Payment date", String(payment.payment_date)],
      ["Payment method", String(payment.payment_method).replaceAll("_", " ")],
      ["Received by", String(receiver?.display_name ?? "Staff member")],
      ["Payment status", "CONFIRMED"],
      ["Receipt status", "ISSUED"],
    ];

    let y = 640;
    for (const [label, value] of rows) {
      page.drawText(label, {
        x: left, y, size: 10, font: regular, color: muted,
      });
      page.drawText(value.slice(0, 80), {
        x: 220, y, size: 11, font: bold, color: dark,
      });
      y -= 34;
    }

    page.drawRectangle({
      x: left, y: 335, width: 491, height: 66,
      color: rgb(0.95, 0.97, 0.99),
    });
    page.drawText("AMOUNT RECEIVED", {
      x: left + 14, y: 377, size: 10, font: bold, color: muted,
    });
    page.drawText(
      `UGX ${Number(payment.amount).toLocaleString("en-UG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      { x: left + 14, y: 351, size: 19, font: bold, color: dark },
    );

    if (payment.notes) {
      page.drawText("Notes", {
        x: left, y: 296, size: 10, font: bold, color: muted,
      });
      page.drawText(String(payment.notes).slice(0, 100), {
        x: left, y: 278, size: 10, font: regular, color: dark,
      });
    }

    page.drawText("Generated from the SAKATA OS payment ledger.", {
      x: left, y: 84, size: 9, font: regular, color: muted,
    });

    const bytes = await pdf.save();
    const filename = String(payment.reference).replace(/[^a-zA-Z0-9_-]/g, "_");

    return new Response(bytes.slice().buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="receipt-${filename}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error(
      "Receipt generation failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { error: "Unable to generate receipt." },
      { status: 500 },
    );
  }
}