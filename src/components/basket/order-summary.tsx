"use client";

import { usePathname } from "next/navigation";
import {
    Loader2,
    MapPin,
    Receipt,
    RefreshCw,
    Send,
    StickyNote,
} from "@/lib/icons/lucide";
import { OrderSummary as OrderSummaryPanel } from "@/components/order-summary/order-summary";
import {
    getBasketItemId,
    getBasketItemLineTotal,
} from "@/lib/utils/basket-helpers";
import type { IBasket, IBasketItem, ICustomerInfo } from "@/lib/interface";
import BasketLines from "./basket-lines";

type ReceiptType = "receipt" | "invoice";

interface OrderSummaryProps {
    customer: ICustomerInfo | null;
    basket: IBasket | null;
    loading: boolean;
    error: string;
    onRefresh: () => void;
    selectedItems?: Set<string>;
    selectedCount?: number;
    selectedTotal?: number;
    receiptType?: ReceiptType;
    onReceiptTypeChange?: (type: ReceiptType) => void;
    pickupPoint?: string;
    onPickupPointChange?: (value: string) => void;
    notes?: string;
    onNotesChange?: (value: string) => void;
    onSendOrder?: () => void;
    sendingOrder?: boolean;
    onToggleItem?: (uid: string) => void;
    onRemoveItem?: (uid: string) => void;
    onRemoveSelectedItems?: () => void;
    removingItems?: Set<string>;
    removingSelectedItems?: boolean;
    collapsible?: boolean;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

const formatPrice = (price: number | null) => {
    if (price == null) return "--";
    return price.toFixed(2) + " €";
};

const getBasketItemsTotal = (items: IBasketItem[]) =>
    items.reduce((sum, item) => sum + getBasketItemLineTotal(item), 0);

export default function OrderSummary({
    customer,
    basket,
    loading,
    error,
    onRefresh,
    selectedItems,
    selectedCount,
    selectedTotal,
    receiptType = "receipt",
    onReceiptTypeChange,
    pickupPoint = "",
    onPickupPointChange,
    notes = "",
    onNotesChange,
    onSendOrder,
    sendingOrder = false,
    onToggleItem,
    onRemoveItem,
    onRemoveSelectedItems,
    removingItems,
    removingSelectedItems = false,
    collapsible = false,
    collapsed = false,
    onToggleCollapse,
}: OrderSummaryProps) {
    const pathname = usePathname();
    const isOnBasketPage = pathname === "/basket";
    const basketHref = customer?.TRDR
        ? `/basket?trdr=${customer.TRDR}`
        : "/basket";
    const basketItems = basket?.items ?? [];
    const selectedBasketItems =
        selectedItems != null
            ? basketItems.filter((item) => selectedItems.has(getBasketItemId(item)))
            : basketItems;
    const summaryTotal =
        selectedItems == null && selectedTotal != null
            ? selectedTotal
            : getBasketItemsTotal(selectedBasketItems);

    const sendDisabled =
        sendingOrder ||
        (selectedItems ? selectedItems.size === 0 : (basket?.items.length ?? 0) === 0);

    return (
        <OrderSummaryPanel
            summaryLabel="Σύνοψη Παραγγελίας"
            summaryTitle="Καλάθι Πελάτη"
            summaryHref={isOnBasketPage ? undefined : basketHref}
            headerActions={
                customer ? (
                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={loading}
                        title="Ανανέωση"
                        aria-label="Ανανέωση καλαθιού"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                ) : undefined
            }
            infoCard={{
                label: "Επιλεγμένος Πελάτης",
                title: customer?.NAME ?? "Δεν έχει επιλεγεί πελάτης",
                description: customer
                    ? `ΑΦΜ: ${customer.AFM}`
                    : "Επιλέξτε πελάτη για να εμφανιστούν στοιχεία καλαθιού.",
            }}
            metrics={[
                {
                    id: "products",
                    label: "Προϊόντα",
                    value: selectedCount ?? basket?.totalcount ?? 0,
                    trailingValue:
                        selectedCount != null ? ` / ${basket?.items.length ?? 0}` : undefined,
                },
                {
                    id: "total",
                    label: "Σύνολο",
                    value: formatPrice(summaryTotal),
                },
            ]}
            loading={loading}
            error={error}
            collapsible={collapsible}
            collapsed={collapsed}
            onToggleCollapse={onToggleCollapse}
            collapseTitle="Απόκρυψη καλαθιού"
            footer={
                onSendOrder ? (
                    <button
                        type="button"
                        onClick={onSendOrder}
                        disabled={sendDisabled}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300"
                    >
                        {sendingOrder ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                        Αποστολή Παραγγελίας
                    </button>
                ) : undefined
            }
        >
            {!loading && customer && !error && (
                <BasketLines
                    items={basketItems}
                    selectedItems={selectedItems}
                    onToggleItem={onToggleItem}
                    onRemoveItem={onRemoveItem}
                    onRemoveSelectedItems={onRemoveSelectedItems}
                    removingItems={removingItems}
                    removingSelectedItems={removingSelectedItems}
                />
            )}

            {!customer && (
                <div className="mt-5 rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/40">
                    <p className="text-sm leading-6 text-gray-500">
                        Επιλέξτε πελάτη για να εμφανιστεί η προεπισκόπηση καλαθιού.
                    </p>
                </div>
            )}

            <div className="mt-5">
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Receipt className="h-4 w-4 text-gray-400" />
                    Τύπος Παραστατικού
                </label>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => onReceiptTypeChange?.("invoice")}
                        className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                            receiptType === "receipt"
                                ? "border-brand-500 bg-brand-50 text-brand-600 dark:border-brand-500 dark:bg-brand-500/10 dark:text-brand-400"
                                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                        }`}
                    >
                        Τιμολόγιο
                    </button>
                    <button
                        type="button"
                        onClick={() => onReceiptTypeChange?.("receipt")}
                        className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                            receiptType === "invoice"
                                ? "border-brand-500 bg-brand-50 text-brand-600 dark:border-brand-500 dark:bg-brand-500/10 dark:text-brand-400"
                                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                        }`}
                    >
                        Απόδειξη
                    </button>
                </div>
            </div>

            <div className="mt-5">
                <label
                    htmlFor="pickup-point"
                    className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                    <MapPin className="h-4 w-4 text-gray-400" />
                    Σημείο Παραλαβής
                </label>
                <select
                    id="pickup-point"
                    value={pickupPoint}
                    onChange={(e) => onPickupPointChange?.(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                    <option value="">Επιλέξτε σημείο...</option>
                    <option value="warehouse">Αποθήκη</option>
                    <option value="store">Κατάστημα</option>
                    <option value="delivery">Αποστολή</option>
                </select>
            </div>

            <div className="mt-5">
                <label
                    htmlFor="order-notes"
                    className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                    <StickyNote className="h-4 w-4 text-gray-400" />
                    Σημειώσεις
                </label>
                <textarea
                    id="order-notes"
                    value={notes}
                    onChange={(e) => onNotesChange?.(e.target.value)}
                    rows={3}
                    placeholder="Προσθέστε σημειώσεις για την παραγγελία..."
                    className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500"
                />
            </div>
        </OrderSummaryPanel>
    );
}
