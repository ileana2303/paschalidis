"use client";

import PageBreadcrumb from "@/components/template components/common/PageBreadCrumb";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCustomerStore } from "@/stores/customerStore";
import { IBasket } from "@/lib/interface";
import { useAuthStore } from "@/stores/authStore";
import {
    getBasketItemId,
    getBasketItemLineTotal,
    getBasketItemQty,
    normalizeBasket,
} from "@/lib/utils/basket-helpers";
import OrderSummary from "@/components/basket/order-summary";
import {
    useDeleteBasketItemsMutation,
    useFetchBasketItemsMutation,
    useSubmitBasketOrderMutation,
    useUpdateBasketItemQtyMutation,
} from "@/hooks/queries/useApiMutations";
import BasketTable from "@/components/basket/basket-table";

type ReceiptType = "receipt" | "invoice";

export default function BasketClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlTrdr = String(searchParams.get("trdr") ?? "").trim();
    const customer = useCustomerStore((state) => state.customer);
    const clearCustomer = useCustomerStore((state) => state.clearCustomer);
    const user = useAuthStore((state) => state.user);
    const [basket, setBasket] = useState<IBasket | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [orderSubmittedSuccess, setOrderSubmittedSuccess] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [receiptType, setReceiptType] = useState<ReceiptType>("receipt");
    const [pickupPoint, setPickupPoint] = useState("");
    const [notes, setNotes] = useState("");
    const [sendingOrder, setSendingOrder] = useState(false);
    const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());
    const [removingSelectedItems, setRemovingSelectedItems] = useState(false);
    const [updatingQtyItems, setUpdatingQtyItems] = useState<Set<string>>(new Set());
    const [clearingBasket, setClearingBasket] = useState(false);
    const basketLoadInFlightRef = useRef<Promise<void> | null>(null);
    const basketLoadInFlightTrdrRef = useRef<string | null>(null);
    const basketLoadInFlightIdRef = useRef<number | null>(null);
    const basketRequestIdRef = useRef(0);
    const { mutateAsync: fetchBasketItems } = useFetchBasketItemsMutation();
    const { mutateAsync: submitBasketOrder } = useSubmitBasketOrderMutation();
    const { mutateAsync: deleteBasketItems } = useDeleteBasketItemsMutation();
    const { mutateAsync: updateBasketItemQty } = useUpdateBasketItemQtyMutation();

    const loadBasket = useCallback(async (trdr: string) => {
        const normalizedTrdr = String(trdr ?? "").trim();
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
        setLoading(true);
        setError("");

        const requestPromise = (async () => {
            try {
                const data = await fetchBasketItems(normalizedTrdr);

                if (basketRequestIdRef.current !== requestId) {
                    return;
                }

                const nextBasket = normalizeBasket(data);
                setBasket(nextBasket);
                setSelectedItems(new Set(nextBasket.items.map((item) => getBasketItemId(item))));
            } catch (err) {
                if (basketRequestIdRef.current !== requestId) {
                    return;
                }

                setError(
                    err instanceof Error
                        ? err.message
                        : "Αποτυχία φόρτωσης καλαθιού"
                );
                setBasket(null);
                setSelectedItems(new Set());
            } finally {
                if (basketRequestIdRef.current === requestId) {
                    setLoading(false);
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
        if (!urlTrdr) {
            basketRequestIdRef.current += 1;
            basketLoadInFlightRef.current = null;
            basketLoadInFlightTrdrRef.current = null;
            basketLoadInFlightIdRef.current = null;
            if (customer) {
                clearCustomer();
            }
            setBasket(null);
            setError("");
            setSuccessMessage("");
            setOrderSubmittedSuccess(false);
            setSelectedItems(new Set());
            setRemovingItems(new Set());
            setRemovingSelectedItems(false);
            setUpdatingQtyItems(new Set());
            setClearingBasket(false);
            setLoading(false);
            return;
        }

        const customerTrdr = String(customer?.TRDR ?? "").trim();
        if (customerTrdr && customerTrdr !== urlTrdr) {
            clearCustomer();
        }

        loadBasket(urlTrdr);
    }, [clearCustomer, customer, loadBasket, urlTrdr]);

    const refreshBasket = useCallback(() => {
        if (!urlTrdr) {
            return;
        }

        return loadBasket(urlTrdr);
    }, [loadBasket, urlTrdr]);

    const toggleItem = (uid: string) => {
        setSelectedItems((prev) => {
            const next = new Set(prev);

            if (next.has(uid)) {
                next.delete(uid);
            } else {
                next.add(uid);
            }

            return next;
        });
    };

    const setBasketItemQty = (uid: string, qty: number) => {
        const normalizedQty = Math.max(1, Math.floor(qty));
        const qtyString = String(normalizedQty);

        setBasket((prev) => {
            if (!prev) {
                return prev;
            }

            let changed = false;
            const nextItems = prev.items.map((item) => {
                if (getBasketItemId(item) !== uid) {
                    return item;
                }

                changed = true;
                return {
                    ...item,
                    QTY: qtyString,
                    TOTAL_QTY: qtyString,
                    BASKET_QTY: qtyString,
                };
            });

            if (!changed) {
                return prev;
            }

            return {
                ...prev,
                items: nextItems,
            };
        });
    };

    const handleUpdateQty = async (uid: string, qty: number) => {
        const normalizedQty = Math.max(1, Math.floor(qty));
        const item = basket?.items.find((basketItem) => getBasketItemId(basketItem) === uid);

        if (!item) {
            setError("Δεν βρέθηκε η γραμμή για ενημέρωση ποσότητας");
            return;
        }

        const previousQty = Math.max(1, getBasketItemQty(item));
        if (previousQty === normalizedQty) {
            return;
        }

        setError("");
        setSuccessMessage("");
        setOrderSubmittedSuccess(false);
        setBasketItemQty(uid, normalizedQty);
        setUpdatingQtyItems((prev) => new Set(prev).add(uid));

        try {
            const result = await updateBasketItemQty({
                BASKETID: item.BASKETID,
                QTY: normalizedQty,
            });
            setSuccessMessage(result.message ?? "Η ποσότητα ενημερώθηκε");
        } catch (err) {
            setBasketItemQty(uid, previousQty);
            setError(
                err instanceof Error
                    ? err.message
                    : "Αποτυχία ενημέρωσης ποσότητας"
            );
        } finally {
            setUpdatingQtyItems((prev) => {
                const next = new Set(prev);
                next.delete(uid);
                return next;
            });
        }
    };

    const handleSendOrder = async () => {
        if (!urlTrdr || !basket || basket.items.length === 0 || selectedItems.size === 0) return;

        setSendingOrder(true);
        setError("");
        setSuccessMessage("");
        setOrderSubmittedSuccess(false);

        try {
            await submitBasketOrder({
                TRDR: urlTrdr,
                NOTES: notes,
                APPUSER_ID: user?.uid,
                items: basketItems,
            });
            setOrderSubmittedSuccess(true);
            setNotes("");
            await loadBasket(urlTrdr);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Αποτυχία αποστολής παραγγελίας"
            );
        } finally {
            setSendingOrder(false);
        }
    };

    const selectedItemsList = basket?.items.filter((item) =>
        selectedItems.has(getBasketItemId(item))
    ) ?? [];
    const basketItems = basket?.items ?? [];

    const selectedTotal = selectedItemsList.reduce(
        (sum, item) => sum + getBasketItemLineTotal(item),
        0
    );

    const handleRemoveItems = async (
        itemsToRemove: IBasket["items"],
        fallbackErrorMessage: string
    ) => {
        const basketIds = itemsToRemove
            .map((item) => String(item.BASKETID ?? "").trim())
            .filter(Boolean);

        if (!urlTrdr || basketIds.length === 0) {
            setError("Δεν βρέθηκαν BASKET IDs για διαγραφή");
            return;
        }

        setError("");
        setSuccessMessage("");
        setOrderSubmittedSuccess(false);

        try {
            const result = await deleteBasketItems({
                basketIds,
                tableAction: "USRCUST",
                method: "DELETE",
                s1Key: "1305",
            });
            setSuccessMessage(result.message ?? "Οι επιλεγμένες γραμμές αφαιρέθηκαν");
            await loadBasket(urlTrdr);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : fallbackErrorMessage
            );
        }
    };

    const handleRemoveSelectedItems = async (itemIds: string[]) => {
        if (itemIds.length === 0) return;
        const idsSet = new Set(itemIds);
        const itemsToRemove = basketItems.filter((item) =>
            idsSet.has(getBasketItemId(item))
        );

        if (itemsToRemove.length === 0) {
            return;
        }

        setRemovingSelectedItems(true);
        try {
            await handleRemoveItems(
                itemsToRemove,
                "Αποτυχία διαγραφής επιλεγμένων γραμμών"
            );
        } finally {
            setRemovingSelectedItems(false);
        }
    };

    const handleRemoveItem = async (uid: string) => {
        const item = basket?.items.find((basketItem) => getBasketItemId(basketItem) === uid);
        if (!item) {
            setError("Δεν βρέθηκε η γραμμή για διαγραφή");
            return;
        }

        setRemovingItems((prev) => new Set(prev).add(uid));
        try {
            await handleRemoveItems([item], "Αποτυχία διαγραφής γραμμής");
        } finally {
            setRemovingItems((prev) => {
                const next = new Set(prev);
                next.delete(uid);
                return next;
            });
        }
    };

    const handleClearBasket = async () => {
        if (basketItems.length === 0) {
            return;
        }

        setClearingBasket(true);
        try {
            await handleRemoveItems(
                basketItems,
                "Αποτυχία εκκαθάρισης καλαθιού"
            );
        } finally {
            setClearingBasket(false);
        }
    };

    const handleToggleAllItems = () => {
        if (basketItems.length === 0) {
            return;
        }

        setSelectedItems((prev) => {
            const allIds = basketItems.map((item) => getBasketItemId(item));
            const allSelected = allIds.every((id) => prev.has(id));
            return allSelected ? new Set() : new Set(allIds);
        });
    };

    const handleAddMoreProducts = () => {
        router.push(urlTrdr ? `/search-parts?trdr=${urlTrdr}` : "/search-parts");
    };

    const customerMatchesUrl = Boolean(
        customer?.TRDR && String(customer.TRDR).trim() === urlTrdr
    );
    const selectedCustomer = customerMatchesUrl ? customer : null;
    const customerName = selectedCustomer?.NAME ?? (urlTrdr ? `TRDR ${urlTrdr}` : "—");

    return (
        <div className="flex h-[calc(100dvh-8rem)] flex-col overflow-hidden md:h-[calc(100dvh-9rem)]">
            <div className="shrink-0">
                <PageBreadcrumb
                    pageTitle={`Καλάθι ${customerName}`}
                    backHref={urlTrdr ? `/search-parts?trdr=${urlTrdr}` : "/search-parts"}
                    backLabel="Επιστροφή στην αναζήτηση ανταλλακτικών"
                />
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-5 xl:flex-row">
                <BasketTable
                    items={basketItems}
                    selectedItems={selectedItems}
                    onToggleItem={toggleItem}
                    onToggleAll={handleToggleAllItems}
                    onUpdateQty={handleUpdateQty}
                    onRemove={handleRemoveItem}
                    onRemoveSelected={handleRemoveSelectedItems}
                    onClearAll={handleClearBasket}
                    onAddMore={handleAddMoreProducts}
                    loading={loading}
                    updatingQtyItems={updatingQtyItems}
                    removingItems={removingItems}
                    removingSelectedItems={removingSelectedItems}
                    clearingAll={clearingBasket}
                    error={error}
                    successMessage={successMessage}
                />

                <OrderSummary
                    customer={selectedCustomer}
                    basket={basket}
                    loading={loading}
                    error={error}
                    successMessage={
                        orderSubmittedSuccess ? (
                            <div className="space-y-3">
                                <p className="font-semibold">
                                    Η παραγγελία καταχωρήθηκε επιτυχώς.
                                </p>
                                <p className="text-xs opacity-90">
                                    Μπορείτε να επιστρέψετε στην αρχική σελίδα ή να συνεχίσετε με νέα παραγγελία.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => router.push("/")}
                                    className="inline-flex items-center rounded-lg bg-green-600 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-green-700"
                                >
                                    Επιστροφή στην αρχική
                                </button>
                            </div>
                        ) : undefined
                    }
                    onRefresh={refreshBasket}
                    selectedItems={selectedItems}
                    selectedCount={selectedItemsList.length}
                    selectedTotal={selectedTotal}
                    receiptType={receiptType}
                    onReceiptTypeChange={setReceiptType}
                    pickupPoint={pickupPoint}
                    onPickupPointChange={setPickupPoint}
                    notes={notes}
                    onNotesChange={setNotes}
                    onSendOrder={handleSendOrder}
                    sendingOrder={sendingOrder}
                    onToggleItem={toggleItem}
                    onRemoveItem={handleRemoveItem}
                    removingItems={removingItems}
                    onRemoveSelectedItems={() =>
                        handleRemoveSelectedItems(
                            selectedItemsList.map((item) => getBasketItemId(item))
                        )
                    }
                    removingSelectedItems={removingSelectedItems}
                />
            </div>
        </div>
    );
}
