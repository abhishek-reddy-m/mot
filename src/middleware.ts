import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getAppOrigin, isAppHost, normalizeDomain } from "@/lib/domain-utils";

// Define role-based access control
const ADMIN_ROLES = ["ADMIN", "OWNER"];
const STAFF_ROLES = ["ADMIN", "OWNER", "MANAGER", "FRONT_DESK", "HOUSEKEEPER"];

// Routes that need a signed-in user
const PROTECTED_PATHS = ["/admin", "/dashboard", "/bookings", "/front-desk", "/housekeeping"];

// Property custom domains: hostname -> property whose booking page it serves
const DOMAIN_CACHE_TTL_MS = 60 * 1000;
const DOMAIN_CACHE_MAX_ENTRIES = 1000;
const domainCache = new Map<string, { propertyId: string | null; expiresAt: number }>();

async function resolveCustomDomain(hostname: string): Promise<string | null> {
  const cached = domainCache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.propertyId;
  }

  // Middleware can't use Prisma, so ask this same server over loopback
  const internalUrl = process.env.INTERNAL_APP_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;

  try {
    const response = await fetch(`${internalUrl}/api/domains/resolve?host=${encodeURIComponent(hostname)}`);
    if (!response.ok && response.status !== 404) {
      return null;
    }

    const { propertyId } = await response.json();
    if (domainCache.size >= DOMAIN_CACHE_MAX_ENTRIES) {
      domainCache.clear();
    }
    domainCache.set(hostname, { propertyId, expiresAt: Date.now() + DOMAIN_CACHE_TTL_MS });
    return propertyId;
  } catch (error) {
    console.error("Custom domain lookup failed:", error);
    return null;
  }
}

// On a property's own domain, guests only see that property's booking page
function handleCustomDomain(request: NextRequest, propertyId: string) {
  const { pathname, search } = request.nextUrl;
  const bookingPage = `/properties/${propertyId}`;

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = bookingPage;
    return NextResponse.rewrite(url);
  }

  if (pathname === bookingPage || pathname.startsWith(`${bookingPage}/`)) {
    return NextResponse.next();
  }

  // Other properties' listings
  if (pathname === "/properties" || pathname.startsWith("/properties/")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Sign-in, accounts and staff portals live on the main site, where the session cookie is
  const appOrigin = getAppOrigin();
  if (!appOrigin) {
    return NextResponse.next();
  }

  const mainSiteUrl = new URL(`${pathname}${search}`, appOrigin);
  if (pathname === "/login" && !mainSiteUrl.searchParams.has("callbackUrl")) {
    // The booking page sends guests to /login?redirect=/properties/<id>
    const redirect = mainSiteUrl.searchParams.get("redirect");
    const isRelativePath = redirect?.startsWith("/") && !redirect.startsWith("//");
    mainSiteUrl.searchParams.set("callbackUrl", isRelativePath ? redirect! : bookingPage);
  }
  return NextResponse.redirect(mainSiteUrl);
}

export async function middleware(request: NextRequest) {
  // Skip middleware for API routes - they handle their own auth
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const hostname = normalizeDomain(request.headers.get("host") || "");
  if (hostname && !isAppHost(hostname)) {
    const propertyId = await resolveCustomDomain(hostname);
    if (propertyId) {
      return handleCustomDomain(request, propertyId);
    }
  }

  const { pathname } = request.nextUrl;
  if (!PROTECTED_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`))) {
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
// Every page (not API routes, Next.js internals or files), so custom domains work on all of them
export const config = {
  matcher: ["/((?!api/|_next/|.*\\..*).*)"]
};
