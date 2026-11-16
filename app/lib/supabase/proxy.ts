import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const sanitizedUrl = request.nextUrl.clone();
  let removedSensitiveQuery = false;

  for (const parameter of Array.from(sanitizedUrl.searchParams.keys())) {
    if (["password", "passwd", "pass"].includes(parameter.toLowerCase())) {
      sanitizedUrl.searchParams.delete(parameter);
      removedSensitiveQuery = true;
    }
  }

  if (sanitizedUrl.pathname === "/login") {
    for (const parameter of Array.from(sanitizedUrl.searchParams.keys())) {
      if (["email", "username"].includes(parameter.toLowerCase())) {
        sanitizedUrl.searchParams.delete(parameter);
        removedSensitiveQuery = true;
      }
    }
  }

  if (removedSensitiveQuery) {
    return NextResponse.redirect(sanitizedUrl);
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);

            supabaseResponse = NextResponse.next({
              request,
            });

            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data } = await supabase.auth.getClaims();

  const claims = data?.claims;

  const isAuthCallback =
    request.nextUrl.pathname === "/auth/callback";
  const isLocalPreferencePage = request.nextUrl.pathname === "/preferences";
  const isPublicLanding = request.nextUrl.pathname === "/";

  if (
    !claims &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !isAuthCallback &&
    !isLocalPreferencePage &&
    !isPublicLanding
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";

    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}