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
import { buildSupplierBasketPayload } from "./build-supplier-basket-payload";
import {
    SUPPLIER_BASKET_ENDPOINT_ENV_KEY,
    SUPPLIER_BASKET_LOG_LABEL,
    SUPPLIER_BASKET_TABLE_ACTION,
} from "./supplier-basket-constants";

export type SupplierBasketOrderRequestBody = {
    appUserId?: string;
    branch: string | number;
    supplierTrdr: string | number;
    transactionDate?: string;
    sodType?: string | number;
    trucks?: string | number;
    items: RawOrderItem[];
};

export async function submitSupplierBasketOrder(
    body: SupplierBasketOrderRequestBody
) {
    const sqlClientID = getSoftOneClientID();

    if (!sqlClientID) {
        throw new Error("Δεν έχει ρυθμιστεί ο SQL πελάτης SoftOne.");
    }

    const appUserId = requireAppUserId(body.appUserId);
    const branch = jsonSafeNumber(body.branch);

    if (!branch) {
        throw new Error("Λείπει το υποκατάστημα του καλαθιού προμηθευτή.");
    }

    const supplierTrdr = jsonSafeNumber(body.supplierTrdr);

    if (!supplierTrdr) {
        throw new Error("Λείπει ο προμηθευτής (TRDR) του καλαθιού.");
    }

    const clientID = getSoftOneSetDataClientID(branch);

    if (!clientID) {
        throw new Error("Δεν έχει ρυθμιστεί ο πελάτης setData SoftOne.");
    }

    const rawItems = requireRawItems(body.items);
    const lines = requireLines(normalizeOrderLines(rawItems));
    const transactionDate = resolveIsoDate(body.transactionDate);
    const fiscalYear = transactionDate.slice(0, 4);
    const sodType = String(body.sodType ?? "").trim() || undefined;
    const trucks = jsonSafeNumber(body.trucks);
    const payload = buildSupplierBasketPayload({
        clientID,
        transactionDate,
        fiscalYear,
        supplierTrdr: String(supplierTrdr),
        branch,
        sodType,
        trucks,
        lines: lines.map((line) => ({
            MTRL: line.mtrl,
            QTY1: line.qty,
        })),
    });

    const documentId = await postSetDataDocument({
        payload,
        endpointEnvKey: SUPPLIER_BASKET_ENDPOINT_ENV_KEY,
        logLabel: SUPPLIER_BASKET_LOG_LABEL,
        failureMessage: "Αποτυχία υποβολής παραγγελίας προμηθευτή στο SoftOne.",
        missingIdMessage:
            "Η παραγγελία προμηθευτή υποβλήθηκε αλλά λείπει το αναγνωριστικό από την απάντηση.",
    });

    const basketIds = uniqueBasketIds(lines);

    await linkBasketRowsToDocument({
        sqlClientID,
        basketIds,
        tableAction: SUPPLIER_BASKET_TABLE_ACTION,
        submitType: "supplier-basket",
        documentId,
        appUserId,
        logLabel: SUPPLIER_BASKET_LOG_LABEL,
    });

    return {
        success: true as const,
        id: documentId,
        orderIds: [documentId],
        basketIds,
    };
}
