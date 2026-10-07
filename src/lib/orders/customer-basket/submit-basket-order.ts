import { getSaldocSeriesByBranchCode } from "@/lib/auth/branches";
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
    BASKET_DEFAULT_BRANCH,
    BASKET_DEFAULT_SERIES,
    BASKET_ENDPOINT_ENV_KEY,
    BASKET_LOG_LABEL,
    BASKET_PAYMENT,
    BASKET_SHIPKIND,
    BASKET_SOCASH,
    BASKET_TABLE_ACTION,
    BASKET_TRUCKS,
    type BasketReceiptType,
} from "./basket-constants";

export type RawBasketItem = RawOrderItem & {
    branch?: unknown;
    BRANCH?: unknown;
    trdBranch?: unknown;
    TRD_BRANCH?: unknown;
};

export type BasketOrderRequestBody = {
    appUserId: string;
    /** Login username for SALDOC.CCCEXTUSER (prefer session on API route). */
    username?: string;
    deliveryDate?: string;
    notes?: string;
    receiptType?: BasketReceiptType;
    trdr?: number;
    /** Customer branch, read from the selected customer's basket rows. */
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

function requireUsername(value: unknown) {
    const username = String(value ?? "").trim();

    if (!username) {
        throw new Error('Λείπει το όνομα χρήστη (username).');
    }

    return username;
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
    const cccExtUser = requireUsername(body.username);
    const rawItems = requireRawItems(body.items) as RawBasketItem[];
    const lines = requireLines(normalizeOrderLines(rawItems));

    const lineWithoutPrice = lines.find((line) => line.price <= 0);

    if (lineWithoutPrice) {
        throw new Error(
            `Λείπει έγκυρη τιμή (PRICE) για το είδος MTRL ${lineWithoutPrice.mtrl}.`
        );
    }

    // The branch that sends the order: decides SERIES and the setData clientID.
    const branch =
        jsonSafeNumber(body.branch) ??
        firstItemNumber(rawItems, ["branch", "BRANCH"]) ??
        BASKET_DEFAULT_BRANCH;
    const clientID = getSoftOneSetDataClientID(branch);

    if (!clientID) {
        throw new Error('Δεν έχει ρυθμιστεί ο πελάτης setData SoftOne.');
    }

    const customerTrdr = jsonSafeNumber(body.trdr);

    if (!customerTrdr) {
        throw new Error('Λείπει ο πελάτης (TRDR) της παραγγελίας.');
    }

    const trdBranch =
        jsonSafeNumber(body.trdBranch) ??
        firstItemNumber(rawItems, ["trdBranch", "TRD_BRANCH"]);

    if (!trdBranch) {
        throw new Error('Λείπει το υποκατάστημα του πελάτη (TRDBRANCH).');
    }

    const receiptType: BasketReceiptType =
        body.receiptType === "receipt" ? "receipt" : "invoice";

    const payload = buildBasketPayload({
        clientID,
        series: getSaldocSeriesByBranchCode(branch) ?? BASKET_DEFAULT_SERIES,
        customerTrdr,
        receiptType,
        trdBranch,
        payment: BASKET_PAYMENT,
        trucks: BASKET_TRUCKS,
        deliveryDate: resolveIsoDate(body.deliveryDate),
        remarks: String(body.notes ?? "").trim(),
        shipKind: BASKET_SHIPKIND,
        socash: BASKET_SOCASH,
        cccExtUser,
        lines: lines.map((line) => ({
            MTRL: line.mtrl,
            QTY1: line.qty,
            PRICE: line.price,
        })),
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
