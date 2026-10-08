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
import {
    ANATROF_COMMENTS,
    ANATROF_DEFAULT_BRANCH,
    ANATROF_DEFAULT_SERIES,
    ANATROF_ENDPOINT_ENV_KEY,
    ANATROF_LOG_LABEL,
    ANATROF_PAYMENT,
    ANATROF_SHIPKIND,
    ANATROF_SOCASH,
    ANATROF_TABLE_ACTION,
    ANATROF_TRDBRANCH,
    ANATROF_TRDR,
    ANATROF_TRUCKS,
} from "./anatrof-constants";
import { buildAnatrofPayload } from "./build-anatrof-payload";

export type RawAnatrofItem = RawOrderItem & {
    branch?: unknown;
    BRANCH?: unknown;
    QTY?: unknown;
    QTY_REQUESTED?: unknown;
};

export type AnatrofOrderRequestBody = {
    appUserId: string;
    deliveryDate?: string;
    notes?: string;
    branch?: number | string;
    items: RawAnatrofItem[];
};

function firstItemNumber(items: RawAnatrofItem[], keys: string[]) {
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

export async function submitAnatrofOrder(body: AnatrofOrderRequestBody) {
    const sqlClientID = getSoftOneClientID();

    if (!sqlClientID) {
        throw new Error('Δεν έχει ρυθμιστεί ο SQL πελάτης SoftOne.');
    }

    const appUserId = requireAppUserId(body.appUserId);
    const rawItems = requireRawItems(body.items) as RawAnatrofItem[];
    const lines = requireLines(normalizeOrderLines(rawItems));

    const branch =
        jsonSafeNumber(body.branch) ??
        firstItemNumber(rawItems, ["branch", "BRANCH"]) ??
        ANATROF_DEFAULT_BRANCH;
    const clientID = getSoftOneSetDataClientID(branch);

    if (!clientID) {
        throw new Error('Δεν έχει ρυθμιστεί ο πελάτης setData SoftOne.');
    }

    const payload = buildAnatrofPayload({
        clientID,
        series: getSaldocSeriesByBranchCode(branch) ?? ANATROF_DEFAULT_SERIES,
        trdr: ANATROF_TRDR, // fixed - ΠΑΣΧΑΛΙΔΗΣ
        trdBranch: ANATROF_TRDBRANCH, // fixed - ΠΑΣΧΑΛΙΔΗΣ
        payment: ANATROF_PAYMENT,
        trucks: ANATROF_TRUCKS,
        deliveryDate: resolveIsoDate(body.deliveryDate),
        comments: ANATROF_COMMENTS,
        remarks: String(body.notes ?? "").trim(),
        shipKind: ANATROF_SHIPKIND,
        socash: ANATROF_SOCASH,
        requestingBranch: branch,
        lines: lines.map((line) => ({ MTRL: line.mtrl, QTY1: line.qty })),
    });

    const documentId = await postSetDataDocument({
        payload,
        endpointEnvKey: ANATROF_ENDPOINT_ENV_KEY,
        logLabel: ANATROF_LOG_LABEL,
        failureMessage: 'Αποτυχία υποβολής παραγγελίας αποθέματος στο SoftOne.',
        missingIdMessage:
            'Η παραγγελία υποβλήθηκε αλλά λείπει το αναγνωριστικό από την απάντηση.',
    });

    const basketIds = uniqueBasketIds(lines);

    await linkBasketRowsToDocument({
        sqlClientID,
        basketIds,
        tableAction: ANATROF_TABLE_ACTION,
        submitType: "anatrof",
        documentId,
        appUserId,
        logLabel: ANATROF_LOG_LABEL,
    });

    return {
        success: true as const,
        id: documentId,
        orderIds: [documentId],
        basketIds,
    };
}
