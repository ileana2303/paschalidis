import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";

const SECRET_KEY = process.env.AUTH_SECRET ?? "";
const key = new TextEncoder().encode(SECRET_KEY);

const COOKIE_NAME = "session";
const EXPIRATION_DAYS = 7;
const REFRESH_THRESHOLD_SECONDS = (EXPIRATION_DAYS * 24 * 60 * 60) / 2; // halfway = 3.5 days

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
        const { payload } = await jwtVerify(session.value, key);
        const response = NextResponse.next();

        // Sliding expiration: if more than half the lifetime has passed,
        // re-issue a fresh token so active users stay logged in indefinitely.
        // Mirrors ASP.NET SlidingExpiration = true.
        const exp = payload.exp ?? 0;
        const now = Math.floor(Date.now() / 1000);
        const remaining = exp - now;

        if (remaining < REFRESH_THRESHOLD_SECONDS) {
            const { exp: _exp, iat: _iat, ...claims } = payload;
            const newToken = await new SignJWT(claims as Record<string, unknown>)
                .setProtectedHeader({ alg: "HS256" })
                .setIssuedAt()
                .setExpirationTime(`${EXPIRATION_DAYS}d`)
                .sign(key);

            response.cookies.set(COOKIE_NAME, newToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: EXPIRATION_DAYS * 24 * 60 * 60,
                path: "/",
            });
        }

        return response;
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
