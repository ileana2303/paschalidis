import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = process.env.AUTH_SECRET ?? "";
const key = new TextEncoder().encode(SECRET_KEY);

const COOKIE_NAME = "session";

/**
 * Public paths that don't require authentication.
 * Mirrors Program.cs: unauthenticated users → /Account/Login
 */
const PUBLIC_PATHS = ["/signin", "/signup"];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Allow public auth pages
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // Allow all auth API routes (login doesn't need a session)
    if (pathname.startsWith("/api/auth")) {
        return NextResponse.next();
    }

    // Check for session cookie
    const session = req.cookies.get(COOKIE_NAME);

    if (!session?.value) {
        return NextResponse.redirect(new URL("/signin", req.url));
    }

    try {
        await jwtVerify(session.value, key);
        return NextResponse.next();
    } catch {
        // Invalid or expired token → redirect to login
        const response = NextResponse.redirect(new URL("/signin", req.url));
        response.cookies.delete(COOKIE_NAME);
        return response;
    }
}

/**
 * Run middleware on all routes except static assets.
 * This mirrors Program.cs:
 *   options.LoginPath = "/Account/Login";
 *   + [Authorize(Policy = "RequireUserUID")] on controllers
 */
export const config = {
    matcher: [
        "/((?!_next/static|_next/image|images|favicon\\.ico).*)",
    ],
};
