"use client";

import PageBreadcrumb from "@/components/template components/common/PageBreadCrumb";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Check,
    Circle,
    Loader2,
    Plus,
    RefreshCw,
    ShoppingCart,
    Trash2,
} from "@/app/lib/lucide";
import { useCustomerStore } from "@/stores/customerStore";
import { IBasket, IBasketItem } from "@/app/lib/interface";
import {
    getBasketItemEffectivePrice,
    getBasketItemId,
    getBasketItemLineTotal,
    getBasketItemQty,
    normalizeBasket,
} from "@/app/lib/basket";
import { fetchBasketItems, removeBasketItem } from "@/app/lib/api/basket";
import OrderSummary from "@/components/basket/order-summary";

type ReceiptType = "receipt" | "invoice";

export default function BasketClient() {
    const router = useRouter();
    const customer = useCustomerStore((state) => state.customer);
    const [basket, setBasket] = useState<IBasket | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());
    const [receiptType, setReceiptType] = useState<ReceiptType>("receipt");
    const [pickupPoint, setPickupPoint] = useState("");
    const [notes, setNotes] = useState("");
    const [sendingOrder, setSendingOrder] = useState(false);

    const formatPrice = (price: number | null) => {
        if (price == null) return "--";
        return price.toFixed(2) + " €";
    };

    const loadBasket = useCallback(async () => {
        if (!customer) return;

        setLoading(true);
        setError("");

        try {
            const data = await fetchBasketItems(customer.TRDR);
            if (data.success && data.rows) {
                const nextBasket = normalizeBasket(data);
                setBasket(nextBasket);
                setSelectedItems(new Set(nextBasket.items.map((item) => getBasketItemId(item))));
            } else {
                setBasket(null);
                setSelectedItems(new Set());
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Αποτυχία φόρτωσης καλαθιού"
            );
        } finally {
            setLoading(false);
        }
    }, [customer]);

    useEffect(() => {
        if (!customer) {
            setBasket(null);
            setSelectedItems(new Set());
            setError("");
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

    const handleRemoveItem = async (item: IBasketItem) => {
        if (!basket || !customer) return;

        setRemovingItems((prev) => new Set(prev).add(getBasketItemId(item)));

        try {
            await removeBasketItem(customer.TRDR, getBasketItemId(item));
            await loadBasket();
        } catch (err) {
            console.error("Failed to remove item:", err);
        } finally {
            setRemovingItems((prev) => {
                const next = new Set(prev);
                next.delete(getBasketItemId(item));
                return next;
            });
        }
    };

    const handleSendOrder = async () => {
        if (!basket || selectedItems.size === 0) return;

        setSendingOrder(true);

        await new Promise((resolve) => setTimeout(resolve, 1000));
        setSendingOrder(false);
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
                                    {basket.items.map((item) => {
                                        const itemId = getBasketItemId(item);
                                        const isSelected = selectedItems.has(itemId);
                                        const isRemoving = removingItems.has(itemId);

                                        return (
                                            <div
                                                key={itemId}
                                                className={`group rounded-xl border p-4 transition-all ${isSelected
                                                    ? "border-brand-300 bg-brand-50/50 dark:border-brand-500/30 dark:bg-brand-500/5"
                                                    : "border-gray-200 bg-gray-50/50 opacity-60 dark:border-gray-800 dark:bg-gray-900/40"
                                                    }`}
                                            >
                                                <div className="flex items-start gap-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleItem(itemId)}
                                                        aria-label={isSelected ? "Αποεπιλογή" : "Επιλογή"}
                                                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${isSelected
                                                            ? "border-brand-500 bg-brand-500 text-white"
                                                            : "border-gray-300 text-transparent hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500"
                                                            }`}
                                                    >
                                                        {isSelected ? (
                                                            <Check className="h-3.5 w-3.5" />
                                                        ) : (
                                                            <Circle className="h-3.5 w-3.5" />
                                                        )}
                                                    </button>

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

                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveItem(item)}
                                                                disabled={isRemoving}
                                                                aria-label="Διαγραφή"
                                                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                                                            >
                                                                {isRemoving ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Trash2 className="h-4 w-4" />
                                                                )}
                                                            </button>
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
                                        );
                                    })}
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
                    onRemoveItem={(uid) => {
                        const item = basket?.items.find((i) => i.BASKETID === uid);
                        if (item) handleRemoveItem(item);
                    }}
                    removingItems={removingItems}
                />
            </div>
        </div>
    );
}
