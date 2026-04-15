import { IItem, ApiResponse } from "../interface";

export async function searchItems(
    search: string,
    trdr?: string
): Promise<ApiResponse<IItem>> {
    const res = await fetch("/api/items/search", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ search, ...(trdr ? { trdr: Number(trdr) } : {}) }),
    });

    if (!res.ok) {
        throw new Error("Failed to fetch items");
    }

    return res.json();
}

// ── Batch stock lookup ─────────────────────────────────────
export interface StockInfo {
    stock1001: number;
    stock1006: number;
    stock1007: number;
    totalAvail: number;
    ongoing: number;
    netAvail: number;
}

export async function fetchBatchStock(
    codes: string[]
): Promise<Record<string, StockInfo>> {
    if (codes.length === 0) return {};

    const res = await fetch("/api/items/stock-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes }),
    });

    if (!res.ok) return {};

    const data = await res.json();
    return data.stocks ?? {};
}