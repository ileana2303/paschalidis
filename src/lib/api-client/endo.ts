import { httpClient } from "@/lib/http/client";
import type {
    EndoBasketActionResponse,
    EndoBasketAddRoutePayload,
    EndoListRoutePayload,
    EndoListUpdateQtyRoutePayload,
    EndoListsResponse,
    EndoBasketSubmitRoutePayload,
} from "@/lib/interface";
import type { OrderSubmitRequestBody } from "@/lib/orders/order-submit-types";

export async function addItemToEndoBasket(
    payload: EndoBasketAddRoutePayload
): Promise<EndoBasketActionResponse> {
    const { data } = await httpClient.post<EndoBasketActionResponse>(
        "/api/endo/basket/add-item",
        payload
    );

    if (!data.success) {
        throw new Error(data.message ?? 'Αποτυχία προσθήκης στη λίστα ενδοκινήσεων.');
    }

    return data;
}

export async function submitEndoBasketOrder(
    payload: EndoBasketSubmitRoutePayload
): Promise<EndoBasketActionResponse> {
    const body: OrderSubmitRequestBody = {
        submitType: "endo",
        appUserId: String(payload.appUserId ?? "").trim(),
        deliveryDate: payload.deliveryDate,
        notes: payload.notes,
        items: payload.items.map((item) => ({
            basketId: item.basketIds?.[0],
            basketIds: item.basketIds,
            mtrl: item.mtrl,
            qty: item.qty,
            sourceBranch: item.toBranch,
            destinationBranch: item.branch,
            branch: item.branch,
            toBranch: item.toBranch,
        })),
    };

    const { data } = await httpClient.post<EndoBasketActionResponse>(
        "/api/orders/submit",
        body
    );

    if (!data.success) {
        throw new Error(data.message ?? 'Αποτυχία υποβολής ενδοκίνησης.');
    }

    return data;
}

export async function fetchEndoLists(
    payload: EndoListRoutePayload
): Promise<EndoListsResponse> {
    const { data } = await httpClient.post<EndoListsResponse>(
        "/api/endo/lists",
        payload
    );

    if (!data.success) {
        throw new Error(data.message ?? 'Αποτυχία φόρτωσης λιστών ενδοκινήσεων.');
    }

    return data;
}

export async function updateEndoListQty(
    payload: EndoListUpdateQtyRoutePayload
): Promise<EndoBasketActionResponse> {
    const { data } = await httpClient.patch<EndoBasketActionResponse>(
        "/api/endo/lists",
        payload
    );

    if (!data.success) {
        throw new Error(data.message ?? 'Αποτυχία ενημέρωσης ποσότητας ενδοκίνησης.');
    }

    return data;
}
