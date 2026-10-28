import { NextRequest, NextResponse } from "next/server";
import { getSoftOneClientID } from "@/lib/softone";
import type {
    DeletePermsItem,
    ListPermsResponse,
    PermissionCatalogType,
    SavePermsItem,
} from "@/lib/users/types";
import { callUserService, getSession, jsonError, sessionCan } from "../_lib/shared";

const CATALOG_TYPES: PermissionCatalogType[] = ["MODULE", "FEATURE", "BRANCH"];

function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : "Σφάλμα διακομιστή.";
}

function isCatalogKey(entry: unknown): entry is DeletePermsItem {
    if (!entry || typeof entry !== "object") return false;

    const { type, code } = entry as { type?: unknown; code?: unknown };
    return (
        CATALOG_TYPES.includes(type as PermissionCatalogType) &&
        typeof code === "string" &&
        code.trim().length > 0
    );
}

function isSaveItem(entry: unknown): entry is SavePermsItem {
    if (!isCatalogKey(entry)) return false;

    const { parent, descr, isActive } = entry as SavePermsItem;
    return (
        (parent === undefined || typeof parent === "string") &&
        (descr === undefined || typeof descr === "string") &&
        (isActive === undefined || isActive === 0 || isActive === 1)
    );
}

/** Reads `items` from the body after checking the caller may manage the catalog. */
async function readCatalogItems<T>(
    req: NextRequest,
    isItem: (entry: unknown) => entry is T
): Promise<{ clientID: string; items: T[] } | NextResponse> {
    if (!sessionCan(await getSession(req), "manage-perms")) {
        return jsonError("Δεν έχετε δικαίωμα διαχείρισης καταλόγου δικαιωμάτων.", 403);
    }

    const clientID = getSoftOneClientID();
    if (!clientID) {
        return jsonError("Δεν έχει ρυθμιστεί ο SoftOne client ID.", 500);
    }

    const body = (await req.json().catch(() => ({}))) as { items?: unknown };
    if (
        !Array.isArray(body.items) ||
        body.items.length === 0 ||
        !body.items.every(isItem)
    ) {
        return jsonError("Η λίστα δικαιωμάτων δεν είναι έγκυρη.", 400);
    }

    return { clientID, items: body.items };
}

/** GET /api/users/permissions — the permission catalog (SoftOne listPerms). */
export async function GET(req: NextRequest) {
    try {
        if (!sessionCan(await getSession(req), "users-list")) {
            return jsonError("Δεν έχετε δικαίωμα διαχείρισης χρηστών.", 403);
        }

        const clientID = getSoftOneClientID();
        if (!clientID) {
            return jsonError("Δεν έχει ρυθμιστεί ο SoftOne client ID.", 500);
        }

        const data = await callUserService<ListPermsResponse>({ clientID }, "listPerms");

        return NextResponse.json(data);
    } catch (error) {
        console.error("[users:listPerms] Server error", error);
        return jsonError(errorMessage(error), 500);
    }
}

/** POST /api/users/permissions — add or edit catalog entries (savePerms). */
export async function POST(req: NextRequest) {
    try {
        const parsed = await readCatalogItems(req, isSaveItem);
        if (parsed instanceof NextResponse) return parsed;

        const items = parsed.items.map((item) => ({
            ...item,
            code: item.code.trim(),
        }));
        const data = await callUserService<ListPermsResponse>(
            { clientID: parsed.clientID, items },
            "savePerms"
        );

        return NextResponse.json(data);
    } catch (error) {
        console.error("[users:savePerms] Server error", error);
        return jsonError(errorMessage(error), 500);
    }
}

/** DELETE /api/users/permissions — remove catalog entries from the catalog and every user. */
export async function DELETE(req: NextRequest) {
    try {
        const parsed = await readCatalogItems(req, isCatalogKey);
        if (parsed instanceof NextResponse) return parsed;

        const items = parsed.items.map(({ type, code }) => ({
            type,
            code: code.trim(),
        }));
        const data = await callUserService<ListPermsResponse>(
            { clientID: parsed.clientID, items },
            "deletePerms"
        );

        return NextResponse.json(data);
    } catch (error) {
        console.error("[users:deletePerms] Server error", error);
        return jsonError(errorMessage(error), 500);
    }
}
