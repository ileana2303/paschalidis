import type {
    BasketActionResponse,
    BasketInRoutePayload,
    BasketRequestPriceRoutePayload,
    BasketResponse,
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

export async function requestDiscount(
    params: BasketRequestPriceRoutePayload
): Promise<BasketActionResponse> {
    return addItemToBasket(params);
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
