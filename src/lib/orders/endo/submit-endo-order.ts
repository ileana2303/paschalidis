import { getTrdBranchByBranchCode } from "@/lib/auth/branches";
import { getSoftOneClientID, getSoftOneSetDataClientID } from "@/lib/softone";
import { linkBasketRowsToDocument } from "../shared/link-basket-to-document";
import {
    requireAppUserId,
    requireRawItems,
} from "../shared/lines";
import { postSetDataDocument } from "../shared/post-setdata";
import { resolveIsoDate, validateBasketIds } from "../validation";
import { buildEndoPayload } from "./build-endo-payload";
import { buildEndoComments } from "./endo-comments";
import {
    ENDO_ENDPOINT_ENV_KEY,
    ENDO_LOG_LABEL,
    ENDO_TABLE_ACTION,
    ENDO_TRDR,
} from "./endo-constants";
import { normalizeEndoLines, type EndoLine, type RawEndoItem } from "./endo-lines";

export type EndoOrderRequestBody = {
    appUserId: string;
    deliveryDate?: string;
    notes?: string;
    items: RawEndoItem[];
};

/**
 * Branch-dependent header values for one ENDO line. The fixed SALDOC values live
 * in `endo-constants.ts`; this only resolves what the branches decide.
 *
 * Example - branch 1000 is logged in and asks 5 pieces from 1006:
 *   supplyingBranch  1006 -> TRDBRANCH 13 and the setData clientID
 *   requestingBranch 1000 -> BRANCHSEC 1000, WHOUSESEC 1000
 */
function resolveEndoLineHeader(line: EndoLine) {
    const { supplyingBranch, requestingBranch } = line;

    // The branch that sends the items owns the document, so it also owns the
    // setData clientID it is submitted with.
    const clientID = getSoftOneSetDataClientID(supplyingBranch, { endo: true });

    if (!clientID) {
        throw new Error(
            `Δεν έχει ρυθμιστεί ο πελάτης setData SoftOne για την ενδοκίνηση (${supplyingBranch})`
        );
    }

    // TRDBRANCH = the ΠΑΣΧΑΛΙΔΗΣ branch the items were requested from.
    const trdBranch = getTrdBranchByBranchCode(supplyingBranch);

    if (!trdBranch) {
        throw new Error(
            `Δεν βρέθηκε TRDBRANCH για το υποκατάστημα αποστολής (${supplyingBranch})`
        );
    }

    return {
        clientID,
        trdBranch,
        requestingBranch,
    };
}

/**
 * Ενδοδιακίνηση Ανταλλακτικών: one setData document per basket line, each one
 * followed by its own MASS_DELETE / LINK_S1 so a later failure cannot re-submit
 * lines that already reached SoftOne.
 */
export async function submitEndoOrder(body: EndoOrderRequestBody) {
    const sqlClientID = getSoftOneClientID();

    if (!sqlClientID) {
        throw new Error('Δεν έχει ρυθμιστεί ο SQL πελάτης SoftOne.');
    }

    const appUserId = requireAppUserId(body.appUserId);
    const lines = normalizeEndoLines(requireRawItems(body.items));
    const deliveryDate = resolveIsoDate(body.deliveryDate);
    const remarks = String(body.notes ?? "").trim();

    const documentIds: string[] = [];
    const submittedBasketIds: string[] = [];

    for (const line of lines) {
        validateBasketIds([line.basketId]);

        const header = resolveEndoLineHeader(line);

        console.info(
            `${ENDO_LOG_LABEL} basket ${line.basketId}: ${line.supplyingBranch} sends -> ${line.requestingBranch} asked` +
                ` (TRDBRANCH ${header.trdBranch}, BRANCHSEC/WHOUSESEC ${header.requestingBranch})`
        );
        const payload = buildEndoPayload({
            clientID: header.clientID,
            trdr: ENDO_TRDR,
            trdBranch: header.trdBranch,
            basketId: line.basketId,
            deliveryDate,
            comments: buildEndoComments({
                basketId: line.basketId,
                supplyingBranch: line.supplyingBranch,
                requestingBranch: line.requestingBranch,
            }),
            remarks,
            requestingBranch: header.requestingBranch,
            lines: [{ MTRL: line.mtrl, QTY1: line.qty }],
        });

        const documentId = await postSetDataDocument({
            payload,
            endpointEnvKey: ENDO_ENDPOINT_ENV_KEY,
            logLabel: ENDO_LOG_LABEL,
            failureMessage: `Αποτυχία υποβολής ενδοκίνησης για το καλάθι (${line.basketId})`,
            missingIdMessage: `Η ενδοκίνηση υποβλήθηκε αλλά λείπει το αναγνωριστικό από την απάντηση (${line.basketId})`,
        });

        await linkBasketRowsToDocument({
            sqlClientID,
            basketIds: [line.basketId],
            tableAction: ENDO_TABLE_ACTION,
            submitType: "endo",
            documentId,
            appUserId,
            logLabel: ENDO_LOG_LABEL,
        });

        documentIds.push(documentId);
        submittedBasketIds.push(line.basketId);
    }

    return {
        success: true as const,
        id: documentIds[0],
        orderIds: documentIds,
        basketIds: submittedBasketIds,
    };
}
