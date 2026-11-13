import { getTrdBranchByBranchCode } from "@/lib/auth/branches";
import { getSoftOneSetDataClientID } from "@/lib/softone";
import { requireAppUserId, requireLines } from "../shared/lines";
import { postSetDataDocument } from "../shared/post-setdata";
import { jsonSafeNumber, resolveIsoDate } from "../validation";
import { buildEndoPriorityPayload } from "./build-endo-priority-payload";
import { buildEndoPriorityComments } from "./endo-comments";
import {
    ENDO_ENDPOINT_ENV_KEY,
    ENDO_PRIORITY_LOG_LABEL,
    ENDO_TRDR,
} from "./endo-constants";

export type RawEndoPriorityItem = {
    mtrl?: unknown;
    qty?: unknown;
    supplyingBranch?: unknown;
    requestingBranch?: unknown;
};

type EndoPriorityLine = {
    mtrl: number;
    qty: number;
    supplyingBranch: number;
    requestingBranch: number;
};

export type EndoPriorityOrderRequestBody = {
    appUserId: string;
    deliveryDate?: string;
    notes?: string;
    items: RawEndoPriorityItem[];
};

function normalizePriorityLines(items: unknown): EndoPriorityLine[] {
    const rawItems = Array.isArray(items) ? (items as RawEndoPriorityItem[]) : [];

    return requireLines(
        rawItems
            .map((item) => {
                const mtrl = jsonSafeNumber(item.mtrl);
                const qty = jsonSafeNumber(item.qty);
                const supplyingBranch = jsonSafeNumber(item.supplyingBranch);
                const requestingBranch = jsonSafeNumber(item.requestingBranch);

                if (
                    !mtrl ||
                    !qty ||
                    !supplyingBranch ||
                    !requestingBranch ||
                    supplyingBranch === requestingBranch
                ) {
                    return null;
                }

                return { mtrl, qty, supplyingBranch, requestingBranch };
            })
            .filter((line): line is EndoPriorityLine => line !== null)
    );
}

/** Creates Priority ENDO documents directly, without inserting or linking ENDO basket rows. */
export async function submitEndoPriorityOrder(body: EndoPriorityOrderRequestBody) {
    const appUserId = requireAppUserId(body.appUserId);
    const lines = normalizePriorityLines(body.items);
    const deliveryDate = resolveIsoDate(body.deliveryDate);
    const remarks = String(body.notes ?? "").trim();
    const documentIds: string[] = [];

    for (const line of lines) {
        const clientID = getSoftOneSetDataClientID(line.requestingBranch, {
            endo: true,
        });

        if (!clientID) {
            throw new Error(
                `Δεν έχει ρυθμιστεί ο πελάτης setData SoftOne για την Priority ενδοδιακίνηση (${line.requestingBranch})`
            );
        }

        const trdBranch = getTrdBranchByBranchCode(line.requestingBranch);

        if (!trdBranch) {
            throw new Error(
                `Δεν βρέθηκε TRDBRANCH για το υποκατάστημα αίτησης (${line.requestingBranch})`
            );
        }

        const payload = buildEndoPriorityPayload({
            clientID,
            trdr: ENDO_TRDR,
            trdBranch,
            deliveryDate,
            comments: buildEndoPriorityComments(line),
            remarks,
            requestingBranch: line.requestingBranch,
            cccExtUser: appUserId,
            lines: [{ MTRL: line.mtrl, QTY1: line.qty }],
        });

        const documentId = await postSetDataDocument({
            payload,
            endpointEnvKey: ENDO_ENDPOINT_ENV_KEY,
            logLabel: ENDO_PRIORITY_LOG_LABEL,
            failureMessage: "Αποτυχία υποβολής Priority ενδοδιακίνησης",
            missingIdMessage:
                "Η Priority ενδοδιακίνηση υποβλήθηκε αλλά λείπει το αναγνωριστικό από την απάντηση",
        });

        documentIds.push(documentId);
    }

    return {
        success: true as const,
        id: documentIds[0],
        orderIds: documentIds,
        basketIds: [],
    };
}
