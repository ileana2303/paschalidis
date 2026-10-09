import {
    getKnownBranchName,
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
import {
    ANATROF_DEFAULT_SERIES,
    ANATROF_ENDPOINT_ENV_KEY,
    ANATROF_LOG_LABEL,
    ANATROF_PAYMENT,
    ANATROF_SHIPKIND,
    ANATROF_SOCASH,
    ANATROF_TABLE_ACTION,
    ANATROF_TRDR,
    ANATROF_TRUCKS,
} from "./anatrof-constants";
import { buildAnatrofPayload } from "./build-anatrof-payload";

export type RawAnatrofItem = RawOrderItem & {
    requestingBranch?: unknown;
    BRANCH?: unknown;
    QTY?: unknown;
    QTY_REQUESTED?: unknown;
};

export type AnatrofOrderRequestBody = {
    appUserId: string;
    deliveryDate?: string;
    notes?: string;
    requestingBranch: number | string;
    supplyingBranch: number | string;
    items: RawAnatrofItem[];
};

function requireBranch(value: unknown, role: "requesting" | "supplying") {
    const branch = jsonSafeNumber(value);

    if (!branch) {
        const label = role === "requesting" ? "αίτησης" : "τροφοδοσίας";
        throw new Error(`Λείπει το υποκατάστημα ${label}.`);
    }

    return branch;
}

export async function submitAnatrofOrder(body: AnatrofOrderRequestBody) {
    const sqlClientID = getSoftOneClientID();

    if (!sqlClientID) {
        throw new Error('Δεν έχει ρυθμιστεί ο SQL πελάτης SoftOne.');
    }

    const appUserId = requireAppUserId(body.appUserId);
    const rawItems = requireRawItems(body.items) as RawAnatrofItem[];
    const lines = requireLines(normalizeOrderLines(rawItems));

    const requestingBranch = requireBranch(body.requestingBranch, "requesting");
    const supplyingBranch = requireBranch(body.supplyingBranch, "supplying");
    const invalidItemBranch = rawItems.find((item) => {
        const itemBranch = jsonSafeNumber(item.requestingBranch ?? item.BRANCH);

        return itemBranch !== requestingBranch;
    });

    if (invalidItemBranch) {
        throw new Error(
            'Οι γραμμές του καλαθιού δεν ανήκουν στο υποκατάστημα αίτησης.'
        );
    }

    const trdBranch = getTrdBranchByBranchCode(requestingBranch);

    if (!trdBranch) {
        throw new Error(
            `Δεν βρέθηκε TRDBRANCH για το υποκατάστημα αίτησης (${requestingBranch})`
        );
    }

    const clientID = getSoftOneSetDataClientID(supplyingBranch);

    if (!clientID) {
        throw new Error(
            `Δεν έχει ρυθμιστεί ο πελάτης setData SoftOne για το υποκατάστημα τροφοδοσίας (${supplyingBranch}).`
        );
    }

    const basketIds = uniqueBasketIds(lines);
    console.info(
        `${ANATROF_LOG_LABEL} ${supplyingBranch} supplies -> ${requestingBranch} requested` +
            ` (TRDBRANCH ${trdBranch}, BRANCHSEC/WHOUSESEC/WHOUSE ${supplyingBranch})`
    );
    const payload = buildAnatrofPayload({
        clientID,
        series:
            getSaldocSeriesByBranchCode(supplyingBranch) ??
            ANATROF_DEFAULT_SERIES,
        trdr: ANATROF_TRDR, // fixed - ΠΑΣΧΑΛΙΔΗΣ
        trdBranch, // requesting branch
        payment: ANATROF_PAYMENT,
        trucks: ANATROF_TRUCKS,
        deliveryDate: resolveIsoDate(body.deliveryDate),
        basketId: basketIds[0],
        requestingBranchCode: requestingBranch,
        requestingBranchName:
            getKnownBranchName(requestingBranch) ?? String(requestingBranch),
        supplyingBranchName:
            getKnownBranchName(supplyingBranch) ?? String(supplyingBranch),
        remarks: String(body.notes ?? "").trim(),
        shipKind: ANATROF_SHIPKIND,
        socash: ANATROF_SOCASH,
        supplyingBranch,
        cccExtUser: appUserId,
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
