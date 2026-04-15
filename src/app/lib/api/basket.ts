import { BasketResponse } from "../interface";

export async function fetchBasketItems(trdr: string): Promise<BasketResponse> {
    const res = await fetch("/api/basket/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trdr }),
    });

    const data: BasketResponse = await res.json();

    if (!res.ok) {
        throw new Error(data.message ?? "Failed to fetch basket items");
    }

    return data;
}

export async function createBasket(trdr: string): Promise<{
    success: boolean;
    message?: string;
    basket?: {
        Uid: string;
        CustomerS1TRDR: number;
        CountProducts: number;
        TotalCost: number;
        Items: [];
    };
}> {
    const res = await fetch("/api/basket/create", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ trdr }),
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message ?? "Failed to create basket");
    }

    return data;
}


// Add item to basket using BASKET_IN
export async function addItemToBasket(params: {
    TRDR: string;
    MTRL: number;
    QTY: number;
    PRICE_ERP: number;
    PRICE_REQ: number;
    CODE?: string | null;
    NAME?: string | null;
    BRANCH?: number;
    TRD_BRANCH?: number;
    COMPANY?: number;
}): Promise<{ success: boolean; message?: string }> {
    const res = await fetch("/api/basket/add-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message ?? "Failed to add item to basket");
    }

    return data;
}

export async function updateBasketItem(
    trdr: string,
    itemUid: string,
    qty: number
): Promise<{ success: boolean; message?: string }> {
    const res = await fetch("/api/basket/update-item", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ trdr, itemUid, qty }),
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message ?? "Failed to update item");
    }

    return data;
}

export async function removeBasketItem(
    trdr: string,
    itemUid: string
): Promise<{ success: boolean; message?: string }> {
    const res = await fetch("/api/basket/remove-item", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ trdr, itemUid }),
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

export async function requestDiscount(
    trdr: string,
    itemUid: string,
    bargainPrice: number
): Promise<{ success: boolean; message?: string }> {
    const res = await fetch("/api/basket/request-discount", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ trdr, itemUid, bargainPrice }),
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message ?? "Failed to request discount");
    }

    return data;
}
