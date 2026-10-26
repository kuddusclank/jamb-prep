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

  const studentProtectedPaths = [
    "/dashboard",
    "/onboarding",
    "/practice",
    "/mock",
    "/exam",
    "/result",
    "/results",
    "/referrals",
    "/analytics",
    "/settings",
    "/profile",
    "/checkout"
  ];
  const isStudentProtected = studentProtectedPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const schoolProtectedPaths = [
    "/schools/dashboard",
    "/schools/checkout",
    "/schools/students",
    "/schools/mocks",
    "/schools/billing",
    "/schools/settings",
    "/schools/roster"
  ];
  const isSchoolProtected = schoolProtectedPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const isAdminProtected = pathname === "/admin" || pathname.startsWith("/admin/");

  const isProtected = isStudentProtected || isSchoolProtected || isAdminProtected;

  const isStudentAuthPage = pathname === "/login" || pathname === "/register";
  const isSchoolAuthPage =
    pathname === "/schools/login" ||
    pathname === "/schools/register" ||
    pathname === "/schools/forgot-password" ||
    pathname === "/schools/reset-password";
  const isAuthPage = isStudentAuthPage || isSchoolAuthPage;

  const hasAuthCookie = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));

  // Fast-path: Unauthenticated visitor hitting a protected route
  if (isProtected && !hasAuthCookie) {
    const url = request.nextUrl.clone();
    if (isSchoolProtected) {
      url.pathname = "/schools/login";
    } else {
      url.pathname = "/login";
    }
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

  // Unauthenticated check
  if (isProtected && !claims?.sub) {
    const url = request.nextUrl.clone();
    if (isSchoolProtected) {
      url.pathname = "/schools/login";
    } else {
      url.pathname = "/login";
    }
    url.searchParams.set("redirectTo", pathname);
    const redirectRes = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectRes.cookies.set(cookie);
    });
    return redirectRes;
  }

  // Authenticated user role resolution
  let userRole =
    (claims?.user_metadata?.role as string) ||
    (claims?.app_metadata?.role as string) ||
    (claims?.role as string) ||
    "student";

  // If attempting to access admin portal and token claims do not show admin,
  // query database profiles table directly as authoritative fallback
  if (isAdminProtected && userRole !== "admin" && claims?.sub) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", claims.sub)
        .maybeSingle();
      if (profile?.role === "admin") {
        userRole = "admin";
      }
    } catch {}
  }

  // STRICT RBAC RULE 1: Students can NEVER access the school portal
  if (isSchoolProtected && userRole === "student") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.searchParams.set("error", "unauthorized_school_portal");
    const redirectRes = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectRes.cookies.set(cookie);
    });
    return redirectRes;
  }

  // STRICT RBAC RULE 2: School admins can NEVER access the student dashboard
  if (isStudentProtected && userRole === "school_admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/schools/dashboard";
    url.searchParams.set("error", "unauthorized_student_portal");
    const redirectRes = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectRes.cookies.set(cookie);
    });
    return redirectRes;
  }

  // STRICT RBAC RULE 3: None (neither student nor school_admin) can access the admin dashboard
  if (isAdminProtected && userRole !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = userRole === "school_admin" ? "/schools/dashboard" : "/dashboard";
    url.searchParams.set("error", "unauthorized_admin_portal");
    const redirectRes = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectRes.cookies.set(cookie);
    });
    return redirectRes;
  }

  // Redirect signed-in users away from auth pages to their respective dashboards
  if (claims?.sub && isAuthPage) {
    const url = request.nextUrl.clone();
    if (userRole === "school_admin") {
      url.pathname = "/schools/dashboard";
    } else if (userRole === "admin") {
      url.pathname = "/admin";
    } else {
      url.pathname = "/dashboard";
    }
    const redirectRes = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectRes.cookies.set(cookie);
    });
    return redirectRes;
  }

  return supabaseResponse;
}
