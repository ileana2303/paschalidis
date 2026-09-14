import {
    IItem,
    IItemTRDR,
    ApiResponse,
    ItemEditLoadResponse,
    ItemEditSaveResponse,
    ItemEditUpdatePayload,
    SetSimilarItemPayload,
    SetSimilarItemResponse,
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
import type { AnatrofOrderRequestBody } from "@/lib/orders/anatrof/submit-anatrof-order";

// PAYMENT / TRUCKS / SHIPKIND / SOCASH / SERIES are decided server-side in
// lib/orders/anatrof/anatrof-constants.ts - the UI only sends who and what.
const stockFeedbackInFlightRequests = new Map<
    string,
    Promise<StockFeedbackResponse>
>();
const stockRequestListInFlightRequests = new Map<
    string,
    Promise<StockRequestListResponse>
>();

function getStockFeedbackRequestKey(payload: StockFeedbackRoutePayload) {
    return JSON.stringify({
        branch: String(payload.branch ?? "").trim(),
        days: String(payload.days ?? "").trim(),
    });
}

function getStockRequestListRequestKey(payload: StockRequestListRoutePayload) {
    return JSON.stringify({
        branch: String(payload.branch ?? "").trim(),
    });
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

export async function fetchEditableItem(
    key: string
): Promise<ItemEditLoadResponse> {
    const { data } = await httpClient.post<ItemEditLoadResponse>(
        "/api/items/edit",
        { key }
    );

    if (!data.success || !data.item) {
        throw new Error(data.message || "Το προϊόν δεν βρέθηκε.");
    }

    return data;
}

export async function updateEditableItem(
    payload: ItemEditUpdatePayload
): Promise<ItemEditSaveResponse> {
    const { data } = await httpClient.patch<ItemEditSaveResponse>(
        "/api/items/edit",
        payload
    );

    if (!data.success) {
        throw new Error(data.message || "Η αποθήκευση δεν ολοκληρώθηκε.");
    }

    return data;
}

export async function setSimilarItem(
    payload: SetSimilarItemPayload
): Promise<SetSimilarItemResponse> {
    const { data } = await httpClient.post<SetSimilarItemResponse>(
        "/api/items/set-similar",
        payload
    );

    if (!data.success) {
        throw new Error(data.message || "Η ενημέρωση δεν ολοκληρώθηκε.");
    }

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
    const requestKey = getStockRequestListRequestKey(payload);
    const inFlightRequest = stockRequestListInFlightRequests.get(requestKey);

    if (inFlightRequest) {
        return inFlightRequest;
    }

    const requestPromise = (async () => {
        const { data } = await httpClient.post<StockRequestListResponse>(
            "/api/items/stock-requests",
            payload
        );

        if (!data?.success) {
            throw new Error(data?.message ?? 'Αποτυχία φόρτωσης αιτημάτων αποθέματος.');
        }

        return data;
    })();

    stockRequestListInFlightRequests.set(requestKey, requestPromise);

    try {
        return await requestPromise;
    } finally {
        stockRequestListInFlightRequests.delete(requestKey);
    }
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
    const body: AnatrofOrderRequestBody = {
        appUserId: String(payload.appUserId ?? "").trim(),
        deliveryDate: payload.deliveryDate,
        notes: payload.notes,
        branch: payload.branch,
        items: payload.items.map((item) => ({
            basketId: item.BASKETID,
            mtrl: item.MTRL,
            qty: item.QTY_REQUESTED || item.QTY,
            branch: item.BRANCH || payload.branch,
        })),
    };

    const { data } = await httpClient.post<StockRequestSubmitResponse>(
        "/api/orders/anatrof",
        body
    );

    if (!data?.success) {
        throw new Error(data?.message ?? 'Αποτυχία υποβολής παραγγελίας αποθέματος.');
    }

    return data;
}
