import {
    IItem,
    IItemTRDR,
    ApiResponse,
    CompanyStockResponse,
    CompanyStockRoutePayload,
    ItemForensicsResponse,
    ItemForensicsRoutePayload,
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
    SupplierBasketSubmitRoutePayload,
    StockRequestUpdateResponse,
    StockRequestUpdateRoutePayload,
} from "@/lib/interface";
import { httpClient } from "@/lib/http/client";
import type { AnatrofOrderRequestBody } from "@/lib/orders/anatrof/submit-anatrof-order";
import type { SupplierBasketOrderRequestBody } from "@/lib/orders/supplier-basket/submit-supplier-basket-order";
import axios from "axios";
import type {
    CompetitionSalesResponse,
    LastOrdersResponse,
    PartInsightsResponse,
    PartInsightsRoutePayload,
} from "@/lib/part-insights";

// PAYMENT / TRUCKS / SHIPKIND / SOCASH are decided server-side. Branch-dependent
// values are sent explicitly so requester and supplier cannot be confused.
const stockFeedbackInFlightRequests = new Map<
    string,
    Promise<StockFeedbackResponse>
>();
const companyStockInFlightRequests = new Map<
    string,
    Promise<CompanyStockResponse>
>();
const itemForensicsInFlightRequests = new Map<
    string,
    Promise<ItemForensicsResponse>
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

function getCompanyStockRequestKey(payload: CompanyStockRoutePayload) {
    return String(payload.days ?? "").trim();
}

function getStockRequestListRequestKey(payload: StockRequestListRoutePayload) {
    return JSON.stringify({
        branch: String(payload.branch ?? "").trim(),
        origin: payload.origin,
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

async function fetchPartInsights<TResponse extends PartInsightsResponse<unknown>>(
    endpoint: string,
    payload: PartInsightsRoutePayload,
    fallbackMessage: string
): Promise<TResponse> {
    try {
        const { data } = await httpClient.post<TResponse>(endpoint, payload);

        if (!data?.success) {
            throw new Error(data?.message?.trim() || fallbackMessage);
        }

        return data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const message = (
                error.response?.data as PartInsightsResponse<unknown> | undefined
            )?.message;

            throw new Error(
                typeof message === "string" && message.trim()
                    ? message
                    : fallbackMessage
            );
        }

        throw error;
    }
}

export function fetchPartLastOrders(
    payload: PartInsightsRoutePayload
): Promise<LastOrdersResponse> {
    return fetchPartInsights<LastOrdersResponse>(
        "/api/items/last-orders",
        payload,
        "Αποτυχία φόρτωσης των προηγούμενων αγορών του πελάτη."
    );
}

export function fetchPartCompetitionSales(
    payload: PartInsightsRoutePayload
): Promise<CompetitionSalesResponse> {
    return fetchPartInsights<CompetitionSalesResponse>(
        "/api/items/competition",
        payload,
        "Αποτυχία φόρτωσης των στοιχείων ανταγωνισμού."
    );
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

export async function fetchCompanyStock(
    payload: CompanyStockRoutePayload
): Promise<CompanyStockResponse> {
    const requestKey = getCompanyStockRequestKey(payload);
    const inFlightRequest = companyStockInFlightRequests.get(requestKey);

    if (inFlightRequest) {
        return inFlightRequest;
    }

    const requestPromise = (async () => {
        try {
            const { data } = await httpClient.post<CompanyStockResponse>(
                "/api/items/company-stock",
                payload
            );

            if (!data?.success) {
                throw new Error(
                    data?.message ?? "Αποτυχία φόρτωσης κεντρικού αποθέματος."
                );
            }

            return data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const message = (
                    error.response?.data as Partial<CompanyStockResponse> | undefined
                )?.message;

                throw new Error(
                    message?.trim() || "Αποτυχία φόρτωσης κεντρικού αποθέματος."
                );
            }

            throw error;
        }
    })();

    companyStockInFlightRequests.set(requestKey, requestPromise);

    try {
        return await requestPromise;
    } finally {
        companyStockInFlightRequests.delete(requestKey);
    }
}

export async function fetchItemForensics(
    payload: ItemForensicsRoutePayload
): Promise<ItemForensicsResponse> {
    const requestKey = JSON.stringify({
        mtrl: String(payload.mtrl ?? "").trim(),
        days: String(payload.days ?? "").trim(),
    });
    const inFlightRequest = itemForensicsInFlightRequests.get(requestKey);

    if (inFlightRequest) {
        return inFlightRequest;
    }

    const requestPromise = (async () => {
        try {
            const { data } = await httpClient.post<ItemForensicsResponse>(
                "/api/items/forensics",
                payload
            );

            if (!data?.success) {
                throw new Error(
                    data?.message ?? "Αποτυχία φόρτωσης ιστορικού πωλήσεων."
                );
            }

            return data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const message = (
                    error.response?.data as Partial<ItemForensicsResponse> | undefined
                )?.message;

                throw new Error(
                    message?.trim() || "Αποτυχία φόρτωσης ιστορικού πωλήσεων."
                );
            }

            throw error;
        }
    })();

    itemForensicsInFlightRequests.set(requestKey, requestPromise);

    try {
        return await requestPromise;
    } finally {
        itemForensicsInFlightRequests.delete(requestKey);
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
        requestingBranch: payload.requestingBranch,
        supplyingBranch: payload.supplyingBranch,
        items: payload.items.map((item) => ({
            basketId: item.BASKETID,
            mtrl: item.MTRL,
            qty: item.QTY_REQUESTED || item.QTY,
            requestingBranch: item.BRANCH || payload.requestingBranch,
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

export async function submitSupplierBasketOrder(
    payload: SupplierBasketSubmitRoutePayload
): Promise<StockRequestSubmitResponse> {
    const body: SupplierBasketOrderRequestBody = {
        branch: payload.branch,
        supplierTrdr: payload.supplierTrdr,
        transactionDate: payload.transactionDate,
        sodType: payload.sodType,
        trucks: payload.trucks,
        items: payload.items.map((item) => ({
            basketId: item.BASKETID,
            mtrl: item.MTRL,
            qty: item.QTY_REQUESTED || item.QTY,
        })),
    };

    const { data } = await httpClient.post<StockRequestSubmitResponse>(
        "/api/orders/supplier-basket",
        body
    );

    if (!data?.success) {
        throw new Error(
            data?.message ?? "Αποτυχία υποβολής παραγγελίας προμηθευτή."
        );
    }

    return data;
}
