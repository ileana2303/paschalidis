import type { IStockRequestListRow, StockRequestStatus } from "@/lib/interface";
import { formatElNumber, parseSoftOneNumber } from "@/lib/utils/number";

export function formatDaysLabel(days: number) {
    if (days === 0) return "Σήμερα";
    if (days === 1) return "1 ημέρα πριν";
    return `${days} ημέρες πριν`;
}

export function toNumber(value: string | number | null | undefined) {
    return parseSoftOneNumber(value) ?? 0;
}

export function formatNumber(value: string | number | null | undefined) {
    return formatElNumber(value);
}

export function getRequestStatusLabel(
    status: StockRequestStatus,
    requestedQty?: number
) {
    if (status === "approved") return "Approved";
    if (status === "deleted") return "Deleted";
    if (Number.isInteger(requestedQty) && Number(requestedQty) > 0) {
        return `Pending: ${requestedQty}`;
    }
    return "Pending";
}

export function isCurrentBranchStockColumn(
    currentBranchCode: string,
    branchCode: "1001" | "1006" | "1007"
) {
    return currentBranchCode === branchCode;
}

export function isPendingStockRequestStatus(status: string | null | undefined) {
    const normalized = String(status ?? "").trim().toUpperCase();
    return normalized.includes("ΕΚΚΡΕΜ") || normalized.includes("PENDING");
}

export function toPositiveInteger(value: unknown) {
    const parsed = parseSoftOneNumber(value);
    if (parsed == null || !Number.isInteger(parsed) || parsed <= 0) {
        return 0;
    }

    return parsed;
}

export function buildPendingStockState(rows: IStockRequestListRow[] | undefined) {
    const nextPendingStatuses: Record<string, StockRequestStatus> = {};
    const nextPendingQty: Record<string, number> = {};

    for (const requestRow of rows ?? []) {
        const mtrl = String(requestRow.MTRL ?? "").trim();

        if (!mtrl || !isPendingStockRequestStatus(requestRow.STATUS)) {
            continue;
        }

        const requestedQty = toPositiveInteger(requestRow.QTY_REQUESTED);

        if (requestedQty <= 0) {
            continue;
        }

        nextPendingStatuses[mtrl] = "pending";
        nextPendingQty[mtrl] = (nextPendingQty[mtrl] ?? 0) + requestedQty;
    }

    return {
        statuses: nextPendingStatuses,
        requestedQty: nextPendingQty,
    };
}
