import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { verifySessionToken, type SessionUser } from "@/lib/auth/session-token";
import {
    getEnvString,
    getSoftOneEndpoint,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";

const USER_SERVICE_PATH = "/JS/SiteData.Items";

type UserServiceAction =
    | "getUser"
    | "saveUser"
    | "listPerms"
    | "savePerms"
    | "deletePerms";

const ENDPOINT_ENV_KEYS: Record<UserServiceAction, string> = {
    getUser: "S1_GET_USER_ENDPOINT",
    saveUser: "S1_SAVE_USER_ENDPOINT",
    listPerms: "S1_LIST_PERMS_ENDPOINT",
    savePerms: "S1_SAVE_PERMS_ENDPOINT",
    deletePerms: "S1_DELETE_PERMS_ENDPOINT",
};

function getUserServiceEndpoint(action: UserServiceAction) {
    const configuredEndpoint = getEnvString(ENDPOINT_ENV_KEYS[action]);

    if (configuredEndpoint) {
        return configuredEndpoint;
    }

    const baseEndpoint = getSoftOneEndpoint().replace(/\/+$/, "");

    if (baseEndpoint.endsWith(USER_SERVICE_PATH)) {
        return `${baseEndpoint}/${action}`;
    }

    return `${baseEndpoint}${USER_SERVICE_PATH}/${action}`;
}

export function jsonError(error: string, status: number) {
    return NextResponse.json({ success: false, error }, { status });
}

/** The signed-in session, or null when the cookie is missing or invalid. */
export async function getSession(req: NextRequest) {
    return verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export function sessionCan(session: SessionUser | null, code: string) {
    return hasPermission(session, code);
}

export async function callUserService<T extends { success?: boolean }>(
    payload: unknown,
    action: UserServiceAction
) {
    const response = await postSoftOne(payload, {
        endpoint: getUserServiceEndpoint(action),
    });
    const data = await parseJsonWithEncodingFallback<T>(response);

    if (!response.ok && data.success !== false) {
        throw new Error(`Αποτυχία επικοινωνίας με το ERP (HTTP ${response.status}).`);
    }

    return data;
}
