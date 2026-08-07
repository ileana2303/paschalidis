import type { EndoListRoutePayload, IEndoListRow } from "@/lib/interface";
import { formatDateTimeEl } from "@/lib/utils/date";
import { parseNonNegativeInt, parsePositiveInt } from "@/lib/utils/number";

export type EndoListScope = Exclude<EndoListRoutePayload["scope"], "both" | undefined>;

export const REQUESTED_QTY_COLUMN_KEY = "__REQUESTED_QTY";
export const QTY_ACTIONS_COLUMN_KEY = "__QTY_ACTIONS";

export function formatColumnLabel(key: string) {
    if (key === REQUESTED_QTY_COLUMN_KEY) {
        return "Requested QTY";
    }

    if (key === QTY_ACTIONS_COLUMN_KEY) {
        return "Update / SALDOC";
    }

    return key.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

export const formatDateTime = formatDateTimeEl;

export function buildColumns(rows: IEndoListRow[]) {
    const keys = new Set<string>();

    rows.forEach((row) => {
        Object.keys(row).forEach((key) => keys.add(key));
    });

    const preferredOrder = [
        "BASKETID",
        "ID",
        "INS_DATE",
        "BRANCH",
        "TO_BRANCH",
        "MTRL",
        "ITEM_CODE",
        "ITEM_DESCR",
        "QTY",
        "QTY_REQUESTED",
        "STATUS",
        "STATUS_LABEL",
    ];

    return Array.from(keys).sort((a, b) => {
        const aIndex = preferredOrder.indexOf(a);
        const bIndex = preferredOrder.indexOf(b);

        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;

        return a.localeCompare(b, "el-GR");
    });
}

export function filterRows(rows: IEndoListRow[], searchTerm: string) {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
        return rows;
    }

    return rows.filter((row) =>
        Object.values(row).some((value) =>
            String(value ?? "").toLowerCase().includes(normalizedSearch)
        )
    );
}

export function parseQtyValue(value: unknown) {
    return parseNonNegativeInt(value);
}

export function parsePositiveValue(value: unknown) {
    return parsePositiveInt(value);
}

export function getRowKey(row: IEndoListRow, index: number) {
    return String(row.BASKETID || row.ID || `${row.MTRL ?? "row"}-${index}`);
}

export function hasQtyUpdateFields(row: IEndoListRow, allowBranchFallbackForToBranch = false) {
    const basketId = String(row.BASKETID ?? row.ID ?? "").trim();
    const mtrl = String(row.MTRL ?? "").trim();
    const toBranch =
        String(row.TO_BRANCH ?? "").trim() ||
        (allowBranchFallbackForToBranch ? String(row.BRANCH ?? "").trim() : "");

    return Boolean(basketId && mtrl && toBranch);
}

export function getRequestedQtyFromRow(row: IEndoListRow) {
    return parseQtyValue(row.QTY_REQUESTED || row.QTY || "0");
}

export function getRequestedBasketQtyFromRow(row: IEndoListRow) {
    return parseQtyValue(row.QTY || row.QTY_REQUESTED || "0");
}

export function getTrackedQtyFromRow(row: IEndoListRow, scope: EndoListScope) {
    return scope === "requested"
        ? getRequestedBasketQtyFromRow(row)
        : getRequestedQtyFromRow(row);
}

export function canApproveRowWithQty(row: IEndoListRow, qty: number) {
    const basketId = String(row.BASKETID ?? row.ID ?? "").trim();
    const mtrl = parsePositiveValue(row.MTRL);
    const sourceBranch = parsePositiveValue(row.BRANCH);
    const destinationBranch = parsePositiveValue(row.TO_BRANCH);

    return Boolean(
        basketId &&
        mtrl > 0 &&
        qty > 0 &&
        sourceBranch > 0 &&
        destinationBranch > 0
    );
}

export function isDateColumnKey(key: string) {
    return /DATE|TS|TIME/i.test(key);
}

export function isStatusColumnKey(key: string) {
    return /STATUS/i.test(key);
}
