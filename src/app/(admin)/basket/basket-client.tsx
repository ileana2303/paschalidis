"use client";

import PageBreadcrumb from "@/components/template components/common/PageBreadCrumb";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Loader2,
    Plus,
    RefreshCw,
    ShoppingCart,
} from "@/app/lib/lucide";
import { useCustomerStore } from "@/stores/customerStore";
import { IBasket } from "@/app/lib/interface";
import {
    getBasketItemEffectivePrice,
    getBasketItemId,
    getBasketItemLineTotal,
    getBasketItemQty,
    normalizeBasket,
} from "@/app/lib/basket";
import OrderSummary from "@/components/basket/order-summary";
import {
    useFetchBasketItemsMutation,
    useSubmitBasketOrderMutation,
} from "@/hooks/queries/useApiMutations";

type ReceiptType = "receipt" | "invoice";

export default function BasketClient() {
    const router = useRouter();
    const customer = useCustomerStore((state) => state.customer);
    const [basket, setBasket] = useState<IBasket | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [receiptType, setReceiptType] = useState<ReceiptType>("receipt");
    const [pickupPoint, setPickupPoint] = useState("");
    const [notes, setNotes] = useState("");
    const [sendingOrder, setSendingOrder] = useState(false);
    const basketLoadInFlightRef = useRef<Promise<void> | null>(null);
    const basketLoadInFlightTrdrRef = useRef<string | null>(null);
    const basketLoadInFlightIdRef = useRef<number | null>(null);
    const basketRequestIdRef = useRef(0);
    const { mutateAsync: fetchBasketItems } = useFetchBasketItemsMutation();
    const { mutateAsync: submitBasketOrder } = useSubmitBasketOrderMutation();

    const formatPrice = (price: number | null) => {
        if (price == null) return "--";
        return price.toFixed(2) + " €";
    };

    const loadBasket = useCallback(async () => {
        const normalizedTrdr = String(customer?.TRDR ?? "").trim();
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
    }, [customer?.TRDR, fetchBasketItems]);

    useEffect(() => {
        if (!customer) {
            basketRequestIdRef.current += 1;
            basketLoadInFlightRef.current = null;
            basketLoadInFlightTrdrRef.current = null;
            basketLoadInFlightIdRef.current = null;
            setBasket(null);
            setError("");
            setSuccessMessage("");
            setSelectedItems(new Set());
            setLoading(false);
            return;
        }

        loadBasket();
    }, [customer, loadBasket]);

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

    const handleSendOrder = async () => {
        if (!customer || !basket || basket.items.length === 0 || selectedItems.size === 0) return;

        setSendingOrder(true);
        setError("");
        setSuccessMessage("");

        try {
            const result = await submitBasketOrder(customer.TRDR);
            setSuccessMessage(result.message ?? "Η παραγγελία καταχωρήθηκε");
            await loadBasket();
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

    const selectedTotal = selectedItemsList.reduce(
        (sum, item) => sum + getBasketItemLineTotal(item),
        0
    );

    const customerName = customer?.NAME ?? "—";

    return (
        <div className="flex h-[calc(100dvh-8rem)] flex-col overflow-hidden md:h-[calc(100dvh-9rem)]">
            <div className="shrink-0">
                <PageBreadcrumb
                    pageTitle={`Καλάθι ${customerName}`}
                    backHref="/search-parts"
                    backLabel="Επιστροφή στην αναζήτηση ανταλλακτικών"
                />
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-5 xl:flex-row">
                <div className="relative flex min-h-0 flex-1 flex-col xl:basis-2/3">
                    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">

                        <div className="shrink-0 border-b border-gray-100 px-5 py-5 dark:border-gray-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-500">
                                        Προϊόντα στο καλάθι
                                    </p>
                                    <h3 className="mt-1 text-lg font-semibold text-gray-800 dark:text-white/90">
                                        Λίστα Ανταλλακτικών
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={loadBasket}
                                    disabled={loading}
                                    aria-label="Ανανέωση καλαθιού"
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                                >
                                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-5">
                            {loading && (
                                <div className="flex items-center justify-center py-16">
                                    <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
                                </div>
                            )}

                            {!loading && error && (
                                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
                                    <p className="text-sm text-red-600 dark:text-red-400">
                                        {error}
                                    </p>
                                </div>
                            )}

                            {!loading && !error && successMessage && (
                                <div className="rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-500/30 dark:bg-green-500/10">
                                    <p className="text-sm text-green-700 dark:text-green-400">
                                        {successMessage}
                                    </p>
                                </div>
                            )}

                            {!loading && !error && (!basket || basket.items.length === 0) && (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <ShoppingCart className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                                    <p className="mt-4 text-sm text-gray-400">
                                        Το καλάθι είναι κενό
                                    </p>
                                </div>
                            )}

                            {!loading && !error && basket && basket.items.length > 0 && (
                                <div className="space-y-3">
                                    {basket.items.map((item) => (
                                        <div
                                            key={item.BASKETID}
                                            className="rounded-xl border border-brand-300 bg-brand-50/50 p-4 transition-all dark:border-brand-500/30 dark:bg-brand-500/5"
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium text-gray-700 dark:text-white/90">
                                                                {item.CODE ?? "—"}
                                                            </p>
                                                            <p className="mt-0.5 truncate text-xs text-gray-500">
                                                                {item.NAME ?? "—"}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                                                        <span>
                                                            Ποσότητα:{" "}
                                                            <span className="font-medium text-gray-700 dark:text-white/90">
                                                                {getBasketItemQty(item)}
                                                            </span>
                                                        </span>
                                                        <span>
                                                            Τιμή:{" "}
                                                            <span className="font-medium text-gray-700 dark:text-white/90">
                                                                {formatPrice(getBasketItemEffectivePrice(item))}
                                                            </span>
                                                        </span>
                                                        <span>
                                                            Σύνολο:{" "}
                                                            <span className="font-semibold text-gray-800 dark:text-white/90">
                                                                {formatPrice(getBasketItemLineTotal(item))}
                                                            </span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => router.push(customer ? `/search-parts?trdr=${customer.TRDR}` : "/search-parts")}
                        aria-label="Νέα αναζήτηση ανταλλακτικού"
                        className="absolute bottom-6 right-6 z-20 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-brand-500 bg-brand-500 text-white shadow-lg transition-all duration-200 hover:bg-brand-600 dark:border-brand-500 dark:bg-brand-500 dark:text-white dark:hover:bg-brand-600"
                    >
                        <Plus className="h-5 w-5" />
                    </button>
                </div>

                <OrderSummary
                    customer={customer}
                    basket={basket}
                    loading={loading}
                    error={error}
                    onRefresh={loadBasket}
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
                />
            </div>
        </div>
    );
}
