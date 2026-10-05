import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/session-token";

const PUBLIC_PATHS = ["/auth/signin", "/auth/signup", "/error-404"];

function isPublicPath(pathname: string): boolean {
    if (PUBLIC_PATHS.includes(pathname)) return true;
    if (pathname.startsWith("/auth/signup/")) return true;
    if (pathname.startsWith("/error-404/")) return true;
    return false;
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const isLoggedIn = !!sessionCookie?.trim();

    if (isLoggedIn && isPublicPath(pathname)) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    if (!isLoggedIn && !isPublicPath(pathname)) {
        return NextResponse.redirect(new URL("/auth/signin", request.url));
    }

    if (pathname === "/users" || pathname.startsWith("/users/")) {
        const session = await verifySessionToken(sessionCookie);

        if (!session) {
            const response = NextResponse.redirect(
                new URL("/auth/signin?reauth=1", request.url)
            );
            response.cookies.delete(SESSION_COOKIE_NAME);
            return response;
        }

        if (session.isSuperAdmin !== 1) {
            return NextResponse.redirect(new URL("/", request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|images|favicon\\.ico).*)"],
};
