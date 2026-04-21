"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Check,
    Circle,
    Loader2,
    MapPin,
    PanelRightClose,
    PanelRightOpen,
    Receipt,
    RefreshCw,
    Send,
    ShoppingCart,
    StickyNote,
    Trash2,
} from "@/app/lib/lucide";
import {
    getBasketItemApprovalStatus,
    getBasketItemBasePrice,
    getBasketItemId,
    getBasketItemLineTotal,
    getBasketItemQty,
    getBasketItemRequestedPrice,
    hasBasketItemDiscount,
} from "@/app/lib/basket";
import { IBasket, IBasketItem, ICustomerInfo } from "@/app/lib/interface";

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
    removingItems?: Set<string>;
    collapsible?: boolean;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

const formatPrice = (price: number | null) => {
    if (price == null) return "--";
    return price.toFixed(2) + " €";
};

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
    removingItems,
    collapsible = false,
    collapsed = false,
    onToggleCollapse,
}: OrderSummaryProps) {
    const pathname = usePathname();
    const isOnBasketPage = pathname === "/basket";
    const basketTotal = basket?.items.reduce((sum, item) => sum + getBasketItemLineTotal(item), 0) ?? 0;

    if (collapsible && collapsed) {
        return (
            <aside className="hidden xl:flex shrink-0">
                <button
                    type="button"
                    onClick={onToggleCollapse}
                    aria-label="Εμφάνιση σύνοψης"
                    className="flex h-8 w-8 items-center justify-center self-start mt-6 rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                >
                    <PanelRightOpen className="h-4 w-4" />
                </button>
            </aside>
        );
    }

    return (
        <aside className="min-h-[280px] w-full xl:min-h-0 xl:basis-1/3 xl:min-w-[320px]">
            <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">

                <div className="shrink-0 border-b border-gray-100 px-5 py-5 dark:border-gray-800">
                    <div className="flex items-start justify-between gap-3">
                        {isOnBasketPage ? (
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-500">
                                    Σύνοψη Παραγγελίας
                                </p>
                                <h3 className="mt-2 text-lg font-semibold text-gray-800 dark:text-white/90">
                                    Καλάθι Πελάτη
                                </h3>
                            </div>
                        ) : (
                            <Link href="/basket" className="group/link">
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-500">
                                    Σύνοψη Παραγγελίας
                                </p>
                                <h3 className="mt-2 text-lg font-semibold text-gray-800 transition group-hover/link:text-brand-500 dark:text-white/90 dark:group-hover/link:text-brand-400">
                                    Καλάθι Πελάτη
                                </h3>
                            </Link>
                        )}

                        <div className="flex items-center gap-1">
                            {customer && (
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
                            )}
                            {collapsible && onToggleCollapse && (
                                <button
                                    type="button"
                                    onClick={onToggleCollapse}
                                    title="Απόκρυψη καλαθιού"
                                    aria-label="Απόκρυψη σύνοψης"
                                    className="hidden xl:flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                                >
                                    <PanelRightClose className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-5">
                    <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4 dark:border-brand-500/20 dark:bg-brand-500/5">
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-500">
                            Επιλεγμένος Πελάτης
                        </p>
                        <p className="mt-2 font-semibold text-gray-800 dark:text-white/90">
                            {customer?.NAME ?? "Δεν έχει επιλεγεί πελάτης"}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                            {customer ? `ΑΦΜ: ${customer.AFM}` : "Επιλέξτε πελάτη για να εμφανιστούν στοιχεία καλαθιού."}
                        </p>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                                Προϊόντα
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                                {selectedCount != null ? (
                                    <>
                                        {selectedCount}
                                        <span className="text-sm font-normal text-gray-400">
                                            {" "}/ {basket?.items.length ?? 0}
                                        </span>
                                    </>
                                ) : (
                                    basket?.totalcount ?? 0
                                )}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                                Σύνολο
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                                {selectedTotal != null
                                    ? formatPrice(selectedTotal || null)
                                    : formatPrice(basketTotal || null)}
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
                            <p className="text-sm text-red-600 dark:text-red-400">
                                {error}
                            </p>
                        </div>
                    )}

                    {loading && (
                        <div className="mt-5 flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
                        </div>
                    )}

                    {!loading && customer && !error && (
                        <div className="mt-5">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                                    Γραμμές Καλαθιού
                                </p>
                                {basket?.items && basket.items.length > 0 && (
                                    <span className="text-xs text-gray-400">
                                        {basket.items.length} {basket.items.length === 1 ? "προϊόν" : "προϊόντα"}
                                    </span>
                                )}
                            </div>

                            {(!basket || basket.items.length === 0) ? (
                                <div className="mt-4 rounded-2xl border border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
                                    <ShoppingCart className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
                                    <p className="mt-3 text-sm text-gray-400">
                                        Το καλάθι είναι κενό
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-4 space-y-3">
                                    {basket.items.map((item) => (
                                        <BasketLineItem
                                            key={item.BASKETID}
                                            item={item}
                                            isSelected={selectedItems?.has(item.BASKETID)}
                                            isRemoving={removingItems?.has(item.BASKETID)}
                                            onToggle={onToggleItem}
                                            onRemove={onRemoveItem}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
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
                                onClick={() => onReceiptTypeChange?.("receipt")}
                                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${receiptType === "receipt"
                                    ? "border-brand-500 bg-brand-50 text-brand-600 dark:border-brand-500 dark:bg-brand-500/10 dark:text-brand-400"
                                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                                    }`}
                            >
                                Απόδειξη
                            </button>
                            <button
                                type="button"
                                onClick={() => onReceiptTypeChange?.("invoice")}
                                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${receiptType === "invoice"
                                    ? "border-brand-500 bg-brand-50 text-brand-600 dark:border-brand-500 dark:bg-brand-500/10 dark:text-brand-400"
                                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                                    }`}
                            >
                                Τιμολόγιο
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
                </div>

                <div className="shrink-0 border-t border-gray-100 px-5 py-5 dark:border-gray-800">
                    <button
                        type="button"
                        onClick={onSendOrder}
                        disabled={sendingOrder || (selectedItems ? selectedItems.size === 0 : (basket?.items.length ?? 0) === 0)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300"
                    >
                        {sendingOrder ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                        Αποστολή Παραγγελίας
                    </button>
                </div>
            </div>
        </aside>
    );
}

function BasketLineItem({
    item,
    isSelected,
    isRemoving,
    onToggle,
    onRemove,
}: {
    item: IBasketItem;
    isSelected?: boolean;
    isRemoving?: boolean;
    onToggle?: (uid: string) => void;
    onRemove?: (uid: string) => void;
}) {
    const selected = isSelected ?? true;

    return (
        <div className={`group rounded-xl border p-3 transition-all ${selected
            ? "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40"
            : "border-gray-200 bg-gray-50/50 opacity-60 dark:border-gray-800 dark:bg-gray-900/40"
            }`}>
            <div className="flex items-start gap-2">
                {onToggle && (
                    <button
                        type="button"
                        onClick={() => onToggle(getBasketItemId(item))}
                        aria-label={selected ? "Αποεπιλογή" : "Επιλογή"}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${selected
                            ? "border-brand-500 bg-brand-500 text-white"
                            : "border-gray-300 text-transparent hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500"
                            }`}
                    >
                        {selected ? (
                            <Check className="h-3 w-3" />
                        ) : (
                            <Circle className="h-3 w-3" />
                        )}
                    </button>
                )}
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-700 dark:text-white/90">
                        MTRL: {item.MTRL || "-"} 
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span>
                            ΠΟΣΟΤΗΤΑ:{" "}
                            <span className="font-medium text-gray-700 dark:text-white/90">
                                {item.TOTAL_QTY ?? getBasketItemQty(item)}
                            </span>
                        </span>
                        <span>
                            ΤΙΜΗ:{" "}
                            <span className="font-medium text-gray-700 dark:text-white/90">
                                {formatPrice(getBasketItemBasePrice(item))}
                            </span>
                        </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                        ΗΜ.ΠΡΟΣΘΗΚΗΣ: {item.MAX_INS_DATE || "-"}
                    </p>
                
                    {hasBasketItemDiscount(item) && (
                        <div className="mt-1.5">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getBasketItemApprovalStatus(item) === "approved"
                                ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                                : getBasketItemApprovalStatus(item) === "rejected"
                                    ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400"
                                }`}>
                                {getBasketItemApprovalStatus(item) === "approved"
                                    ? `Έκπτωση: ${formatPrice(getBasketItemRequestedPrice(item))}`
                                    : getBasketItemApprovalStatus(item) === "rejected"
                                        ? "Αίτημα απορρίφθηκε"
                                        : `Αίτημα: ${formatPrice(getBasketItemRequestedPrice(item))}`}
                            </span>
                        </div>
                    )}
                </div>
                {onRemove && (
                    <button
                        type="button"
                        onClick={() => onRemove(getBasketItemId(item))}
                        disabled={isRemoving}
                        aria-label="Αφαίρεση"
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    >
                        {isRemoving ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <Trash2 className="h-3 w-3" />
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
