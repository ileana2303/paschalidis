import {
    getSaldocSeriesByBranchCode,
    getTrdBranchByBranchCode,
} from "@/lib/auth/branches";
import { getSoftOneClientID, getSoftOneSetDataClientID } from "@/lib/softone";
import { linkBasketRowsToDocument } from "../shared/link-basket-to-document";
import {
    normalizeOrderLines,
    requireAppUserId,
    requireLines,
    requireRawItems,
    type RawOrderItem,
} from "../shared/lines";
import { postSetDataDocument } from "../shared/post-setdata";
import { jsonSafeNumber, resolveIsoDate, uniqueBasketIds } from "../validation";
import { buildBasketPayload } from "./build-basket-payload";
import {
    BASKET_COMMENTS,
    BASKET_DEFAULT_BRANCH,
    BASKET_DEFAULT_SERIES,
    BASKET_DEFAULT_TRDBRANCH,
    BASKET_ENDPOINT_ENV_KEY,
    BASKET_LOG_LABEL,
    BASKET_PAYMENT,
    BASKET_SHIPKIND,
    BASKET_SOCASH,
    BASKET_TABLE_ACTION,
    BASKET_TRUCKS,
} from "./basket-constants";

export type RawBasketItem = RawOrderItem & {
    branch?: unknown;
    BRANCH?: unknown;
    trdBranch?: unknown;
    TRD_BRANCH?: unknown;
};

export type BasketOrderRequestBody = {
    appUserId: string;
    deliveryDate?: string;
    notes?: string;
    trdr?: number;
    /** Customer branch; falls back to the sending branch mapping. */
    trdBranch?: number;
    /** Sending branch, drives both SERIES and the setData clientID. */
    branch?: number;
    items: RawBasketItem[];
};

function firstItemNumber(items: RawBasketItem[], keys: string[]) {
    for (const item of items) {
        for (const key of keys) {
            const parsed = jsonSafeNumber(item[key]);

            if (parsed != null) {
                return parsed;
            }
        }
    }

    return undefined;
}

/**
 * Καλάθι Πελάτη: one setData document for the whole basket, then a single
 * MASS_DELETE / LINK_S1 for every basket row it contained.
 */
export async function submitBasketOrder(body: BasketOrderRequestBody) {
    const sqlClientID = getSoftOneClientID();

    if (!sqlClientID) {
        throw new Error('Δεν έχει ρυθμιστεί ο SQL πελάτης SoftOne.');
    }

    const appUserId = requireAppUserId(body.appUserId);
    const rawItems = requireRawItems(body.items) as RawBasketItem[];
    const lines = requireLines(normalizeOrderLines(rawItems));

    // The branch that sends the order: decides SERIES and the setData clientID.
    const branch =
        jsonSafeNumber(body.branch) ??
        firstItemNumber(rawItems, ["branch", "BRANCH"]) ??
        BASKET_DEFAULT_BRANCH;
    const clientID = getSoftOneSetDataClientID(branch);

    if (!clientID) {
        throw new Error('Δεν έχει ρυθμιστεί ο πελάτης setData SoftOne.');
    }

    const trdr = jsonSafeNumber(body.trdr);

    if (!trdr) {
        throw new Error('Λείπει ο πελάτης (TRDR) της παραγγελίας.');
    }

    const trdBranch =
        jsonSafeNumber(body.trdBranch) ??
        firstItemNumber(rawItems, ["trdBranch", "TRD_BRANCH"]) ??
        getTrdBranchByBranchCode(branch) ??
        BASKET_DEFAULT_TRDBRANCH;

    const payload = buildBasketPayload({
        clientID,
        series: getSaldocSeriesByBranchCode(branch) ?? BASKET_DEFAULT_SERIES,
        trdr,
        trdBranch,
        payment: BASKET_PAYMENT,
        trucks: BASKET_TRUCKS,
        deliveryDate: resolveIsoDate(body.deliveryDate),
        comments: BASKET_COMMENTS,
        remarks: String(body.notes ?? "").trim(),
        shipKind: BASKET_SHIPKIND,
        socash: BASKET_SOCASH,
        lines: lines.map((line) => ({ MTRL: line.mtrl, QTY1: line.qty })),
    });

    const documentId = await postSetDataDocument({
        payload,
        endpointEnvKey: BASKET_ENDPOINT_ENV_KEY,
        logLabel: BASKET_LOG_LABEL,
        failureMessage: 'Αποτυχία υποβολής παραγγελίας στο SoftOne.',
        missingIdMessage:
            'Η παραγγελία υποβλήθηκε αλλά λείπει το αναγνωριστικό από την απάντηση.',
    });

    const basketIds = uniqueBasketIds(lines);

    await linkBasketRowsToDocument({
        sqlClientID,
        basketIds,
        tableAction: BASKET_TABLE_ACTION,
        submitType: "basket",
        documentId,
        appUserId,
        logLabel: BASKET_LOG_LABEL,
    });

    return {
        success: true as const,
        id: documentId,
        orderIds: [documentId],
        basketIds,
    };
}
