import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "./constants";
const EXPIRATION_DAYS = 7;

/**
 * Set the auth session cookie.
 * Cookie presence is the only auth guard signal.
 */
export async function setSessionCookie() {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, "1", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: EXPIRATION_DAYS * 24 * 60 * 60,
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