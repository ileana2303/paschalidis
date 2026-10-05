import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/session-token";
import {
    getEnvString,
    getSoftOneClientID,
    getSoftOneEndpoint,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";
import type {
    AppUser,
    GetUserPayload,
    GetUserResponse,
    SaveUserPayload,
    SaveUserResponse,
    SaveUserRoutePayload,
    UserPermissions,
} from "@/lib/users/types";

const USER_SERVICE_PATH = "/JS/SiteData.Items";

function getUserServiceEndpoint(action: "getUser" | "saveUser") {
    const configuredEndpoint = getEnvString(
        action === "getUser" ? "S1_GET_USER_ENDPOINT" : "S1_SAVE_USER_ENDPOINT"
    );

    if (configuredEndpoint) {
        return configuredEndpoint;
    }

    const baseEndpoint = getSoftOneEndpoint().replace(/\/+$/, "");

    if (baseEndpoint.endsWith(USER_SERVICE_PATH)) {
        return `${baseEndpoint}/${action}`;
    }

    return `${baseEndpoint}${USER_SERVICE_PATH}/${action}`;
}

function jsonError(error: string, status: number) {
    return NextResponse.json({ success: false, error }, { status });
}

async function requireSuperAdmin(req: NextRequest) {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await verifySessionToken(token);

    return session?.isSuperAdmin === 1 ? session : null;
}

function normalizePermissions(value: UserPermissions): UserPermissions {
    return {
        modules: value.modules.map((permission) => ({
            code: String(permission.code ?? "").trim(),
            rights: Number(permission.rights),
        })),
        features: value.features.map((permission) => ({
            code: String(permission.code ?? "").trim(),
            rights: Number(permission.rights),
        })),
        branches: value.branches.map((branch) => String(branch).trim()),
    };
}

function isCompletePermissions(value: unknown): value is UserPermissions {
    if (!value || typeof value !== "object") {
        return false;
    }

    const permissions = value as Partial<UserPermissions>;
    const { modules, features, branches } = permissions;
    const hasArrays =
        Array.isArray(modules) &&
        Array.isArray(features) &&
        Array.isArray(branches);

    if (!hasArrays) {
        return false;
    }

    const isPermissionEntry = (entry: unknown) => {
        if (!entry || typeof entry !== "object") return false;
        const permission = entry as { code?: unknown; rights?: unknown };
        return (
            typeof permission.code === "string" &&
            permission.code.trim().length > 0 &&
            Number.isInteger(permission.rights) &&
            Number(permission.rights) >= 0
        );
    };

    return (
        modules.every(isPermissionEntry) &&
        features.every(isPermissionEntry) &&
        branches.every(
            (branch) => typeof branch === "string" && branch.trim().length > 0
        )
    );
}

function hasValidNumericFlags(user: SaveUserRoutePayload["user"]) {
    return (["isActive", "isSuperAdmin", "isCustomer"] as const).every(
        (field) =>
            user[field] === undefined || user[field] === 0 || user[field] === 1
    );
}

function sanitizeUser(value: SaveUserRoutePayload["user"]) {
    const allowedFields: Array<keyof AppUser | "password"> = [
        "username",
        "password",
        "fname",
        "lname",
        "email",
        "mobile",
        "role",
        "mainBranch",
        "isActive",
        "isSuperAdmin",
        "isCustomer",
        "trdr",
    ];
    const user: Record<string, unknown> = {};

    for (const field of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(value, field)) {
            user[field] = value[field as keyof typeof value];
        }
    }

    user.username = String(value.username ?? "").trim();
    return user as SaveUserPayload["user"];
}

async function callUserService<T extends GetUserResponse>(
    payload: GetUserPayload | SaveUserPayload,
    action: "getUser" | "saveUser"
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

export async function POST(req: NextRequest) {
    try {
        if (!(await requireSuperAdmin(req))) {
            return jsonError("Δεν έχετε δικαίωμα διαχείρισης χρηστών.", 403);
        }

        const clientID = getSoftOneClientID();
        if (!clientID) {
            return jsonError("Δεν έχει ρυθμιστεί ο SoftOne client ID.", 500);
        }

        const body = (await req.json().catch(() => ({}))) as {
            username?: unknown;
        };
        const username =
            typeof body.username === "string" ? body.username.trim() : "";
        const payload: GetUserPayload = {
            clientID,
            ...(username ? { username } : {}),
        };
        const data = await callUserService<GetUserResponse>(payload, "getUser");

        return NextResponse.json(data);
    } catch (error) {
        console.error("[users:getUser] Server error", error);
        return jsonError(
            error instanceof Error ? error.message : "Σφάλμα διακομιστή.",
            500
        );
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await requireSuperAdmin(req);
        if (!session) {
            return jsonError("Δεν έχετε δικαίωμα διαχείρισης χρηστών.", 403);
        }

        const clientID = getSoftOneClientID();
        if (!clientID) {
            return jsonError("Δεν έχει ρυθμιστεί ο SoftOne client ID.", 500);
        }

        const body = (await req.json().catch(() => ({}))) as Partial<SaveUserRoutePayload>;
        const username = String(body.user?.username ?? "").trim();

        if (!username) {
            return jsonError("Το username είναι υποχρεωτικό.", 400);
        }

        if (!body.user || !hasValidNumericFlags(body.user)) {
            return jsonError("Οι αριθμητικές σημαίες χρήστη πρέπει να είναι 0 ή 1.", 400);
        }

        if (
            body.user.isCustomer === 1 &&
            (!Number.isInteger(body.user.trdr) || Number(body.user.trdr) <= 0)
        ) {
            return jsonError("Απαιτείται έγκυρο TRDR για χρήστη πελάτη.", 400);
        }

        if (body.permissions !== undefined && !isCompletePermissions(body.permissions)) {
            return jsonError("Το σύνολο δικαιωμάτων δεν είναι έγκυρο.", 400);
        }

        const payload: SaveUserPayload = {
            clientID,
            by: session.username,
            user: sanitizeUser({ ...body.user, username }),
            ...(body.permissions !== undefined
                ? { permissions: normalizePermissions(body.permissions) }
                : {}),
        };
        const data = await callUserService<SaveUserResponse>(payload, "saveUser");

        return NextResponse.json(data);
    } catch (error) {
        console.error("[users:saveUser] Server error", error);
        return jsonError(
            error instanceof Error ? error.message : "Σφάλμα διακομιστή.",
            500
        );
    }
}
