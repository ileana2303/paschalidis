import { SignJWT, jwtVerify } from "jose";
import type { AuthPermissionEntry } from "@/lib/auth/types";
import { PERMISSIONS_COOKIE_NAME } from "@/lib/auth/constants";

export type PermissionsCookiePayload = {
    modules: AuthPermissionEntry[];
    features: AuthPermissionEntry[];
};

const PERMISSIONS_ISSUER = "paschalidis-erp-perms";
const PERMISSIONS_AUDIENCE = "paschalidis-web";

function getSessionSecret() {
    const secret = process.env.AUTH_SECRET?.trim();

    if (!secret) {
        throw new Error("Δεν έχει ρυθμιστεί το AUTH_SECRET.");
    }

    return new TextEncoder().encode(secret);
}

function normalizeEntries(entries: AuthPermissionEntry[] | undefined): AuthPermissionEntry[] {
    return (entries ?? []).flatMap((entry) => {
        const code = String(entry.code ?? "").trim();
        if (!code) return [];
        const rights = Number(entry.rights);
        if (!Number.isInteger(rights) || rights < 0) return [];
        return [{ code, rights }];
    });
}

export async function createPermissionsToken(
    payload: PermissionsCookiePayload,
    rememberMe = false
) {
    const expiresIn = rememberMe ? "7d" : "12h";

    return new SignJWT({
        modules: normalizeEntries(payload.modules),
        features: normalizeEntries(payload.features),
    })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer(PERMISSIONS_ISSUER)
        .setAudience(PERMISSIONS_AUDIENCE)
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(getSessionSecret());
}

export async function verifyPermissionsToken(
    token: string | null | undefined
): Promise<PermissionsCookiePayload | null> {
    if (!token?.trim()) {
        return null;
    }

    try {
        const { payload } = await jwtVerify(token, getSessionSecret(), {
            issuer: PERMISSIONS_ISSUER,
            audience: PERMISSIONS_AUDIENCE,
        });

        const modules = Array.isArray(payload.modules)
            ? normalizeEntries(payload.modules as AuthPermissionEntry[])
            : [];
        const features = Array.isArray(payload.features)
            ? normalizeEntries(payload.features as AuthPermissionEntry[])
            : [];

        return { modules, features };
    } catch {
        return null;
    }
}
