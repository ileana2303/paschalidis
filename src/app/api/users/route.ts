import { NextRequest, NextResponse } from "next/server";
import { getSoftOneClientID } from "@/lib/softone";
import type {
    AppUser,
    GetUserPayload,
    GetUserResponse,
    SaveUserPayload,
    SaveUserPermissionItem,
    SaveUserPermissions,
    SaveUserResponse,
    SaveUserRoutePayload,
} from "@/lib/users/types";
import { callUserService, getSession, jsonError, sessionCan } from "./_lib/shared";

function normalizePermissionItems(items: SaveUserPermissionItem[]): SaveUserPermissionItem[] {
    return items.map((item) =>
        typeof item === "string"
            ? item.trim()
            : { code: item.code.trim(), isActive: 0 as const }
    );
}

function normalizePermissions(value: SaveUserPermissions): SaveUserPermissions {
    return {
        modules: normalizePermissionItems(value.modules),
        features: normalizePermissionItems(value.features),
        branches: normalizePermissionItems(value.branches),
    };
}

function isPermissionItem(entry: unknown) {
    if (typeof entry === "string") return entry.trim().length > 0;
    if (!entry || typeof entry !== "object") return false;

    const permission = entry as { code?: unknown; isActive?: unknown };
    return (
        typeof permission.code === "string" &&
        permission.code.trim().length > 0 &&
        permission.isActive === 0
    );
}

function isCompletePermissions(value: unknown): value is SaveUserPermissions {
    if (!value || typeof value !== "object") {
        return false;
    }

    const { modules, features, branches } = value as Partial<SaveUserPermissions>;

    return [modules, features, branches].every(
        (items) => Array.isArray(items) && items.every(isPermissionItem)
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

async function lookupUsers(clientID: string, username = "") {
    const payload: GetUserPayload = {
        clientID,
        ...(username ? { username } : {}),
    };

    return callUserService<GetUserResponse>(payload, "getUser");
}

async function userExists(clientID: string, username: string) {
    const data = await lookupUsers(clientID, username);
    const normalized = username.toLocaleLowerCase();

    return (data.users ?? []).some(
        (entry) => entry.user.username.toLocaleLowerCase() === normalized
    );
}

async function getUsers(req: NextRequest, username = "") {
    if (!sessionCan(await getSession(req), "users-list")) {
        return jsonError("Δεν έχετε δικαίωμα διαχείρισης χρηστών.", 403);
    }

    const clientID = getSoftOneClientID();
    if (!clientID) {
        return jsonError("Δεν έχει ρυθμιστεί ο SoftOne client ID.", 500);
    }

    return NextResponse.json(await lookupUsers(clientID, username));
}

/** List all users and permissions using an upstream payload of only { clientID }. */
export async function GET(req: NextRequest) {
    try {
        return await getUsers(req);
    } catch (error) {
        console.error("[users:getUser:list] Server error", error);
        return jsonError(
            error instanceof Error ? error.message : "Σφάλμα διακομιστή.",
            500
        );
    }
}

/** Look up a single username, used while validating a new user. */
export async function POST(req: NextRequest) {
    try {
        const body = (await req.json().catch(() => ({}))) as {
            username?: unknown;
        };
        const username =
            typeof body.username === "string" ? body.username.trim() : "";

        if (!username) {
            return jsonError("Το username είναι υποχρεωτικό.", 400);
        }

        return await getUsers(req, username);
    } catch (error) {
        console.error("[users:getUser:lookup] Server error", error);
        return jsonError(
            error instanceof Error ? error.message : "Σφάλμα διακομιστή.",
            500
        );
    }
}

/**
 * Create or update a user. Updating needs `edit-user`; a caller with only
 * `create-user` may save usernames that do not exist yet.
 */
export async function PATCH(req: NextRequest) {
    try {
        const session = await getSession(req);
        const canEdit = sessionCan(session, "edit-user");
        const canCreate = sessionCan(session, "create-user");

        if (!session || (!canEdit && !canCreate)) {
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

        if (!canEdit && (await userExists(clientID, username))) {
            return jsonError("Δεν έχετε δικαίωμα επεξεργασίας χρηστών.", 403);
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
