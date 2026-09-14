import type {
    BasketActionResponse,
    BasketAllResponse,
    BasketAllRoutePayload,
    BasketInRoutePayload,
    BasketMassDeleteRoutePayload,
    BasketRequestPriceRoutePayload,
    BasketResponse,
    BasketSubmitRoutePayload,
    BasketUpdateRoutePayload,
    RequestedPriceListResponse,
    RequestedPriceUpdateRoutePayload,
} from "@/lib/interface";
import { httpClient } from "@/lib/http/client";
import type { BasketOrderRequestBody } from "@/lib/orders/customer-basket/submit-basket-order";

// PAYMENT / TRUCKS / SHIPKIND / SOCASH / SERIES are decided server-side in
// lib/orders/customer-basket/basket-constants.ts - the UI only sends who and what.
let requestedPriceRequestsInFlight: Promise<RequestedPriceListResponse> | null = null;

function firstDefined<T>(...values: Array<T | null | undefined>): T | undefined {
    for (const value of values) {
        if (value !== null && value !== undefined) {
            return value;
        }
    }

    return undefined;
}

function asPositiveNumber(value: unknown): number | undefined {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return undefined;
    }

    return parsed;
}

function getBasketSubmitQty(item: BasketSubmitRoutePayload["items"][number]) {
    return asPositiveNumber(
        firstDefined(item.QTY, item.TOTAL_QTY, item.BASKET_QTY)
    );
}

export async function fetchBasketItems(trdr: string): Promise<BasketResponse> {
    const { data } = await httpClient.post<BasketResponse>("/api/basket/items", {
        trdr,
    });

    if (!data.success) {
        throw new Error(data.message ?? 'Αποτυχία φόρτωσης καλαθιού.');
    }

    return data;
}

export async function addItemToBasket(
    params: BasketInRoutePayload
): Promise<BasketActionResponse> {
    const { data } = await httpClient.post<BasketActionResponse>(
        "/api/basket/add-item",
        params
    );

    if (!data.success) {
        throw new Error(data.message ?? 'Αποτυχία προσθήκης στο καλάθι.');
    }

    return data;
}

export async function updateBasketItemQty(
    params: BasketUpdateRoutePayload
): Promise<BasketActionResponse> {
    const { data } = await httpClient.post<BasketActionResponse>(
        "/api/basket/update-item",
        params
    );

    if (!data.success) {
        throw new Error(data.message ?? 'Αποτυχία ενημέρωσης ποσότητας καλαθιού.');
    }

    return data;
}

export async function deleteBasketItems(
    params: BasketMassDeleteRoutePayload
): Promise<BasketActionResponse> {
    const { data } = await httpClient.delete<BasketActionResponse>(
        "/api/basket/delete-items",
        { data: params }
    );

    if (!data.success) {
        throw new Error(data.message ?? 'Αποτυχία διαγραφής γραμμών καλαθιού.');
    }

    return data;
}

export async function requestBasketItemPrice(
    params: BasketRequestPriceRoutePayload
): Promise<BasketActionResponse> {
    const { data } = await httpClient.post<BasketActionResponse>(
        "/api/basket/request-price",
        params
    );

    if (!data.success) {
        throw new Error(data.message ?? 'Αποτυχία αίτησης τιμής είδους.');
    }

    return data;
}

export async function fetchRequestedPriceRequests(): Promise<RequestedPriceListResponse> {
    if (requestedPriceRequestsInFlight) {
        return requestedPriceRequestsInFlight;
    }

    const requestPromise = (async () => {
        const { data } = await httpClient.post<RequestedPriceListResponse>(
            "/api/basket/requested-prices",
            {}
        );

        if (!data.success) {
            throw new Error(data.message ?? 'Αποτυχία φόρτωσης αιτημάτων τιμής.');
        }

        return data;
    })();

    requestedPriceRequestsInFlight = requestPromise;

    try {
        return await requestPromise;
    } finally {
        requestedPriceRequestsInFlight = null;
    }
}

export async function updateRequestedPriceRequest(
    params: RequestedPriceUpdateRoutePayload
): Promise<BasketActionResponse> {
    const { data } = await httpClient.patch<BasketActionResponse>(
        "/api/basket/requested-prices",
        params
    );

    if (!data.success) {
        throw new Error(data.message ?? 'Αποτυχία ενημέρωσης αίτησης τιμής.');
    }

    return data;
}

export async function deleteRequestedPriceRequests(
    params: BasketMassDeleteRoutePayload
): Promise<BasketActionResponse> {
    const { data } = await httpClient.delete<BasketActionResponse>(
        "/api/basket/requested-prices",
        { data: params }
    );

    if (!data.success) {
        throw new Error(data.message ?? 'Αποτυχία διαγραφής αίτησης τιμής.');
    }

    return data;
}

export async function fetchAllClientBaskets(
    params: BasketAllRoutePayload
): Promise<BasketAllResponse> {
    const { data } = await httpClient.post<BasketAllResponse>(
        "/api/basket/all",
        params
    );

    if (!data.success) {
        throw new Error(data.message ?? 'Αποτυχία φόρτωσης όλων των καλαθιών.');
    }

    return data;
}

export async function submitBasketOrder(
    params: BasketSubmitRoutePayload
): Promise<BasketActionResponse> {
    const firstItem = params.items[0];
    const body: BasketOrderRequestBody = {
        appUserId:
            String(params.APPUSER_ID ?? "").trim() ||
            String(firstItem?.APPUSER_ID ?? "").trim(),
        deliveryDate: params.DELIVDATE,
        notes: params.NOTES,
        trdr: asPositiveNumber(params.TRDR),
        trdBranch: asPositiveNumber(firstItem?.TRD_BRANCH),
        branch: asPositiveNumber(firstItem?.BRANCH),
        items: params.items.map((item) => ({
            basketId: item.BASKETID,
            mtrl: item.MTRL,
            qty: getBasketSubmitQty(item),
            branch: item.BRANCH,
            trdBranch: item.TRD_BRANCH,
        })),
    };

    const { data } = await httpClient.post<BasketActionResponse>(
        "/api/orders/basket",
        body
    );

    if (!data.success) {
        throw new Error(data.message ?? 'Αποτυχία υποβολής παραγγελίας.');
    }

    return data;
}
