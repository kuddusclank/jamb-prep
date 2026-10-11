import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveLegacyDeepLinkRedirect } from "@/lib/routing/deep-links";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;
  const legacyRedirect = resolveLegacyDeepLinkRedirect(pathname, request.nextUrl.search);
  if (legacyRedirect) {
    return NextResponse.redirect(new URL(legacyRedirect.target, request.url), legacyRedirect.status);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Gracefully handle unconfigured local dev environment
  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  // Static files and webhooks don't need auth processing
  if (pathname.startsWith("/api/webhooks")) {
    return supabaseResponse;
  }

  const protectedPaths = ["/dashboard", "/onboarding", "/practice", "/mock", "/exam", "/result", "/results", "/referrals", "/analytics", "/settings", "/profile", "/checkout"];
  const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAuthPage = pathname === "/login" || pathname === "/register";

  const hasAuthCookie = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));

  // Fast-path: Unauthenticated visitor hitting a protected route
  if (isProtected && !hasAuthCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Public routes validate identity in their data-loading code when needed.
  if (!isProtected && !isAuthPage) {
    return supabaseResponse;
  }

  // Only create client and validate/refresh user if auth cookies are present
  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data, error } = await supabase.auth.getClaims();
  const claims = error ? null : data?.claims;

  if (isProtected && !claims?.sub) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    const redirectRes = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectRes.cookies.set(cookie);
    });
    return redirectRes;
  }

  // Redirect signed-in users away from auth pages
  if (claims?.sub && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    const redirectRes = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectRes.cookies.set(cookie);
    });
    return redirectRes;
  }

  return supabaseResponse;
}
