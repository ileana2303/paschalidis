import { BasketResponse } from "../interface";

export async function fetchBasketItems(
    trdr: string
): Promise<BasketResponse> {
    const res = await fetch("/api/basket/items", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ trdr }),
    });

    const data: BasketResponse = await res.json();

    if (!res.ok) {
        throw new Error(data.message ?? "Failed to fetch basket items");
    }

    return data;
}

export async function createBasket(
    trdr: string
): Promise<BasketResponse> {
    const res = await fetch("/api/basket/create", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ trdr }),
    });

    const data: BasketResponse = await res.json();

    if (!res.ok) {
        throw new Error(data.message ?? "Failed to create basket");
    }

    return data;
}

interface AddItemParams {
    basketUid: string;
    productCode?: string | null;
    productName?: string | null;
    productS1MTRL: number;
    qty: number;
    productPrice?: number | null;
}

export async function addItemToBasket(
    params: AddItemParams
): Promise<{ success: boolean; message?: string }> {
    const res = await fetch("/api/basket/add-item", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message ?? "Failed to add item to basket");
    }

    return data;
}

export async function updateBasketItem(
    basketUid: string,
    itemUid: string,
    qty: number
): Promise<{ success: boolean; message?: string }> {
    const res = await fetch("/api/basket/update-item", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ basketUid, itemUid, qty }),
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message ?? "Failed to update item");
    }

    return data;
}

export async function removeBasketItem(
    basketUid: string,
    itemUid: string
): Promise<{ success: boolean; message?: string }> {
    const res = await fetch("/api/basket/remove-item", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ basketUid, itemUid }),
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message ?? "Failed to remove item");
    }

    return data;
}

export async function deleteBasket(
    basketUid: string
): Promise<{ success: boolean; message?: string }> {
    const res = await fetch("/api/basket/delete", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ basketUid }),
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message ?? "Failed to delete basket");
    }

    return data;
}
