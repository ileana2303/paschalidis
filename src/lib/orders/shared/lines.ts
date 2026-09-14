import { jsonSafeNumber } from "../validation";

/** One ITELINES row plus the basket row it came from. */
export type OrderLine = {
    /** BASKETID of the source basket row, cleared by MASS_DELETE afterwards. */
    basketId: string;
    mtrl: number;
    qty: number;
};

export type RawOrderItem = {
    basketId?: unknown;
    basketIds?: unknown;
    mtrl?: unknown;
    MTRL?: unknown;
    qty?: unknown;
    QTY1?: unknown;
    [key: string]: unknown;
};

export function readBasketId(rawItem: RawOrderItem) {
    const direct = String(rawItem.basketId ?? "").trim();

    if (direct) {
        return direct;
    }

    return Array.isArray(rawItem.basketIds)
        ? String(rawItem.basketIds[0] ?? "").trim()
        : "";
}

/**
 * Accepts both the camelCase shape the UI sends and the SoftOne column names,
 * and drops anything that cannot become a valid ITELINES row.
 */
export function normalizeOrderLine(rawItem: RawOrderItem): OrderLine | null {
    const mtrl = jsonSafeNumber(rawItem.mtrl ?? rawItem.MTRL);
    const qty = jsonSafeNumber(rawItem.qty ?? rawItem.QTY1);
    const basketId = readBasketId(rawItem);

    if (!mtrl || !qty || !basketId) {
        return null;
    }

    return { basketId, mtrl, qty };
}

export function normalizeOrderLines(rawItems: RawOrderItem[]): OrderLine[] {
    return rawItems
        .map((rawItem) => normalizeOrderLine(rawItem))
        .filter((line): line is OrderLine => line !== null);
}

export function requireAppUserId(value: unknown) {
    const appUserId = String(value ?? "").trim();

    if (!appUserId) {
        throw new Error('Λείπει το αναγνωριστικό χρήστη (appUserId).');
    }

    return appUserId;
}

export function requireRawItems(items: unknown): RawOrderItem[] {
    const rawItems = Array.isArray(items) ? (items as RawOrderItem[]) : [];

    if (!rawItems.length) {
        throw new Error('Το καλάθι είναι άδειο. Προσθέστε είδη πριν την υποβολή.');
    }

    return rawItems;
}

export function requireLines<TLine>(lines: TLine[]): TLine[] {
    if (!lines.length) {
        throw new Error('Δεν υπάρχουν έγκυρες γραμμές για υποβολή.');
    }

    return lines;
}
