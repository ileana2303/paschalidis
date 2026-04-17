import { BasketResponse, IBasket, IBasketItem } from "./interface";

export function normalizeBasket(data: BasketResponse): IBasket {
    return {
        items: data.rows ?? [],
        totalcount: data.totalcount ?? data.rows?.length ?? 0,
    };
}

export function getBasketItemId(item: IBasketItem): string {
    const uid = String(item.BASKETID ?? "").trim();
    if (uid) {
        return uid;
    }

    const fallback = [String(item.MTRL ?? "").trim(), String(item.CODE ?? "").trim()]
        .filter(Boolean)
        .join("-");

    return fallback || "unknown-item";
}

export function getBasketItemCode(item: IBasketItem): string {
    return item.CODE ?? "";
}

export function getBasketItemName(item: IBasketItem): string {
    return item.NAME ?? "";
}

export function getBasketItemQty(item: IBasketItem): number {
    const qty = Number(item.QTY ?? 0);
    return Number.isFinite(qty) ? qty : 0;
}

export function getBasketItemBasePrice(item: IBasketItem): number {
    const price = Number(item.PRICE_ERP ?? 0);
    return Number.isFinite(price) ? price : 0;
}

export function getBasketItemRequestedPrice(item: IBasketItem): number {
    const price = Number(item.PRICE_REQ ?? 0);
    return Number.isFinite(price) ? price : 0;
}

export function getBasketItemEffectivePrice(item: IBasketItem): number {
    const requestedPrice = getBasketItemRequestedPrice(item);
    return requestedPrice > 0 ? requestedPrice : getBasketItemBasePrice(item);
}

export function getBasketItemLineTotal(item: IBasketItem): number {
    return getBasketItemEffectivePrice(item) * getBasketItemQty(item);
}

export function getBasketItemApprovalStatus(
    item: IBasketItem
): "approved" | "rejected" | "pending" | null {
    const rawStatus = String(item.IS_APROVED ?? "").trim().toLowerCase();

    if (!rawStatus) {
        return null;
    }

    if (rawStatus === "200" || rawStatus === "approved" || rawStatus === "1" || rawStatus === "true") {
        return "approved";
    }

    if (rawStatus === "500" || rawStatus === "rejected" || rawStatus === "-1" || rawStatus === "false") {
        return "rejected";
    }

    return "pending";
}

export function hasBasketItemDiscount(item: IBasketItem): boolean {
    return (
        getBasketItemApprovalStatus(item) !== null ||
        getBasketItemRequestedPrice(item) !== getBasketItemBasePrice(item)
    );
}
