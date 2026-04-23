import type {
    BasketActionResponse,
    BasketAllResponse,
    BasketAllRoutePayload,
    BasketInRoutePayload,
    BasketRequestPriceRoutePayload,
    BasketResponse,
    BasketUpdateRoutePayload,
} from "../interface";
import { httpClient } from "@/lib/http/client";

export async function fetchBasketItems(trdr: string): Promise<BasketResponse> {
    const { data } = await httpClient.post<BasketResponse>("/api/basket/items", {
        trdr,
    });

    if (!data.success) {
        throw new Error(data.message ?? "Failed to fetch basket items");
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
        throw new Error(data.message ?? "Failed to add item to basket");
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
        throw new Error(data.message ?? "Failed to update basket item quantity");
    }

    return data;
}

export async function requestDiscount(
    params: BasketRequestPriceRoutePayload
): Promise<BasketActionResponse> {
    return addItemToBasket(params);
}

export async function fetchAllClientBaskets(
    params: BasketAllRoutePayload
): Promise<BasketAllResponse> {
    const { data } = await httpClient.post<BasketAllResponse>(
        "/api/basket/all",
        params
    );

    if (!data.success) {
        throw new Error(data.message ?? "Failed to fetch all client baskets");
    }

    return data;
}

export async function submitBasketOrder(
    trdr: string
): Promise<BasketActionResponse> {
    const { data } = await httpClient.post<BasketActionResponse>(
        "/api/basket/submit",
        { trdr }
    );

    if (!data.success) {
        throw new Error(data.message ?? "Failed to submit order");
    }

    return data;
}
