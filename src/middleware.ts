import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Define role-based access control
const ADMIN_ROLES = ["ADMIN", "OWNER"];
const STAFF_ROLES = ["ADMIN", "OWNER", "MANAGER", "FRONT_DESK", "HOUSEKEEPER"];

export async function middleware(request: NextRequest) {
  // Skip middleware for API routes - they handle their own auth
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const token = await getToken({ 
    req: request, 
    cookieName: process.env.NODE_ENV === "production" ? 
      "__Secure-next-auth.session-token" : "next-auth.session-token",
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  // Check if the route is under /admin
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // Always allow access to the admin login page without authentication
    if (request.nextUrl.pathname === "/admin/login") {
      return NextResponse.next();
    }
    
    // If not authenticated, redirect to admin login
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    
    // Admin and Owner have full access
    if (ADMIN_ROLES.includes(token.role as string)) {
      return NextResponse.next();
    }
    
    // Manager has limited access - front desk, housekeeping, bookings for their properties
    if (token.role === "MANAGER") {
      const allowedPaths = ["/admin/dashboard", "/admin/front-desk", "/admin/housekeeping", "/admin/bookings", "/admin/users"];
      const isAllowed = allowedPaths.some(path => request.nextUrl.pathname.startsWith(path));
      if (isAllowed) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    
    // Front Desk has access only to front desk and bookings
    if (token.role === "FRONT_DESK") {
      // Redirect to front desk portal instead
      return NextResponse.redirect(new URL("/front-desk", request.url));
    }
    
    // Housekeeper has access only to housekeeping
    if (token.role === "HOUSEKEEPER") {
      // Redirect to housekeeping portal instead
      return NextResponse.redirect(new URL("/housekeeping", request.url));
    }
    
    // Customers don't have admin access
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  
  // Check front-desk portal access
  if (request.nextUrl.pathname.startsWith("/front-desk")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    
    const frontDeskRoles = ["ADMIN", "OWNER", "MANAGER", "FRONT_DESK"];
    if (!frontDeskRoles.includes(token.role as string)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }
  
  // Check housekeeping portal access
  if (request.nextUrl.pathname.startsWith("/housekeeping")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    
    const housekeepingRoles = ["ADMIN", "OWNER", "MANAGER", "HOUSEKEEPER"];
    if (!housekeepingRoles.includes(token.role as string)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }
  
  // For customer protected routes
  if (
    request.nextUrl.pathname.startsWith("/dashboard") || 
    request.nextUrl.pathname === "/bookings"
  ) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

// See: https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/bookings/:path*", "/front-desk/:path*", "/housekeeping/:path*"]
};
