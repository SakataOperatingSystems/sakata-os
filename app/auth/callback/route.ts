import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL("/login?confirmation=failed", request.url)
    );
  }

  const next = request.nextUrl.searchParams.get("next");
  const destination =
    next === "/auth/recover" ? next : "/auth/continue";

  return NextResponse.redirect(new URL(destination, request.url));
}
