import { SignJWT, jwtVerify } from "jose";

export type SessionUser = {
    username: string;
    isSuperAdmin: 0 | 1;
};

const SESSION_ISSUER = "paschalidis-erp";
const SESSION_AUDIENCE = "paschalidis-web";

function getSessionSecret() {
    const secret = process.env.AUTH_SECRET?.trim();

    if (!secret) {
        throw new Error("Δεν έχει ρυθμιστεί το AUTH_SECRET.");
    }

    return new TextEncoder().encode(secret);
}

export async function createSessionToken(
    user: SessionUser,
    rememberMe = false
) {
    const expiresIn = rememberMe ? "7d" : "12h";

    return new SignJWT({
        username: user.username,
        isSuperAdmin: user.isSuperAdmin,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer(SESSION_ISSUER)
        .setAudience(SESSION_AUDIENCE)
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(getSessionSecret());
}

export async function verifySessionToken(
    token: string | null | undefined
): Promise<SessionUser | null> {
    if (!token?.trim()) {
        return null;
    }

    try {
        const { payload } = await jwtVerify(token, getSessionSecret(), {
            issuer: SESSION_ISSUER,
            audience: SESSION_AUDIENCE,
        });
        const username =
            typeof payload.username === "string" ? payload.username.trim() : "";

        if (!username) {
            return null;
        }

        return {
            username,
            isSuperAdmin: payload.isSuperAdmin === 1 ? 1 : 0,
        };
    } catch {
        return null;
    }
}
