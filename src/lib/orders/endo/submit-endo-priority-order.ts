import { getTrdBranchByBranchCode } from "@/lib/auth/branches";
import { getSoftOneClientID } from "@/lib/softone";
import {
    deleteBasketRows,
    linkBasketRowsToDocument,
} from "../shared/link-basket-to-document";
import { requireAppUserId, requireLines } from "../shared/lines";
import { postSetDataDocument } from "../shared/post-setdata";
import { jsonSafeNumber, resolveIsoDate } from "../validation";
import { buildEndoPriorityPayload } from "./build-endo-priority-payload";
import { buildEndoPriorityComments } from "./endo-comments";
import {
    ENDO_ENDPOINT_ENV_KEY,
    ENDO_PRIORITY_LOG_LABEL,
    ENDO_TABLE_ACTION,
    ENDO_TRDR,
} from "./endo-constants";
import { insertEndoBasketRow } from "./insert-endo-basket-row";

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
    customerName?: string;
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

/**
 * Reserves a BASKETID through NOW_ENDO_INSERT. Priority ENDO has no basket of
 * its own; the BASKETID gives it the same "Νο<basketId>" in COMMENTS and the
 * same LINK_S1 traceability as ENDO. It is NOT sent as SERIESNUM: SoftOne
 * auto-numbers series 7004 for ENDO, Priority and ANATROF alike.
 */
async function reservePriorityBasketId(
    line: EndoPriorityLine,
    sqlClientID: string,
    appUserId: string
) {
    const inserted = await insertEndoBasketRow({
        clientID: sqlClientID,
        mtrl: line.mtrl,
        qty: line.qty,
        supplyingBranch: line.supplyingBranch,
        requestingBranch: line.requestingBranch,
        appUserId,
        logLabel: ENDO_PRIORITY_LOG_LABEL,
    });

    if (!inserted.ok) {
        throw new Error(
            `Αποτυχία δέσμευσης αριθμού για την Priority ενδοδιακίνηση: ${inserted.message}`
        );
    }

    if (!inserted.basketId) {
        throw new Error(
            "Η δέσμευση αριθμού για την Priority ενδοδιακίνηση δεν επέστρεψε BASKETID"
        );
    }

    return inserted.basketId;
}

/**
 * Creates Priority ENDO documents directly, one per line:
 * NOW_ENDO_INSERT (reserve BASKETID) -> setData (SoftOne auto-numbers) ->
 * MASS_DELETE LINK_S1 + DELETE. If setData fails the reserved row is deleted,
 * so it never lingers in the ENDO lists.
 */
export async function submitEndoPriorityOrder(body: EndoPriorityOrderRequestBody) {
    const appUserId = requireAppUserId(body.appUserId);
    const lines = normalizePriorityLines(body.items);
    const deliveryDate = resolveIsoDate(body.deliveryDate);
    const remarks = String(body.notes ?? "").trim();
    const documentIds: string[] = [];
    const basketIds: string[] = [];

    for (const line of lines) {
        // SoftOne stores SALDOC.BRANCH as the clientID's login branch and ignores
        // the BRANCH we send, so the clientID must be the supplying branch's -
        // otherwise the document lands in the requester's picking list.
        const clientID = getSoftOneClientID(line.supplyingBranch);

        if (!clientID) {
            throw new Error(
                `Δεν έχει ρυθμιστεί ο πελάτης setData SoftOne για την Priority ενδοδιακίνηση (${line.supplyingBranch})`
            );
        }

        const trdBranch = getTrdBranchByBranchCode(line.requestingBranch);

        if (!trdBranch) {
            throw new Error(
                `Δεν βρέθηκε TRDBRANCH για το υποκατάστημα αίτησης (${line.requestingBranch})`
            );
        }

        const basketId = await reservePriorityBasketId(line, clientID, appUserId);

        console.info(
            `${ENDO_PRIORITY_LOG_LABEL} reserved BASKETID ${basketId}: ${line.supplyingBranch} sends -> ${line.requestingBranch} asked`
        );

        const payload = buildEndoPriorityPayload({
            clientID,
            trdr: ENDO_TRDR,
            trdBranch,
            deliveryDate,
            comments: buildEndoPriorityComments({
                basketId,
                supplyingBranch: line.supplyingBranch,
                requestingBranch: line.requestingBranch,
                customerName: body.customerName,
            }),
            remarks,
            supplyingBranch: line.supplyingBranch,
            cccExtUser: appUserId,
            lines: [{ MTRL: line.mtrl, QTY1: line.qty }],
        });

        let documentId: string;

        try {
            documentId = await postSetDataDocument({
                payload,
                endpointEnvKey: ENDO_ENDPOINT_ENV_KEY,
                logLabel: ENDO_PRIORITY_LOG_LABEL,
                failureMessage: "Αποτυχία υποβολής Priority ενδοδιακίνησης",
                missingIdMessage:
                    "Η Priority ενδοδιακίνηση υποβλήθηκε αλλά λείπει το αναγνωριστικό από την απάντηση",
            });
        } catch (error) {
            // Best effort: drop the reserved row so it does not show up as an
            // open ENDO request. The setData error is what the user must see.
            await deleteBasketRows({
                sqlClientID: clientID,
                basketIds: [basketId],
                tableAction: ENDO_TABLE_ACTION,
                logLabel: ENDO_PRIORITY_LOG_LABEL,
            }).catch((cleanupError) => {
                console.error(
                    `${ENDO_PRIORITY_LOG_LABEL} cleanup of BASKETID ${basketId} failed`,
                    cleanupError
                );
            });

            throw error;
        }

        await linkBasketRowsToDocument({
            sqlClientID: clientID,
            basketIds: [basketId],
            tableAction: ENDO_TABLE_ACTION,
            submitType: "endo",
            documentId,
            appUserId,
            logLabel: ENDO_PRIORITY_LOG_LABEL,
        });

        documentIds.push(documentId);
        basketIds.push(basketId);
    }

    return {
        success: true as const,
        id: documentIds[0],
        orderIds: documentIds,
        basketIds,
    };
}
