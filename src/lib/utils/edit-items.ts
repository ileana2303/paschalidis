import type { ItemEditFields, ItemEditValue } from "@/lib/interface";
import { parseSoftOneNumber } from "@/lib/utils/number";

export const EDIT_ITEM_CATALOG_PRICE_PAIRS = [
    ["PRICEW01", "PRICEW08"],
    ["PRICEW02", "PRICEW09"],
    ["PRICEW03", "PRICEW10"],
    ["PRICEW04", "PRICEW11"],
    ["PRICEW05", "PRICEW12"],
] as const;

export const SALE_TO_COMPUTED_PRICE: Record<string, string> = Object.fromEntries(
    EDIT_ITEM_CATALOG_PRICE_PAIRS
);

export const DISABLED_ITEM_FIELDS = new Set([
    "STANDCOST",
    "PRICEW08",
    "PRICEW09",
    "PRICEW10",
    "PRICEW11",
    "PRICEW12",
]);

export function toItemEditInputValue(value: ItemEditValue): string {
    return value == null ? "" : String(value);
}

export function getSalePriceMarkupPercent(
    values: ItemEditFields,
    saleFieldName: string
): number | null {
    const computedFieldName = SALE_TO_COMPUTED_PRICE[saleFieldName];
    if (!computedFieldName) {
        return null;
    }

    const salePrice = parseSoftOneNumber(values[saleFieldName]);
    const computedPrice = parseSoftOneNumber(values[computedFieldName]);

    if (salePrice == null || computedPrice == null || computedPrice === 0) {
        return null;
    }

    return ((salePrice - computedPrice) / computedPrice) * 100;
}

export function formatMarkupPercent(percent: number): string {
    const absolute = Math.abs(percent)
        .toFixed(2)
        .replace(/\.?0+$/, "");
    const sign = percent > 0 ? "+" : percent < 0 ? "-" : "";
    return `${sign}${absolute}%`;
}

export function normalizeBool03(value: ItemEditValue): string {
    const raw = String(value ?? "")
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    if (raw === "1" || raw === "TRUE" || raw === "NAI" || raw === "YES") {
        return "1";
    }

    if (raw === "0" || raw === "FALSE" || raw === "OXI" || raw === "NO") {
        return "0";
    }

    return "";
}

export function formatSoftOneDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day} 00:00:00`;
}

export function parseSoftOneDate(value: ItemEditValue): Date | undefined {
    const raw = String(value ?? "").trim();
    if (!raw) {
        return undefined;
    }

    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) {
        return undefined;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(year, month - 1, day);

    if (
        Number.isNaN(parsed.getTime()) ||
        parsed.getFullYear() !== year ||
        parsed.getMonth() !== month - 1 ||
        parsed.getDate() !== day
    ) {
        return undefined;
    }

    return parsed;
}

const EMPTY_ITEEXTRA_FIELDS: ItemEditFields = {
    VARCHAR01: "",
    VARCHAR02: "",
    VARCHAR03: "",
    BOOL03: "",
    DATE03: "",
};

export function getEmptyItemExtraFields(): ItemEditFields {
    return { ...EMPTY_ITEEXTRA_FIELDS };
}

export function normalizeItemExtra(value: ItemEditFields | undefined): ItemEditFields {
    const next = {
        ...EMPTY_ITEEXTRA_FIELDS,
        ...(value ?? {}),
    };

    return {
        ...next,
        BOOL03: normalizeBool03(next.BOOL03),
        DATE03: (() => {
            const parsed = parseSoftOneDate(next.DATE03);
            return parsed ? formatSoftOneDate(parsed) : "";
        })(),
    };
}
