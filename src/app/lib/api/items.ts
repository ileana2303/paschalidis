import {
    IItem,
    IItemTRDR,
    ApiResponse,
    StockInfo,
    StockRequestListResponse,
    StockRequestListRoutePayload,
    StockRequestMassDeleteResponse,
    StockRequestMassDeleteRoutePayload,
    StockRequestInsertResponse,
    StockRequestRoutePayload,
    StockRequestUpdateResponse,
    StockRequestUpdateRoutePayload,
} from "../interface";

export async function searchItems(
    search: string
): Promise<ApiResponse<IItem>> {
    const res = await fetch("/api/items/search", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ search }),
    });

    if (!res.ok) {
        throw new Error("Failed to fetch items");
    }

    return res.json();
}

export async function searchItemsByTrdr(
    search: string,
    trdr: string
): Promise<ApiResponse<IItemTRDR>> {
    const res = await fetch("/api/items/search", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ search, trdr: Number(trdr) }),
    });

    if (!res.ok) {
        throw new Error("Failed to fetch items");
    }

    return res.json();
}

// ── Batch stock lookup ─────────────────────────────────────
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

export async function requestStockQuantity(
    payload: StockRequestRoutePayload
): Promise<StockRequestInsertResponse> {
    const res = await fetch("/api/items/request-stock", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    const data = (await res.json()) as StockRequestInsertResponse;

    if (!res.ok || !data?.success) {
        throw new Error(data?.message ?? "Failed to submit stock request");
    }

    return data;
}

export async function fetchStockRequests(
    payload: StockRequestListRoutePayload
): Promise<StockRequestListResponse> {
    const res = await fetch("/api/items/stock-requests", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    const data = (await res.json()) as StockRequestListResponse;

    if (!res.ok || !data?.success) {
        throw new Error(data?.message ?? "Failed to fetch stock requests");
    }

    return data;
}

export async function updateStockRequest(
    payload: StockRequestUpdateRoutePayload
): Promise<StockRequestUpdateResponse> {
    const res = await fetch("/api/items/stock-requests", {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    const data = (await res.json()) as StockRequestUpdateResponse;

    if (!res.ok || !data?.success) {
        throw new Error(data?.message ?? "Failed to update stock request");
    }

    return data;
}

export async function massDeleteStockRequests(
    payload: StockRequestMassDeleteRoutePayload
): Promise<StockRequestMassDeleteResponse> {
    const res = await fetch("/api/items/stock-requests", {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    const data = (await res.json()) as StockRequestMassDeleteResponse;

    if (!res.ok || !data?.success) {
        throw new Error(data?.message ?? "Failed to delete stock requests");
    }

    return data;
}
