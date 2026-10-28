import { SignJWT, jwtVerify } from "jose";

/** Server-side identity and active permission codes, signed into the cookie. */
export type SessionUser = {
    username: string;
    modules: string[];
    features: string[];
};

function toCodeList(value: unknown): string[] | null {
    return Array.isArray(value) && value.every((code) => typeof code === "string")
        ? value
        : null;
}

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
        modules: user.modules,
        features: user.features,
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
        const modules = toCodeList(payload.modules);
        const features = toCodeList(payload.features);

        // Tokens issued before permissions were signed in are treated as expired.
        if (!username || !modules || !features) {
            return null;
        }

        return { username, modules, features };
    } catch {
        return null;
    }
}
