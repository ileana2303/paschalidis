import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { AppUser, UserSession } from "./types";

const SECRET_KEY = process.env.AUTH_SECRET;
if (!SECRET_KEY) {
    throw new Error("AUTH_SECRET environment variable is not set");
}

const key = new TextEncoder().encode(SECRET_KEY);
const COOKIE_NAME = "session";
const EXPIRATION_DAYS = 7;

/**
 * Build claims from AppUser and sign a JWT.
 * Mirrors AuthService.cs → CreateClaimsFromUser.
 */
export async function createSessionToken(user: AppUser): Promise<string> {
    const session: UserSession = {
        username: user.Username,
        fullName: `${user.Fname ?? ""} ${user.Lname ?? ""}`.trim(),
        userEmail: user.Email ?? "",
        userUID: String(user.Uid),
        userRole: user.Role ?? "User",
        userIsSuperAdmin: String(user.IsSuperAdmin ?? 0),
        dateIn: user.DateIn ?? "",
    };

    return new SignJWT(session as unknown as Record<string, unknown>)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${EXPIRATION_DAYS}d`)
        .sign(key);
}

/**
 * Read and verify the JWT from the session cookie.
 * Returns the UserSession payload or null if missing/expired.
 */
export async function getSession(): Promise<UserSession | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);

    if (!sessionCookie?.value) return null;

    try {
        const { payload } = await jwtVerify(sessionCookie.value, key);
        return payload as unknown as UserSession;
    } catch {
        return null;
    }
}

/**
 * Set the session JWT as an HTTP-only cookie.
 * Mirrors AuthenticationProperties in AuthService.cs:
 *   IsPersistent = true, AllowRefresh = true, ExpiresUtc = 7 days
 */
export async function setSessionCookie(token: string) {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
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
    cookieStore.delete(COOKIE_NAME);
}

/**
 * Verify a JWT token string (used in middleware where cookies() is not available).
 */
export async function verifyToken(token: string): Promise<UserSession | null> {
    try {
        const { payload } = await jwtVerify(token, key);
        return payload as unknown as UserSession;
    } catch {
        return null;
    }
}
