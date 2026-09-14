import type { IStockRequestListRow } from "@/lib/interface";
import { formatDateTimeEl } from "@/lib/utils/date";
import { parseSoftOneNumber } from "@/lib/utils/number";

export type StockBranchCode = "1000" | "1006" | "1007";
/** SoftOne stock columns - still YP1001 for Κασομούλη. CHECK with BE*/
export type StockBranchStockKey = "YP1001" | "YP1006" | "YP1007";

export const STOCK_REQUEST_BRANCH_OPTIONS: Array<{ code: StockBranchCode; label: string }> = [
    { code: "1000", label: "Κασομούλη" },
    { code: "1006", label: "Λ. Αθηνών" },
    { code: "1007", label: "Λ. Μεσογείων" },
];

export const STOCK_BRANCH_COLUMNS: Array<{
    code: StockBranchCode;
    label: string;
    stockKey: StockBranchStockKey;
}> = [
    { code: "1000", label: "Κασομούλη", stockKey: "YP1001" },
    { code: "1006", label: "Λ.Αθηνών", stockKey: "YP1006" },
    { code: "1007", label: "Λ.Μεσογείων", stockKey: "YP1007" },
];

export function getStatusStyle(status: string) {
    const normalized = status.toUpperCase();

    if (normalized.includes("ΕΓΚΡΙΘ")) {
        return "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400";
    }

    if (
        normalized.includes("ΔΙΑΓΡ") ||
        normalized.includes("DELETE") ||
        normalized.includes("ΑΠΟΡΡΙ")
    ) {
        return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400";
    }

    return "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
}

export function canUpdate(status: string) {
    return status.toUpperCase().includes("ΕΚΚΡΕΜ");
}

export function canSubmitAnatrofRow(status: string) {
    const normalized = status.toUpperCase();

    return normalized.includes("ΕΓΚΡΙΘ") || normalized.includes("APPROV");
}

export function getStatusPriority(status: string) {
    const normalized = status.toUpperCase();

    if (normalized.includes("ΕΚΚΡΕΜ") || normalized.includes("PENDING")) {
        return 0;
    }

    if (normalized.includes("ΕΓΚΡΙΘ") || normalized.includes("APPROV")) {
        return 1;
    }

    if (
        normalized.includes("ΔΙΑΓΡ") ||
        normalized.includes("DELETE") ||
        normalized.includes("ΑΠΟΡΡΙ")
    ) {
        return 2;
    }

    return 3;
}

function parseDateValue(value: string) {
    const timestamp = new Date(value).getTime();

    return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function sortStockRequestRows(rows: IStockRequestListRow[]) {
    return [...rows].sort((a, b) => {
        const statusRankDiff =
            getStatusPriority(a.STATUS) - getStatusPriority(b.STATUS);

        if (statusRankDiff !== 0) return statusRankDiff;

        const statusNameDiff = a.STATUS.localeCompare(b.STATUS, "el-GR");

        if (statusNameDiff !== 0) return statusNameDiff;

        return parseDateValue(b.INS_DATE) - parseDateValue(a.INS_DATE);
    });
}

export const formatDateTime = formatDateTimeEl;

export function getValidatedQty(value: string) {
    const parsed = parseSoftOneNumber(value);

    if (parsed == null || !Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }

    return String(parsed);
}

export function getRequestedQty(row: IStockRequestListRow) {
    return String(row.QTY_REQUESTED ?? "").trim() || "—";
}

export function getActionQty(row: IStockRequestListRow) {
    return getValidatedQty(getRequestedQty(row));
}

export function isStockRequestBranchCode(value: string): value is StockBranchCode {
    return STOCK_REQUEST_BRANCH_OPTIONS.some((branch) => branch.code === value);
}
