import type { PriceTierCell } from "@/lib/price-tiers/types";

/** The only tier values the backend accepts, in the order they are offered. */
export const PRICE_TIER_OPTIONS = [
    { value: "0", label: "Χονδρική" },
    { value: "1", label: "Τιμή 1" },
    { value: "2", label: "Τιμή 2" },
    { value: "3", label: "Τιμή 3" },
    { value: "4", label: "Τιμή 4" },
    { value: "5", label: "Τιμή 5" },
    { value: "99", label: "Λιανική" },
] as const;

export type PriceTierValue = (typeof PRICE_TIER_OPTIONS)[number]["value"];

export function isPriceTierValue(value: unknown): value is PriceTierValue {
    return PRICE_TIER_OPTIONS.some((option) => option.value === value);
}

/** SoftOne sends tiers as strings ("3", sometimes "03"); compare them as numbers. */
export function normalizeTierValue(raw: unknown): string {
    const text = String(raw ?? "").trim();
    if (!text) return "";

    const parsed = Number(text);
    return Number.isInteger(parsed) ? String(parsed) : text;
}

export type PriceTierAxisEntry = {
    id: string;
    code: string;
    name: string;
};

export type PriceTierGrid = {
    rows: PriceTierAxisEntry[];
    columns: PriceTierAxisEntry[];
    cells: Record<string, PriceTierCell>;
};

export function priceTierCellKey(mtrGroup: string, trdpGroup: string) {
    return `${mtrGroup}:${trdpGroup}`;
}

/**
 * Pivots TIER_LIST_ALL rows into item groups (rows) × customer groups (columns).
 * Rows keep the server order (by MTR_CODE); columns are sorted by TRD_CODE.
 */
export function buildPriceTierGrid(cells: PriceTierCell[]): PriceTierGrid {
    const rows = new Map<string, PriceTierAxisEntry>();
    const columns = new Map<string, PriceTierAxisEntry>();
    const cellMap: Record<string, PriceTierCell> = {};

    for (const cell of cells) {
        if (!cell.mtrGroup || !cell.trdpGroup) continue;

        if (!rows.has(cell.mtrGroup)) {
            rows.set(cell.mtrGroup, {
                id: cell.mtrGroup,
                code: cell.mtrCode || cell.mtrGroup,
                name: cell.mtrName,
            });
        }

        if (!columns.has(cell.trdpGroup)) {
            columns.set(cell.trdpGroup, {
                id: cell.trdpGroup,
                code: cell.trdCode || cell.trdpGroup,
                name: cell.trdName,
            });
        }

        cellMap[priceTierCellKey(cell.mtrGroup, cell.trdpGroup)] = cell;
    }

    return {
        rows: Array.from(rows.values()),
        columns: Array.from(columns.values()).sort((a, b) =>
            a.code.localeCompare(b.code, "el")
        ),
        cells: cellMap,
    };
}
