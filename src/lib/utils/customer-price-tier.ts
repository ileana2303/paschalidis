import type { ICustomerInfo, IItem } from "@/lib/interface";
import { parseSoftOneNumber } from "@/lib/utils/number";

const CATALOG_PRICE_KEYS = [
    "PRICEW01",
    "PRICEW02",
    "PRICEW03",
    "PRICEW04",
    "PRICEW05",
] as const;

export type CatalogPriceKey = (typeof CATALOG_PRICE_KEYS)[number];

export function getCustomerPriceTier(
    customer: ICustomerInfo | null | undefined
): string | null {
    const tier = String(customer?.PRICE_TIER ?? "").trim();

    return tier.length > 0 ? tier : null;
}

export function isNamedPriceTier(tier: string | null): tier is "1" | "2" | "3" | "4" | "5" {
    return tier === "1" || tier === "2" || tier === "3" || tier === "4" || tier === "5";
}

export function getCatalogPriceKeyForTier(
    tier: string | null
): CatalogPriceKey | null {
    if (!isNamedPriceTier(tier)) {
        return null;
    }

    const index = Number(tier) - 1;

    return CATALOG_PRICE_KEYS[index] ?? null;
}

export function getItemCatalogPrice(
    item: IItem,
    priceKey: CatalogPriceKey
): number | null {
    return parseSoftOneNumber(item[priceKey]);
}

export function getCustomerUnitListPrice(
    item: IItem,
    customer: ICustomerInfo | null | undefined
): string | number | null | undefined {
    const tier = getCustomerPriceTier(customer);
    const catalogKey = getCatalogPriceKeyForTier(tier);

    if (catalogKey) {
        const catalogPrice = getItemCatalogPrice(item, catalogKey);

        if (catalogPrice != null) {
            return catalogPrice;
        }
    }

    return item.PRICE_WHOLE;
}

export function getCustomerBasketUnitPrice(
    item: IItem,
    customer: ICustomerInfo | null | undefined
): number {
    const unitPrice = parseSoftOneNumber(getCustomerUnitListPrice(item, customer));

    if (unitPrice != null && unitPrice > 0) {
        return unitPrice;
    }

    const fallback = parseSoftOneNumber(item.PRICE_WHOLE);

    return fallback != null && fallback > 0 ? fallback : 0;
}

export function getCustomerUnitPriceLabel(
    customer: ICustomerInfo | null | undefined
): string {
    const tier = getCustomerPriceTier(customer);

    if (isNamedPriceTier(tier)) {
        return `Τιμοκ. ${tier.padStart(2, "0")}`;
    }

    return "Τιμή μονάδας";
}

/** Label used in the expanded price ladder for the tier shown in the part card header. */
export function getCustomerActivePriceLadderLabel(
    customer: ICustomerInfo | null | undefined
): string | null {
    if (!customer) {
        return null;
    }

    const tier = getCustomerPriceTier(customer);

    if (isNamedPriceTier(tier)) {
        return `Τιμοκ. ${tier.padStart(2, "0")}`;
    }

    return "Χονδρική";
}

export function getPriceRequestAutoApproveThreshold(
    item: IItem,
    customer: ICustomerInfo | null | undefined
): number | null {
    const tier = getCustomerPriceTier(customer);

    if (!tier) {
        return null;
    }

    if (tier === "-100") {
        return getItemCatalogPrice(item, "PRICEW04");
    }

    const catalogKey = getCatalogPriceKeyForTier(tier);

    if (!catalogKey) {
        return null;
    }

    return getItemCatalogPrice(item, catalogKey);
}

export function shouldAutoApprovePriceRequest(
    item: IItem,
    customer: ICustomerInfo | null | undefined,
    requestedPrice: number
): boolean {
    const threshold = getPriceRequestAutoApproveThreshold(item, customer);

    if (threshold == null || requestedPrice <= 0) {
        return false;
    }

    return requestedPrice >= threshold;
}
