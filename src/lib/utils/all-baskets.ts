import type { BasketAllResponse } from "@/lib/interface";
import { formatDateEl } from "@/lib/utils/date";
import { formatEuro } from "@/lib/utils/number";

export const DEFAULT_SEARCH = "*";
export const DEFAULT_PAGE_SIZE = 25;

export type BasketBranchCode = "1000" | "1006" | "1007";

export const BASKET_BRANCH_OPTIONS: Array<{ code: BasketBranchCode; label: string }> = [
    { code: "1000", label: "Κασομούλη" },
    { code: "1006", label: "Λ. Αθηνών" },
    { code: "1007", label: "Λ. Μεσογείων" },
];

export type BasketListRow = {
    TRDR: string;
    MAXDATE: string;
    MINDATE: string;
    CUSTOMER_NAME: string;
    TOT_QTY: string;
    TOTAL_VALUE: string;
    BASKETROWS: string;
};

export function formatPrice(value: unknown) {
    return formatEuro(value);
}

export const formatDate = formatDateEl;

export function getBasketRows(data: BasketAllResponse): BasketListRow[] {
    return Array.isArray(data.rows) ? (data.rows as BasketListRow[]) : [];
}

export function isBasketBranchCode(value: string): value is BasketBranchCode {
    return BASKET_BRANCH_OPTIONS.some((branch) => branch.code === value);
}
