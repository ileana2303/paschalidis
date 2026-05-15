"use client";

import {
    Loader2,
    ShoppingCart,
    Trash2,
} from "@/lib/icons/lucide";
import DataTableSelectionCheckbox from "@/components/ui/data-table/data-table-selection-checkbox";
import {
    getBasketItemApprovalStatus,
    getBasketItemBasePrice,
    getBasketItemId,
    getBasketItemLineTotal,
    getBasketItemRequestedPrice,
    hasBasketItemPriceRequest,
} from "@/lib/utils/basket-helpers";
import type { IBasketItem } from "@/lib/interface";

interface BasketLinesProps {
    items: IBasketItem[];
    selectedItems?: Set<string>;
    onToggleItem?: (uid: string) => void;
    onRemoveItem?: (uid: string) => void;
    onRemoveSelectedItems?: () => void;
    onChangeQuantity?: (uid: string, quantity: number) => void;
    removingItems?: Set<string>;
    removingSelectedItems?: boolean;
    title?: string;
    emptyStateLabel?: string;
}

const formatPrice = (price: number | null) => {
    if (price == null) return "--";
    return `${price.toFixed(2)} €`;
};

const quantityOptions = Array.from({ length: 100 }, (_, index) => index + 1);

export default function BasketLines({
    items,
    selectedItems,
    onToggleItem,
    onRemoveItem,
    onRemoveSelectedItems,
    onChangeQuantity,
    removingItems,
    removingSelectedItems = false,
    title = "Γραμμές Καλαθιού",
    emptyStateLabel = "Το καλάθι είναι κενό",
}: BasketLinesProps) {
    const selectedBasketItems =
        selectedItems != null
            ? items.filter((item) => selectedItems.has(getBasketItemId(item)))
            : items;

    const canToggleAllBasketItems =
        selectedItems != null && onToggleItem != null && items.length > 0;

    const areAllBasketItemsSelected =
        canToggleAllBasketItems &&
        selectedItems != null &&
        items.every((item) => selectedItems.has(getBasketItemId(item)));

    const canRemoveSelectedBasketItems =
        onRemoveSelectedItems != null && selectedBasketItems.length > 0;

    const countLabel = `${items.length} ${items.length === 1 ? "προϊόν" : "προϊόντα"}`;

    const handleToggleAllBasketItems = () => {
        if (selectedItems == null || onToggleItem == null || items.length === 0) {
            return;
        }

        const allSelected = items.every((item) =>
            selectedItems.has(getBasketItemId(item))
        );

        items.forEach((item) => {
            const itemId = getBasketItemId(item);
            const isSelected = selectedItems.has(itemId);

            if (allSelected ? isSelected : !isSelected) {
                onToggleItem(itemId);
            }
        });
    };

    return (
        <section className="mt-5">
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {title}
                </p>

                <div className="flex shrink-0 items-center gap-2">
                    {canToggleAllBasketItems && (
                        <button
                            type="button"
                            onClick={handleToggleAllBasketItems}
                            className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
                        >
                            {areAllBasketItemsSelected ? "Αποεπιλογή όλων" : "Επιλογή όλων"}
                        </button>
                    )}

                    {onRemoveSelectedItems && items.length > 0 && (
                        <button
                            type="button"
                            onClick={onRemoveSelectedItems}
                            disabled={!canRemoveSelectedBasketItems || removingSelectedItems}
                            title="Διαγραφή επιλεγμένων"
                            aria-label="Διαγραφή επιλεγμένων γραμμών"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-200 bg-white text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300 dark:border-red-500/30 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-500/10 dark:disabled:border-gray-700 dark:disabled:text-gray-600"
                        >
                            {removingSelectedItems ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                            )}
                        </button>
                    )}

                    {items.length > 0 && (
                        <span className="text-xs text-gray-400">
                            {countLabel}
                        </span>
                    )}
                </div>
            </div>

            {items.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
                    <div className="mx-auto flex h-8 w-8 items-center justify-center text-gray-300 dark:text-gray-600">
                        <ShoppingCart className="h-8 w-8" />
                    </div>
                    <p className="mt-3 text-sm text-gray-400">{emptyStateLabel}</p>
                </div>
            ) : (
                <div className="mt-4 space-y-2.5">
                    {items.map((item) => {
                        const itemId = getBasketItemId(item);
                        const selected = selectedItems?.has(itemId) ?? true;

                        const approvalStatus = getBasketItemApprovalStatus(item);
                        const hasPriceRequest = hasBasketItemPriceRequest(item);

                        const erpPrice = getBasketItemBasePrice(item);
                        const requestedPrice = hasPriceRequest
                            ? getBasketItemRequestedPrice(item)
                            : null;

                        const lineTotal = getBasketItemLineTotal(item);

                        const isApprovedRequest = approvalStatus === "approved" && hasPriceRequest;

                        const requestStatusLabel =
                            approvalStatus === "approved"
                                ? "Εγκρίθηκε"
                                : approvalStatus === "rejected"
                                    ? "Απορρίφθηκε"
                                    : "Σε αναμονή";

                        const requestStatusClassName =
                            approvalStatus === "approved"
                                ? "border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400"
                                : approvalStatus === "rejected"
                                    ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                                    : "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-400";

                        const currentQuantity = Number(item.QTY ?? 1);

                        return (
                            <article
                                key={itemId}
                                className={[
                                    "group rounded-2xl border bg-white p-3 shadow-xs transition-all dark:bg-gray-900/50",
                                    selected
                                        ? "border-gray-200 hover:border-brand-200 hover:shadow-sm dark:border-gray-800 dark:hover:border-brand-500/30"
                                        : "border-gray-200 opacity-60 dark:border-gray-800",
                                ].join(" ")}
                            >
                                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.9fr)_minmax(220px,0.7fr)] lg:items-center">

                                    <div className="flex min-w-0 items-start gap-3">
                                        <div className="flex shrink-0 flex-col items-center gap-2 pt-1">
                                            {onToggleItem && (
                                                <DataTableSelectionCheckbox
                                                    checked={selected}
                                                    onCheckedChange={() => onToggleItem(itemId)}
                                                    ariaLabel={selected ? "Αποεπιλογή" : "Επιλογή"}
                                                />
                                            )}

                                            {onRemoveItem && (
                                                <button
                                                    type="button"
                                                    onClick={() => onRemoveItem(itemId)}
                                                    disabled={removingItems?.has(itemId)}
                                                    aria-label="Αφαίρεση"
                                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                                                >
                                                    {removingItems?.has(itemId) ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    )}
                                                </button>
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
                                                    {item.ITEM_CODE || item.CODE2 || item.CODE || "-"}
                                                </p>
                                            </div>

                                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                                                {item.ITEM_DESCR || item.NAME || "-"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-gray-100 bg-gray-50 px-2.5 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                                                Τιμές
                                            </p>

                                            {hasPriceRequest && (
                                                <span
                                                    className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${requestStatusClassName}`}
                                                >
                                                    {requestStatusLabel}
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    ERP
                                                </span>

                                                <span
                                                    className={[
                                                        "inline-flex rounded-lg px-2 py-1 text-xs font-semibold tabular-nums",
                                                        isApprovedRequest
                                                            ? "border border-gray-200 bg-white text-gray-400 line-through dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500"
                                                            : "text-gray-700 dark:text-white/90",
                                                    ].join(" ")}
                                                >
                                                    {formatPrice(erpPrice)}
                                                </span>
                                            </div>

                                            {hasPriceRequest && (
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        Ζητούμενη
                                                    </span>

                                                    <span
                                                        className={[
                                                            "inline-flex rounded-lg px-2 py-1 text-xs font-semibold tabular-nums",
                                                            isApprovedRequest
                                                                ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                                                                : "text-gray-700 dark:text-white/90",
                                                        ].join(" ")}
                                                    >
                                                        {formatPrice(requestedPrice)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-3 lg:justify-end">
                                        <div className="grid grid-cols-[50px_minmax(110px,auto)] items-end gap-3">
                                            <div>
                                                <label
                                                    htmlFor={`basket-qty-${itemId}`}
                                                    className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400"
                                                >
                                                    Ποσότητα
                                                </label>

                                                <select
                                                    id={`basket-qty-${itemId}`}
                                                    value={Number.isFinite(currentQuantity) ? currentQuantity : 1}
                                                    onChange={(event) =>
                                                        onChangeQuantity?.(itemId, Number(event.target.value))
                                                    }
                                                    disabled={!onChangeQuantity}
                                                    className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm font-semibold tabular-nums text-gray-800 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-500/40 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
                                                >
                                                    {quantityOptions.map((quantity) => (
                                                        <option key={quantity} value={quantity}>
                                                            {quantity}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="text-right">
                                                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                                                    Σύνολο
                                                </p>

                                                <p className="inline-flex h-8 items-center rounded-full border border-brand-200 bg-brand-50 px-3 text-sm font-bold tabular-nums text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
                                                    {formatPrice(lineTotal)}
                                                </p>
                                            </div>
                                        </div>


                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )
            }
        </section >
    );
}