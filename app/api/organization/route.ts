import { NextResponse } from "next/server";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { requirePermission } from "@/app/lib/auth/authorization";

export async function GET() {
  try {
    await requirePermission("organization.read");

    const { organization } = await getOrganizationContext();

    return NextResponse.json({
      ok: true,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        type: organization.organization_type,
        status: organization.status,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("Forbidden:")
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Forbidden",
        },
        { status: 403 }
      );
    }

    if (
      error instanceof Error &&
      error.message.includes("Authenticated user")
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    console.error("Organization API error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}