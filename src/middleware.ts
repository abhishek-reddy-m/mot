import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  // Skip middleware for API routes - they handle their own auth
  if (request.nextUrl.pathname.startsWith("/api/")) {
    console.log("Middleware: Skipping auth check for API route:", request.nextUrl.pathname);
    return NextResponse.next();
  }

  // Added debug logs and improved token retrieval
  console.log("Middleware checking auth for path:", request.nextUrl.pathname);
  
  // Check for existing cookie directly
  const sessionCookie = request.cookies.get("next-auth.session-token") || 
                        request.cookies.get("__Secure-next-auth.session-token");
  
  console.log("Session cookie found:", sessionCookie ? "YES" : "NO");
  
  const token = await getToken({ 
    req: request, 
    cookieName: process.env.NODE_ENV === "production" ? 
      "__Secure-next-auth.session-token" : "next-auth.session-token",
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  console.log("Auth token found:", token ? "YES" : "NO");
  
  // Check if the route is under /admin
  if (request.nextUrl.pathname.startsWith("/admin")) {
    console.log("Admin route detected:", request.nextUrl.pathname);
    
    // Always allow access to the admin login page without authentication
    if (request.nextUrl.pathname === "/admin/login") {
      console.log("Allowing access to admin login page");
      return NextResponse.next();
    }
    
    // If not authenticated, redirect to admin login
    if (!token) {
      console.log("No token for admin route, redirecting to admin login");
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    
    // Log token details for debugging
    console.log("Admin route token role:", token.role);
    
    // If authenticated but not an admin, redirect to customer dashboard
    if (token.role !== "ADMIN") {
      console.log("User is not an admin, redirecting to customer dashboard");
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    
    console.log("Admin access granted to:", request.nextUrl.pathname);
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
  matcher: ["/admin/:path*", "/dashboard/:path*", "/bookings/:path*"]
};
