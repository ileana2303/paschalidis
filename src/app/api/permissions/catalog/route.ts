import { NextResponse } from "next/server";
import {
    getEnvString,
    getSoftOneClientID,
    getSoftOneEndpoint,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";
import type { PermissionCatalog } from "@/lib/auth/permissions";

const PERMS_SERVICE_PATH = "/JS/SiteData.Items";

function getListPermsEndpoint() {
    const configuredEndpoint = getEnvString("S1_LIST_PERMS_ENDPOINT");

    if (configuredEndpoint) {
        return configuredEndpoint;
    }

    const baseEndpoint = getSoftOneEndpoint().replace(/\/+$/, "");

    if (baseEndpoint.endsWith(PERMS_SERVICE_PATH)) {
        return `${baseEndpoint}/listPerms`;
    }

    return `${baseEndpoint}${PERMS_SERVICE_PATH}/listPerms`;
}

type ListPermsResponse = PermissionCatalog & {
    success?: boolean;
    error?: string;
};

/**
 * POST /api/permissions/catalog
 *
 * Proxies SiteData.Items/listPerms for module/feature/branch permission metadata.
 */
export async function POST() {
    try {
        const clientID = getSoftOneClientID();

        if (!clientID) {
            throw new Error("Δεν έχει ρυθμιστεί ο SoftOne client ID.");
        }

        const upstreamResponse = await postSoftOne(
            { clientID },
            { endpoint: getListPermsEndpoint() }
        );
        const data =
            await parseJsonWithEncodingFallback<ListPermsResponse>(upstreamResponse);

        if (!upstreamResponse.ok || data.success !== true) {
            const message =
                String(data.error ?? "").trim() ||
                "Αποτυχία φόρτωσης καταλόγου δικαιωμάτων.";
            return NextResponse.json(
                { success: false, error: message },
                { status: upstreamResponse.status >= 400 ? upstreamResponse.status : 502 }
            );
        }

        return NextResponse.json({
            success: true,
            modules: data.modules ?? [],
            features: data.features ?? [],
            branches: data.branches ?? [],
        });
    } catch (error) {
        console.error("[permissions/catalog] Server error", error);
        return NextResponse.json(
            { success: false, error: "Σφάλμα διακομιστή." },
            { status: 500 }
        );
    }
}
