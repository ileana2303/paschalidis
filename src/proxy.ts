import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

const PUBLIC_PATHS = ["/signin", "/signup"];

function isPublicPath(pathname: string): boolean {
    if (PUBLIC_PATHS.includes(pathname)) return true;
    if (pathname.startsWith("/signup/")) return true;
    return false;
}

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const isLoggedIn = !!sessionCookie?.trim();

    if (isLoggedIn && isPublicPath(pathname)) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    if (!isLoggedIn && !isPublicPath(pathname)) {
        return NextResponse.redirect(new URL("/signin", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|images|favicon\\.ico).*)"],
};

