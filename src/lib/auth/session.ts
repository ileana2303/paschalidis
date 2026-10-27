import { cookies } from "next/headers";
import { PERMISSIONS_COOKIE_NAME, SESSION_COOKIE_NAME } from "./constants";
import type { AuthPermissions, AuthUser } from "./types";
import { createPermissionsToken } from "./permissions-cookie";
import { createSessionToken } from "./session-token";
const REMEMBER_ME_EXPIRATION_DAYS = 7;

const SESSION_MAX_AGE_SECONDS = REMEMBER_ME_EXPIRATION_DAYS * 24 * 60 * 60;

function cookieBaseOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
    };
}

/**
 * Set the auth session cookie.
 * The signed token carries the minimum server-side identity needed by protected
 * routes; the complete user and permission state remains in the auth store.
 */
export async function setSessionCookie(
    user: AuthUser,
    rememberMe = false,
    permissions?: AuthPermissions | null
) {
    const cookieStore = await cookies();
    const token = await createSessionToken(
        {
            username: user.username,
            isSuperAdmin: user.isSuperAdmin === 1 ? 1 : 0,
        },
        rememberMe
    );

    cookieStore.set(SESSION_COOKIE_NAME, token, {
        ...cookieBaseOptions(),
        ...(rememberMe ? { maxAge: SESSION_MAX_AGE_SECONDS } : {}),
    });

    if (permissions) {
        const permissionsToken = await createPermissionsToken(
            {
                modules: permissions.modules,
                features: permissions.features,
            },
            rememberMe
        );

        cookieStore.set(PERMISSIONS_COOKIE_NAME, permissionsToken, {
            ...cookieBaseOptions(),
            ...(rememberMe ? { maxAge: SESSION_MAX_AGE_SECONDS } : {}),
        });
    }
}

/**
 * Delete the session cookie (logout).
 */
export async function deleteSessionCookie() {
    const cookieStore = await cookies();
    const cleared = {
        ...cookieBaseOptions(),
        maxAge: 0,
        expires: new Date(0),
    };

    cookieStore.set(SESSION_COOKIE_NAME, "", cleared);
    cookieStore.set(PERMISSIONS_COOKIE_NAME, "", cleared);
}
