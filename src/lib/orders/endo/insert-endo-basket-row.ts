import type { EndoBasketAddPayload } from "@/lib/interface";
import { parseJsonWithEncodingFallback, postSoftOne } from "@/lib/softone";

const ZERO_GUID = "00000000-0000-0000-0000-000000000000";

type InsertEndoBasketRowParams = {
    /** SQL clientID (`getSoftOneClientID(supplyingBranch)`), not the setData one. */
    clientID: string;
    mtrl: number;
    qty: number;
    /** Branch that holds and sends the items -> NOW_ENDO_INSERT BRANCH. */
    supplyingBranch: number;
    /** Branch that asked for the items -> NOW_ENDO_INSERT TO_BRANCH. */
    requestingBranch: number;
    appUserId?: string;
    logLabel: string;
};

export type InsertEndoBasketRowResult =
    | { ok: true; basketId: string; message: string }
    | { ok: false; status: number; message: string };

type NowEndoInsertResponse = {
    success?: boolean;
    message?: string;
    rows?: Array<{
        MESSAGE_TO_CALLER?: string;
        NEW_ID?: string | number;
        BASKETID?: string | number;
        ID?: string | number;
    }>;
};

function extractBasketId(message: string) {
    const match = message.match(/ID\s*:\s*(\d+)/i);
    return match?.[1] ?? "";
}

/**
 * Inserts one ENDO basket row via NOW_ENDO_INSERT and returns its BASKETID.
 * Used by the ENDO basket (add-item route) and by Priority ENDO, which reserves
 * a BASKETID for its COMMENTS ("Νο...") and LINK_S1.
 */
export async function insertEndoBasketRow({
    clientID,
    mtrl,
    qty,
    supplyingBranch,
    requestingBranch,
    appUserId,
    logLabel,
}: InsertEndoBasketRowParams): Promise<InsertEndoBasketRowResult> {
    const payload: EndoBasketAddPayload = {
        service: "SqlData",
        clientID,
        appId: "1305",
        SqlName: "NOW_ENDO_INSERT",
        // NOW_ENDO_INSERT convention:
        // BRANCH = source branch (where we request stock from),
        // TO_BRANCH = destination/requester branch (logged-in branch).
        MTRL: mtrl,
        QTY: qty,
        BRANCH: supplyingBranch,
        TO_BRANCH: requestingBranch,
        APPUSER_ID: String(appUserId ?? "").trim() || ZERO_GUID,
    };

    const response = await postSoftOne(payload);

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`${logLabel} NOW_ENDO_INSERT error body:`, errorText);

        return {
            ok: false,
            status: response.status,
            message: 'Αποτυχία επικοινωνίας με το ERP.',
        };
    }

    const upstreamData = (await parseJsonWithEncodingFallback(
        response
    )) as NowEndoInsertResponse;

    if (upstreamData?.success === false) {
        return {
            ok: false,
            status: 502,
            message:
                upstreamData.message ?? 'Αποτυχία προσθήκης στη λίστα ενδοκινήσεων.',
        };
    }

    const firstRow = upstreamData?.rows?.[0];
    const message =
        firstRow?.MESSAGE_TO_CALLER ??
        upstreamData?.message ??
        'Το είδος προστέθηκε στη λίστα ενδοκινήσεων.';
    const basketId = String(
        firstRow?.NEW_ID ??
            firstRow?.BASKETID ??
            firstRow?.ID ??
            extractBasketId(message)
    ).trim();

    return { ok: true, basketId, message };
}
