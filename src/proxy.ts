import { NextResponse, type NextRequest } from "next/server";

// Cheap, edge-safe gate: only checks whether a session cookie is present.
// The real check (DB lookup, revocation, expiry, role) happens server-side
// in Node.js on every protected page render — see src/lib/auth/session.ts.
const SESSION_COOKIE = "sat_session";

export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const { pathname } = request.nextUrl;
  const isProtected = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

  // A present cookie is not proof of a valid session (it may have been
  // revoked in the DB), so only the absence check happens here. The /login
  // page itself does the real (DB-backed) check and redirects a genuinely
  // logged-in user away — doing that here on cookie presence alone caused a
  // redirect loop for a stale cookie.
  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
