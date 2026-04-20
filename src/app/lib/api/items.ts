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
import { httpClient } from "@/lib/http/client";

export async function searchItems(
    search: string
): Promise<ApiResponse<IItem>> {
    const { data } = await httpClient.post<ApiResponse<IItem>>(
        "/api/items/search",
        { search }
    );
    return data;
}

export async function searchItemsByTrdr(
    search: string,
    trdr: string
): Promise<ApiResponse<IItemTRDR>> {
    const { data } = await httpClient.post<ApiResponse<IItemTRDR>>(
        "/api/items/search",
        { search, trdr: Number(trdr) }
    );
    return data;
}

export async function fetchBatchStock(
    codes: string[]
): Promise<Record<string, StockInfo>> {
    if (codes.length === 0) return {};

    const { data } = await httpClient.post<{ stocks?: Record<string, StockInfo> }>(
        "/api/items/stock-batch",
        { codes }
    );
    return data.stocks ?? {};
}

export async function requestStockQuantity(
    payload: StockRequestRoutePayload
): Promise<StockRequestInsertResponse> {
    const { data } = await httpClient.post<StockRequestInsertResponse>(
        "/api/items/request-stock",
        payload
    );

    if (!data?.success) {
        throw new Error(data?.message ?? "Failed to submit stock request");
    }

    return data;
}

export async function fetchStockRequests(
    payload: StockRequestListRoutePayload
): Promise<StockRequestListResponse> {
    const { data } = await httpClient.post<StockRequestListResponse>(
        "/api/items/stock-requests",
        payload
    );

    if (!data?.success) {
        throw new Error(data?.message ?? "Failed to fetch stock requests");
    }

    return data;
}

export async function updateStockRequest(
    payload: StockRequestUpdateRoutePayload
): Promise<StockRequestUpdateResponse> {
    const { data } = await httpClient.patch<StockRequestUpdateResponse>(
        "/api/items/stock-requests",
        payload
    );

    if (!data?.success) {
        throw new Error(data?.message ?? "Failed to update stock request");
    }

    return data;
}

export async function massDeleteStockRequests(
    payload: StockRequestMassDeleteRoutePayload
): Promise<StockRequestMassDeleteResponse> {
    const { data } = await httpClient.delete<StockRequestMassDeleteResponse>(
        "/api/items/stock-requests",
        { data: payload }
    );

    if (!data?.success) {
        throw new Error(data?.message ?? "Failed to delete stock requests");
    }

    return data;
}
