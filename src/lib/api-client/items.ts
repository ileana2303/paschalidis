import {
    IItem,
    IItemTRDR,
    ApiResponse,
    StockFeedbackResponse,
    StockFeedbackRoutePayload,
    StockRequestListResponse,
    StockRequestListRoutePayload,
    StockRequestInsertResponse,
    StockRequestRoutePayload,
    StockRequestSubmitResponse,
    StockRequestSubmitRoutePayload,
    StockRequestUpdateResponse,
    StockRequestUpdateRoutePayload,
} from "@/lib/interface";
import { httpClient } from "@/lib/http/client";
import type { OrderSubmitRequestBody } from "@/lib/orders/order-submit-types";

const DEFAULT_ANATROF_PAYMENT = 1006;
const DEFAULT_ANATROF_TRUCKS = 2;
const DEFAULT_ANATROF_SHIPKIND = 1000;
const DEFAULT_ANATROF_SOCASH = 1005;
const stockFeedbackInFlightRequests = new Map<
    string,
    Promise<StockFeedbackResponse>
>();

function getStockFeedbackRequestKey(payload: StockFeedbackRoutePayload) {
    return JSON.stringify({
        branch: String(payload.branch ?? "").trim(),
        days: String(payload.days ?? "").trim(),
    });
}

function asPositiveNumber(value: unknown): number | undefined {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return undefined;
    }

    return parsed;
}

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

export async function fetchStockFeedback(
    payload: StockFeedbackRoutePayload
): Promise<StockFeedbackResponse> {
    const requestKey = getStockFeedbackRequestKey(payload);
    const inFlightRequest = stockFeedbackInFlightRequests.get(requestKey);

    if (inFlightRequest) {
        return inFlightRequest;
    }

    const requestPromise = (async () => {
        const { data } = await httpClient.post<StockFeedbackResponse>(
            "/api/items/stock-feedback",
            payload
        );

        if (!data?.success) {
            throw new Error(data?.message ?? 'Αποτυχία φόρτωσης αποθεμάτων.');
        }

        return data;
    })();

    stockFeedbackInFlightRequests.set(requestKey, requestPromise);

    try {
        return await requestPromise;
    } finally {
        stockFeedbackInFlightRequests.delete(requestKey);
    }
}

export async function requestStockQuantity(
    payload: StockRequestRoutePayload
): Promise<StockRequestInsertResponse> {
    const { data } = await httpClient.post<StockRequestInsertResponse>(
        "/api/items/request-stock",
        payload
    );

    if (!data?.success) {
        throw new Error(data?.message ?? 'Αποτυχία υποβολής αιτήματος αποθέματος.');
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
        throw new Error(data?.message ?? 'Αποτυχία φόρτωσης αιτημάτων αποθέματος.');
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
        throw new Error(data?.message ?? 'Αποτυχία ενημέρωσης αιτήματος αποθέματος.');
    }

    return data;
}

export async function submitAnatrofOrder(
    payload: StockRequestSubmitRoutePayload
): Promise<StockRequestSubmitResponse> {
    const branch = asPositiveNumber(payload.branch);
    const body: OrderSubmitRequestBody = {
        submitType: "anatrof",
        appUserId: String(payload.appUserId ?? "").trim(),
        deliveryDate: payload.deliveryDate,
        notes: payload.notes,
        trdr: payload.trdr,
        trdBranch: payload.trdBranch,
        payment: payload.payment ?? DEFAULT_ANATROF_PAYMENT,
        trucks: payload.trucks ?? DEFAULT_ANATROF_TRUCKS,
        shipKind: payload.shipKind ?? DEFAULT_ANATROF_SHIPKIND,
        socash: payload.socash ?? DEFAULT_ANATROF_SOCASH,
        branchSec: payload.branchSec ?? branch,
        whouseSec: payload.whouseSec ?? branch,
        items: payload.items.map((item) => ({
            basketId: item.BASKETID,
            mtrl: item.MTRL,
            qty: item.QTY_REQUESTED || item.QTY,
            branch: item.BRANCH || payload.branch,
        })),
    };

    const { data } = await httpClient.post<StockRequestSubmitResponse>(
        "/api/orders/submit",
        body
    );

    if (!data?.success) {
        throw new Error(data?.message ?? 'Αποτυχία υποβολής παραγγελίας αποθέματος.');
    }

    return data;
}
