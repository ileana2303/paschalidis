import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth/session";
import type {
    LoginRequest,
    LoginResponse,
    SoftOneLoginResponse,
} from "@/lib/auth/types";
import {
    getEnvString,
    getSoftOneClientID,
    getSoftOneEndpoint,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";

const LOGIN_PATH = "/JS/SiteData.Items/login";
const INVALID_CREDENTIALS_MESSAGE = "Λάθος στοιχεία σύνδεσης";

function getSoftOneLoginEndpoint() {
    const configuredEndpoint = getEnvString("S1_LOGIN_ENDPOINT");

    if (configuredEndpoint) {
        return configuredEndpoint;
    }

    const baseEndpoint = getSoftOneEndpoint().replace(/\/+$/, "");

    if (baseEndpoint.endsWith("/JS/SiteData.Items")) {
        return `${baseEndpoint}/login`;
    }

    return `${baseEndpoint}${LOGIN_PATH}`;
}

function errorResponse(message: string, status: number) {
    const response: LoginResponse = {
        result: false,
        message,
        type: "error",
    };

    return NextResponse.json(response, { status });
}

/**
 * POST /api/auth/login
 *
 * Proxies credentials to SoftOne's SiteData.Items/login service. Only the
 * returned user and permissions are sent to the browser; the password is not
 * retained.
 */
export async function POST(req: NextRequest) {
    try {
        const body = (await req.json()) as LoginRequest;
        const username = String(body.username ?? "").trim();
        const password = String(body.password ?? "");

        if (!username || !password) {
            return errorResponse("Εισάγετε όλα τα απαραίτητα πεδία", 400);
        }

        const clientID = getSoftOneClientID();

        if (!clientID) {
            throw new Error("Δεν έχει ρυθμιστεί ο SoftOne client ID.");
        }

        const upstreamResponse = await postSoftOne(
            {
                clientID,
                username,
                password,
            },
            { endpoint: getSoftOneLoginEndpoint() }
        );
        const upstreamData =
            await parseJsonWithEncodingFallback<SoftOneLoginResponse>(upstreamResponse);

        if (
            !upstreamResponse.ok ||
            upstreamData.success !== true ||
            !upstreamData.user ||
            !upstreamData.permissions
        ) {
            return errorResponse(
                String(upstreamData.error ?? "").trim() || INVALID_CREDENTIALS_MESSAGE,
                401
            );
        }

        await setSessionCookie(body.rememberMe === true);

        const response: LoginResponse = {
            result: true,
            message: "Επιτυχής σύνδεση",
            type: "success",
            redirectlink: "/",
            user: upstreamData.user,
            permissions: upstreamData.permissions,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("[auth/login] Server error", error);
        return errorResponse("Σφάλμα διακομιστή κατά τη σύνδεση", 500);
    }
}
