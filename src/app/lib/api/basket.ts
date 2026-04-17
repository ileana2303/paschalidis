import type {
    BasketActionResponse,
    BasketInRoutePayload,
    BasketRequestPriceRoutePayload,
    BasketResponse,
} from "../interface";

export async function fetchBasketItems(trdr: string): Promise<BasketResponse> {
    const res = await fetch("/api/basket/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trdr }),
    });

    const data = await res.json() as BasketResponse;

    if (!res.ok || !data.success) {
        throw new Error(data.message ?? "Failed to fetch basket items");
    }

    return data;
}

export async function addItemToBasket(
    params: BasketInRoutePayload
): Promise<BasketActionResponse> {
    const res = await fetch("/api/basket/add-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
    });

    const data = await res.json() as BasketActionResponse;

    if (!res.ok || !data.success) {
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
    const res = await fetch("/api/basket/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trdr }),
    });

    const data = await res.json() as BasketActionResponse;

    if (!res.ok || !data.success) {
        throw new Error(data.message ?? "Failed to submit order");
    }

    return data;
}
