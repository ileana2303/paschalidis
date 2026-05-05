"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isAxiosError } from "axios";
import {
    getBasketItemId,
    getBasketItemLineTotal,
    getBasketItemQty,
    normalizeBasket,
} from "@/lib/utils/basket-helpers";
import type { IBasket, IBasketItem, ICustomerInfo, IItem } from "@/lib/interface";
import {
    useAddItemToBasketMutation,
    useDeleteBasketItemsMutation,
    useFetchBasketItemsMutation,
    useRequestPriceMutation,
    useSubmitBasketOrderMutation,
    useUpdateBasketItemQtyMutation,
} from "@/hooks/queries/useApiMutations";

export type ReceiptType = "receipt" | "invoice";

interface UseSearchPartsBasketControllerParams {
    customer: ICustomerInfo | null;
    currentBranchCode: string;
    userId?: string;
}

function parseNumericValue(value: unknown): number | null {
    const raw = String(value ?? "").trim();
    if (!raw) {
        return null;
    }

    const parsed = Number(raw.replace(",", "."));
    if (!Number.isFinite(parsed)) {
        return null;
    }

    return parsed;
}

export function useSearchPartsBasketController({
    customer,
    currentBranchCode,
    userId,
}: UseSearchPartsBasketControllerParams) {
    const [basket, setBasket] = useState<IBasket | null>(null);
    const [basketLoading, setBasketLoading] = useState(false);
    const [basketError, setBasketError] = useState("");
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [receiptType, setReceiptType] = useState<ReceiptType>("receipt");
    const [pickupPoint, setPickupPoint] = useState("");
    const [notes, setNotes] = useState("");
    const [orderSubmittedSuccess, setOrderSubmittedSuccess] = useState(false);
    const [sendingOrder, setSendingOrder] = useState(false);
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [addingToBasket, setAddingToBasket] = useState<Set<string>>(new Set());
    const [requestedPrices, setRequestedPrices] = useState<Record<string, string>>({});
    const [submittingRequestedPrices, setSubmittingRequestedPrices] = useState<Set<string>>(new Set());
    const [removingBasketItems, setRemovingBasketItems] = useState<Set<string>>(new Set());
    const [removingSelectedBasketItems, setRemovingSelectedBasketItems] = useState(false);
    const basketLoadInFlightRef = useRef<Promise<void> | null>(null);
    const basketLoadInFlightTrdrRef = useRef<string | null>(null);
    const basketLoadInFlightIdRef = useRef<number | null>(null);
    const basketRequestIdRef = useRef(0);

    const { mutateAsync: fetchBasketItems } = useFetchBasketItemsMutation();
    const { mutateAsync: addItemToBasket } = useAddItemToBasketMutation();
    const { mutateAsync: updateBasketItemQty } = useUpdateBasketItemQtyMutation();
    const { mutateAsync: requestPrice } = useRequestPriceMutation();
    const { mutateAsync: deleteBasketItems } = useDeleteBasketItemsMutation();
    const { mutateAsync: submitBasketOrder } = useSubmitBasketOrderMutation();

    const getQuantity = useCallback((itemCode: string, fallback = 1) => {
        return quantities[itemCode] ?? fallback;
    }, [quantities]);

    const setQuantity = useCallback((itemCode: string, qty: number) => {
        const normalizedQty = qty < 1 ? 1 : qty;
        setQuantities((prev) => ({ ...prev, [itemCode]: normalizedQty }));
    }, []);

    const clearQuantityOverride = useCallback((itemCode: string) => {
        setQuantities((prev) => {
            if (!(itemCode in prev)) {
                return prev;
            }

            const next = { ...prev };
            delete next[itemCode];
            return next;
        });
    }, []);

    const findBasketItem = useCallback((item: IItem): IBasketItem | undefined => {
        return basket?.items.find((basketItem) =>
            basketItem.MTRL === item.MTRL || basketItem.CODE === item.ITEM_CODE
        );
    }, [basket?.items]);

    const loadBasket = useCallback(async (trdr: string) => {
        const normalizedTrdr = String(trdr).trim();

        if (!normalizedTrdr) {
            return;
        }

        if (
            basketLoadInFlightRef.current &&
            basketLoadInFlightTrdrRef.current === normalizedTrdr
        ) {
            return basketLoadInFlightRef.current;
        }

        const requestId = ++basketRequestIdRef.current;
        setBasketLoading(true);
        setBasketError("");

        const requestPromise = (async () => {
            try {
                const data = await fetchBasketItems(normalizedTrdr);

                if (basketRequestIdRef.current !== requestId) {
                    return;
                }

                const nextBasket = normalizeBasket(data);
                setBasket(nextBasket);
                setSelectedItems(new Set(nextBasket.items.map((item) => getBasketItemId(item))));
            } catch (error) {
                if (basketRequestIdRef.current !== requestId) {
                    return;
                }

                setBasketError(
                    error instanceof Error
                        ? error.message
                        : "Αποτυχία φόρτωσης καλαθιού"
                );
                setSelectedItems(new Set());
            } finally {
                if (basketRequestIdRef.current === requestId) {
                    setBasketLoading(false);
                }

                if (basketLoadInFlightIdRef.current === requestId) {
                    basketLoadInFlightRef.current = null;
                    basketLoadInFlightTrdrRef.current = null;
                    basketLoadInFlightIdRef.current = null;
                }
            }
        })();

        basketLoadInFlightRef.current = requestPromise;
        basketLoadInFlightTrdrRef.current = normalizedTrdr;
        basketLoadInFlightIdRef.current = requestId;

        return requestPromise;
    }, [fetchBasketItems]);

    useEffect(() => {
        if (customer?.TRDR) {
            void loadBasket(customer.TRDR);
            return;
        }

        basketRequestIdRef.current += 1;
        basketLoadInFlightRef.current = null;
        basketLoadInFlightTrdrRef.current = null;
        basketLoadInFlightIdRef.current = null;
        setBasket(null);
        setBasketError("");
        setOrderSubmittedSuccess(false);
        setNotes("");
        setSelectedItems(new Set());
        setBasketLoading(false);
    }, [customer?.TRDR, loadBasket]);

    const handleAddToBasket = useCallback(async (item: IItem) => {
        if (!customer) return;

        const normalizedBranch = Number(currentBranchCode);
        if (!Number.isFinite(normalizedBranch) || normalizedBranch <= 0) {
            setBasketError("Δεν βρέθηκε ενεργό κατάστημα χρήστη");
            return;
        }

        const basketItem = findBasketItem(item);
        const basketQtyFallback = basketItem ? Math.max(1, getBasketItemQty(basketItem)) : 1;
        const requestedQty = Math.max(1, getQuantity(item.ITEM_CODE, basketQtyFallback));
        setOrderSubmittedSuccess(false);

        setAddingToBasket((prev) => new Set(prev).add(item.ITEM_CODE));

        try {
            if (basketItem) {
                await updateBasketItemQty({
                    BASKETID: basketItem.BASKETID,
                    QTY: requestedQty,
                });
            } else {
                await addItemToBasket({
                    TRDR: customer.TRDR,
                    MTRL: Number(item.MTRL),
                    QTY: requestedQty,
                    PRICE_ERP: Number(item.PRICE_WHOLE),
                    PRICE_REQ: Number(item.PRICE_WHOLE),
                    BRANCH: normalizedBranch,
                    APPUSER_ID: userId,
                });
            }

            clearQuantityOverride(item.ITEM_CODE);
            await loadBasket(customer.TRDR);
        } catch (error) {
            if (isAxiosError(error)) {
                const responseMessage =
                    typeof error.response?.data?.message === "string"
                        ? error.response.data.message
                        : undefined;
                setBasketError(responseMessage ?? error.message);
            } else {
                setBasketError(
                    error instanceof Error ? error.message : "Αποτυχία προσθήκης στο καλάθι"
                );
            }
        } finally {
            setAddingToBasket((prev) => {
                const next = new Set(prev);
                next.delete(item.ITEM_CODE);
                return next;
            });
        }
    }, [
        addItemToBasket,
        clearQuantityOverride,
        currentBranchCode,
        customer,
        findBasketItem,
        getQuantity,
        loadBasket,
        updateBasketItemQty,
        userId,
    ]);

    const selectedItemsList = useMemo(() => {
        return basket?.items.filter((item) => selectedItems.has(getBasketItemId(item))) ?? [];
    }, [basket?.items, selectedItems]);

    const selectedTotal = useMemo(() => {
        return selectedItemsList.reduce(
            (sum, item) => sum + getBasketItemLineTotal(item),
            0
        );
    }, [selectedItemsList]);

    const handleSendOrder = useCallback(async () => {
        if (!customer || !basket || basket.items.length === 0 || selectedItems.size === 0) return;

        setSendingOrder(true);
        setBasketError("");
        setOrderSubmittedSuccess(false);

        let submittedSuccessfully = false;
        try {
            await submitBasketOrder({
                TRDR: customer.TRDR,
                NOTES: notes,
            });
            submittedSuccessfully = true;
            setOrderSubmittedSuccess(true);
            setNotes("");
            await loadBasket(customer.TRDR);
        } catch (error) {
            if (!submittedSuccessfully) {
                setOrderSubmittedSuccess(false);
            }
            setBasketError(
                error instanceof Error
                    ? error.message
                    : "Αποτυχία αποστολής παραγγελίας"
            );
        } finally {
            setSendingOrder(false);
        }
    }, [basket, customer, loadBasket, notes, selectedItems.size, submitBasketOrder]);

    const handleRefreshBasket = useCallback(() => {
        if (!customer) {
            return;
        }

        void loadBasket(customer.TRDR);
    }, [customer, loadBasket]);

    const handleToggleSelectedItem = useCallback((uid: string) => {
        setSelectedItems((prev) => {
            const next = new Set(prev);
            if (next.has(uid)) next.delete(uid);
            else next.add(uid);
            return next;
        });
    }, []);

    const handleRemoveItems = useCallback(async (
        itemsToRemove: IBasket["items"],
        fallbackErrorMessage: string
    ) => {
        const basketIds = itemsToRemove
            .map((item) => String(item.BASKETID ?? "").trim())
            .filter(Boolean);

        if (!customer || basketIds.length === 0) {
            setBasketError("Δεν βρέθηκαν BASKET IDs για διαγραφή");
            return;
        }

        setBasketError("");
        setOrderSubmittedSuccess(false);

        try {
            await deleteBasketItems({
                basketIds,
                tableAction: "USRCUST",
                method: "DELETE",
                s1Key: "1305",
            });
            await loadBasket(customer.TRDR);
        } catch (error) {
            setBasketError(
                error instanceof Error
                    ? error.message
                    : fallbackErrorMessage
            );
        }
    }, [customer, deleteBasketItems, loadBasket]);

    const handleRemoveSelectedItems = useCallback(async () => {
        if (selectedItemsList.length === 0) return;

        setRemovingSelectedBasketItems(true);
        try {
            await handleRemoveItems(
                selectedItemsList,
                "Αποτυχία διαγραφής επιλεγμένων γραμμών"
            );
        } finally {
            setRemovingSelectedBasketItems(false);
        }
    }, [handleRemoveItems, selectedItemsList]);

    const handleRemoveItem = useCallback(async (uid: string) => {
        const item = basket?.items.find((basketItem) => getBasketItemId(basketItem) === uid);
        if (!item) {
            setBasketError("Δεν βρέθηκε η γραμμή για διαγραφή");
            return;
        }

        setRemovingBasketItems((prev) => new Set(prev).add(uid));
        try {
            await handleRemoveItems([item], "Αποτυχία διαγραφής γραμμής");
        } finally {
            setRemovingBasketItems((prev) => {
                const next = new Set(prev);
                next.delete(uid);
                return next;
            });
        }
    }, [basket?.items, handleRemoveItems]);

    const setRequestedPriceValue = useCallback((itemCode: string, value: string) => {
        setRequestedPrices((prev) => ({
            ...prev,
            [itemCode]: value,
        }));
    }, []);

    const handleRequestPrice = useCallback(async (item: IItem) => {
        if (!customer) return;

        const requestedPriceInput = requestedPrices[item.ITEM_CODE] ?? "";
        const requestedPrice = parseNumericValue(requestedPriceInput);
        const basketItem = findBasketItem(item);
        if (!basketItem) return;

        if (!requestedPriceInput || requestedPrice == null || requestedPrice <= 0) {
            return;
        }

        setOrderSubmittedSuccess(false);

        setSubmittingRequestedPrices((prev) => new Set(prev).add(item.ITEM_CODE));

        try {
            await requestPrice({
                BASKETID: basketItem.BASKETID,
                NEW_PRICE: requestedPrice,
            });

            setRequestedPrices((prev) => ({ ...prev, [item.ITEM_CODE]: "" }));
            await loadBasket(customer.TRDR);
        } catch (error) {
            if (isAxiosError(error)) {
                const responseMessage =
                    typeof error.response?.data?.message === "string"
                        ? error.response.data.message
                        : undefined;
                setBasketError(responseMessage ?? error.message);
            } else {
                setBasketError(
                    error instanceof Error
                        ? error.message
                        : "Αποτυχία αιτήματος τιμής"
                );
            }
        } finally {
            setSubmittingRequestedPrices((prev) => {
                const next = new Set(prev);
                next.delete(item.ITEM_CODE);
                return next;
            });
        }
    }, [
        customer,
        requestedPrices,
        findBasketItem,
        loadBasket,
        requestPrice,
    ]);

    const formatPrice = useCallback((price: number | string | null | undefined) => {
        if (price == null) return "—";
        const num = Number(price);
        if (isNaN(num)) return "—";
        return num.toFixed(2) + " €";
    }, []);

    return {
        basket,
        basketLoading,
        basketError,
        selectedItems,
        selectedItemsList,
        selectedTotal,
        receiptType,
        setReceiptType,
        pickupPoint,
        setPickupPoint,
        notes,
        setNotes,
        orderSubmittedSuccess,
        sendingOrder,
        addingToBasket,
        requestedPrices,
        submittingRequestedPrices,
        removingBasketItems,
        removingSelectedBasketItems,
        getQuantity,
        setQuantity,
        findBasketItem,
        setRequestedPriceValue,
        formatPrice,
        handleAddToBasket,
        handleRequestPrice,
        handleSendOrder,
        handleRefreshBasket,
        handleToggleSelectedItem,
        handleRemoveItem,
        handleRemoveSelectedItems,
        setSelectedItems,
    };
}
