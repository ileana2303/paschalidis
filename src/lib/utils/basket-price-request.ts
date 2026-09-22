import type {
    BasketInRoutePayload,
    BasketMassDeleteRoutePayload,
    IBasketItem,
    ICustomerInfo,
    IItem,
    RequestedPriceUpdateRoutePayload,
} from "@/lib/interface";
import { getBasketItemApprovalStatus, getBasketItemQty } from "@/lib/utils/basket-helpers";
import {
    getCustomerBasketUnitPrice,
    shouldAutoApprovePriceRequest,
} from "@/lib/utils/customer-price-tier";
import { normalizeBasketId } from "@/lib/utils/price-requests";

type RequestPriceFn = (params: {
    BASKETID: string | number;
    NEW_PRICE: number;
}) => Promise<unknown>;

type ApproveRequestedPriceFn = (
    params: RequestedPriceUpdateRoutePayload
) => Promise<unknown>;

type DeleteBasketItemsFn = (
    params: BasketMassDeleteRoutePayload
) => Promise<unknown>;

type AddItemToBasketFn = (params: BasketInRoutePayload) => Promise<unknown>;

export function shouldRecreateBasketLineForLowerPriceRequest(
    item: IItem | null,
    customer: ICustomerInfo,
    basketItem: IBasketItem,
    requestedPrice: number
): boolean {
    if (
        item != null &&
        shouldAutoApprovePriceRequest(item, customer, requestedPrice)
    ) {
        return false;
    }

    return getBasketItemApprovalStatus(basketItem) === "approved";
}

export async function recreateBasketLineForLowerPriceRequest({
    customer,
    basketItem,
    requestedPrice,
    branchCode,
    userId,
    catalogUnitPrice,
    mtrl,
    deleteBasketItems,
    addItemToBasket,
    reloadBasketItem,
}: {
    customer: ICustomerInfo;
    basketItem: IBasketItem;
    requestedPrice: number;
    branchCode: number;
    userId?: string;
    catalogUnitPrice: number;
    mtrl: number;
    deleteBasketItems: DeleteBasketItemsFn;
    addItemToBasket: AddItemToBasketFn;
    reloadBasketItem: () => Promise<IBasketItem>;
}): Promise<IBasketItem> {
    const basketId = String(basketItem.BASKETID ?? "").trim();

    if (!basketId) {
        throw new Error("Δεν βρέθηκε αναγνωριστικό γραμμής καλαθιού.");
    }

    await deleteBasketItems({
        basketIds: [basketId],
        tableAction: "USRCUST",
        method: "DELETE",
        s1Key: "1305",
    });

    const qty = Math.max(1, getBasketItemQty(basketItem));

    await addItemToBasket({
        TRDR: customer.TRDR,
        MTRL: mtrl,
        QTY: qty,
        PRICE_ERP: catalogUnitPrice,
        PRICE_REQ: requestedPrice,
        BRANCH: branchCode,
        APPUSER_ID: userId,
    });

    return reloadBasketItem();
}

export async function submitBasketPriceRequest({
    item,
    customer,
    basketItem,
    requestedPrice,
    requestPrice,
    approveRequestedPrice,
    branchCode,
    userId,
    deleteBasketItems,
    addItemToBasket,
    reloadBasketItem,
}: {
    item: IItem;
    customer: ICustomerInfo;
    basketItem: IBasketItem;
    requestedPrice: number;
    requestPrice: RequestPriceFn;
    approveRequestedPrice: ApproveRequestedPriceFn;
    branchCode: number;
    userId?: string;
    deleteBasketItems: DeleteBasketItemsFn;
    addItemToBasket: AddItemToBasketFn;
    reloadBasketItem: () => Promise<IBasketItem>;
}): Promise<void> {
    let activeBasketItem = basketItem;
    const autoApprove = shouldAutoApprovePriceRequest(
        item,
        customer,
        requestedPrice
    );

    if (
        shouldRecreateBasketLineForLowerPriceRequest(
            item,
            customer,
            basketItem,
            requestedPrice
        )
    ) {
        activeBasketItem = await recreateBasketLineForLowerPriceRequest({
            customer,
            basketItem,
            requestedPrice,
            branchCode,
            userId,
            catalogUnitPrice: getCustomerBasketUnitPrice(item, customer),
            mtrl: Number(item.MTRL),
            deleteBasketItems,
            addItemToBasket,
            reloadBasketItem,
        });
    }

    const basketId = normalizeBasketId(activeBasketItem.BASKETID);

    if (autoApprove && basketId != null) {
        try {
            await approveRequestedPrice({
                action: "APPROVE_WITH_PRICE",
                basketId,
                paschaPrice: requestedPrice,
            });
        } catch {
            // Continue with the standard price-request flow if auto-approval is unavailable.
        }
    }

    await requestPrice({
        BASKETID: activeBasketItem.BASKETID,
        NEW_PRICE: requestedPrice,
    });
}
