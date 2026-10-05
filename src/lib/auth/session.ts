import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "./constants";
import type { AuthUser } from "./types";
import { createSessionToken } from "./session-token";
const REMEMBER_ME_EXPIRATION_DAYS = 7;

/**
 * Set the auth session cookie.
 * The signed token carries the minimum server-side identity needed by protected
 * routes; the complete user and permission state remains in the auth store.
 */
export async function setSessionCookie(user: AuthUser, rememberMe = false) {
    const cookieStore = await cookies();
    const token = await createSessionToken(
        {
            username: user.username,
            isSuperAdmin: user.isSuperAdmin === 1 ? 1 : 0,
        },
        rememberMe
    );

    cookieStore.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        ...(rememberMe
            ? { maxAge: REMEMBER_ME_EXPIRATION_DAYS * 24 * 60 * 60 }
            : {}),
        path: "/",
    });
}

/**
 * Delete the session cookie (logout).
 */
export async function deleteSessionCookie() {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        expires: new Date(0),
        path: "/",
    });
}
