import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Define protected route patterns
  const patientRoutes = /^\/patient(\/|$)/;
  const doctorRoutes = /^\/doctor(\/|$)/;
  const adminRoutes = /^\/admin(\/|$)/;

  // Get user role from session
  const userRole = session?.user?.role;

  // If user is logged in, check role-based access
  if (session) {
    // Patient trying to access doctor routes
    if (doctorRoutes.test(pathname) && userRole !== "doctor") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Doctor trying to access patient routes
    if (patientRoutes.test(pathname) && userRole !== "patient") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Admin routes protection (if needed)
    if (adminRoutes.test(pathname) && userRole !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // If not authenticated and trying to access protected routes, NextAuth will handle redirect to login
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all routes except static files, api, auth pages
    "/((?!api|_next/static|_next/image|favicon.ico|auth|verify|images|sounds|$).*)",
  ],
};
