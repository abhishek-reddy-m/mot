import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const session = await auth();
  
  // Check if the route is under /admin
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // Allow access to the admin login page without authentication
    if (request.nextUrl.pathname === "/admin/login") {
      return NextResponse.next();
    }
    
    // If not authenticated, redirect to admin login
    if (!session) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    
    // If authenticated but not an admin, redirect to customer dashboard
    if (session.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }
  
  // For customer protected routes
  if (
    request.nextUrl.pathname.startsWith("/dashboard") || 
    request.nextUrl.pathname === "/bookings"
  ) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

// See: https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/bookings/:path*"]
};
