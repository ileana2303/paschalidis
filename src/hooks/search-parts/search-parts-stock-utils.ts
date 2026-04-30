import type { IItem } from "@/app/lib/interface";

export function parseStockValue(value: unknown) {
    const parsed = Number(String(value ?? "").trim().replace(",", "."));
    if (!Number.isFinite(parsed)) {
        return 0;
    }

    return parsed;
}

export function parseAvailableStock(value: unknown) {
    const parsed = Number(String(value ?? "").trim().replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 0;
    }

    return Math.floor(parsed);
}

export function getItemFieldValue(item: IItem, key: string) {
    const value = (item as unknown as Record<string, unknown>)[key];
    return value;
}
