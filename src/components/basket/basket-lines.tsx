"use client";

import { useState } from "react";
import {
    Check,
    ChevronDown,
    Circle,
    Loader2,
    ShoppingCart,
    Trash2,
} from "@/lib/icons/lucide";
import {
    getBasketItemApprovalStatus,
    getBasketItemBasePrice,
    getBasketItemId,
    getBasketItemLineTotal,
    getBasketItemRequestedPrice,
    hasBasketItemPriceRequest,
} from "@/lib/utils/basket-helpers";
import { IBasketItem } from "@/lib/interface";

interface BasketLinesProps {
    items: IBasketItem[];
    selectedItems?: Set<string>;
    onToggleItem?: (uid: string) => void;
    onRemoveItem?: (uid: string) => void;
    onRemoveSelectedItems?: () => void;
    removingItems?: Set<string>;
    removingSelectedItems?: boolean;
    title?: string;
    emptyStateLabel?: string;
}

const formatPrice = (price: number | null) => {
    if (price == null) return "--";
    return `${price.toFixed(2)} €`;
};

export default function BasketLines({
    items,
    selectedItems,
    onToggleItem,
    onRemoveItem,
    onRemoveSelectedItems,
    removingItems,
    removingSelectedItems = false,
    title = "Γραμμές Καλαθιού",
    emptyStateLabel = "Το καλάθι είναι κενό",
}: BasketLinesProps) {
    const selectedBasketItems =
        selectedItems != null
            ? items.filter((item) => selectedItems.has(getBasketItemId(item)))
            : items;

    const canToggleAllBasketItems = selectedItems != null && onToggleItem != null && items.length > 0;
    const areAllBasketItemsSelected =
        canToggleAllBasketItems && items.every((item) => selectedItems.has(getBasketItemId(item)));
    const canRemoveSelectedBasketItems =
        onRemoveSelectedItems != null && selectedBasketItems.length > 0;

    const handleToggleAllBasketItems = () => {
        if (!canToggleAllBasketItems) {
            return;
        }

        items.forEach((item) => {
            const itemId = getBasketItemId(item);
            const isSelected = selectedItems.has(itemId);

            if (areAllBasketItemsSelected ? isSelected : !isSelected) {
                onToggleItem(itemId);
            }
        });
    };

    return (
        <div className="mt-5">
            <div className="flex items-center justify-between">
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
                            {items.length} {items.length === 1 ? "προϊόν" : "προϊόντα"}
                        </span>
                    )}
                </div>
            </div>

            {items.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
                    <ShoppingCart className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
                    <p className="mt-3 text-sm text-gray-400">
                        {emptyStateLabel}
                    </p>
                </div>
            ) : (
                <div className="mt-4 space-y-3">
                    {items.map((item) => {
                        const itemId = getBasketItemId(item);

                        return (
                            <BasketLineItem
                                key={itemId}
                                item={item}
                                isSelected={selectedItems?.has(itemId)}
                                isRemoving={removingItems?.has(itemId)}
                                onToggle={onToggleItem}
                                onRemove={onRemoveItem}
                            />
                        );
                    })}
                </div>
            )}
        </div>
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
    const [isExpanded, setIsExpanded] = useState(false);
    const approvalStatus = getBasketItemApprovalStatus(item);
    const hasPriceRequest = hasBasketItemPriceRequest(item);
    const requestedPrice = hasPriceRequest ? getBasketItemRequestedPrice(item) : null;
    const lineTotal = getBasketItemLineTotal(item);
    const requestStatusLabel =
        approvalStatus === "approved"
            ? "Εγκρίθηκε"
            : approvalStatus === "rejected"
                ? "Απορρίφθηκε"
                : "Σε αναμονή";
    const requestStatusClassName =
        approvalStatus === "approved"
            ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
            : approvalStatus === "rejected"
                ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400";

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
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-700 dark:text-white/90">
                                {item.ITEM_CODE || item.CODE2 || item.CODE || "-"}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                                {item.ITEM_DESCR || item.NAME || "-"}
                            </p>
                        </div>
                        <span className="inline-flex shrink-0 items-center rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-sm font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
                            {formatPrice(lineTotal)}
                        </span>
                    </div>

                    <div className="mt-2 grid grid-cols-1 gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span>
                            ΠΟΣΟΤΗΤΑ:{" "}
                            <span className="font-medium text-gray-700 dark:text-white/90">
                                {item.QTY ?? "-"}
                            </span>
                        </span>
                        <span>
                            ΤΙΜΗ ERP:{" "}
                            <span className="font-medium text-gray-700 dark:text-white/90">
                                {formatPrice(getBasketItemBasePrice(item))}
                            </span>
                        </span>
                        <span>
                            ΖΗΤΟΥΜΕΝΗ ΤΙΜΗ:{" "}
                            <span className="inline-flex items-center gap-1 font-medium text-gray-700 dark:text-white/90">
                                {formatPrice(requestedPrice)}
                                {hasPriceRequest && (
                                    <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${requestStatusClassName}`}>
                                        {requestStatusLabel}
                                    </span>
                                )}
                            </span>
                        </span>
                    </div>


                    <button
                        type="button"
                        onClick={() => setIsExpanded((prev) => !prev)}
                        aria-expanded={isExpanded}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    >
                        {isExpanded ? "Απόκρυψη στοιχείων" : "Περισσότερα στοιχεία"}
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>

                    {isExpanded && (
                        <div className="mt-2 grid grid-cols-1 gap-x-3 gap-y-2 rounded-lg border border-gray-200 bg-white/70 p-3 sm:grid-cols-2 dark:border-gray-800 dark:bg-gray-900/60">

                            <p className="min-w-0 text-xs text-gray-700 dark:text-gray-200"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">MTRL:</span> {item.MTRL || "-"}</p>

                            <p className="min-w-0 text-xs text-gray-700 dark:text-gray-200"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">PRICE_ERP:</span> {item.PRICE_ERP || "-"}</p>
                            <p className="min-w-0 text-xs text-gray-700 dark:text-gray-200"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">PRICE_REQ:</span> {item.PRICE_REQ || "-"}</p>

                            <p className="min-w-0 text-xs text-gray-700 dark:text-gray-200"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">IS_APROVED:</span> {item.IS_APROVED || "-"}</p>

                            <p className="min-w-0 text-xs text-gray-700 dark:text-gray-200"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">ADDED:</span> {item.BASKET_DATE || "-"}</p>

                            <p className="min-w-0 text-xs text-gray-700 dark:text-gray-200"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">COMPANY:</span> {item.COMPANY || "-"}</p>
                            <p className="min-w-0 text-xs text-gray-700 dark:text-gray-200"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">CODE:</span> {item.CODE || "-"}</p>

                            <p className="min-w-0 text-xs text-gray-700 dark:text-gray-200"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">CODE2:</span> {item.CODE2 || "-"}</p>

                            <p className="min-w-0 text-xs text-gray-700 dark:text-gray-200"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">BASKET_QTY:</span> {item.BASKET_QTY ?? "-"}</p>
                            <p className="min-w-0 text-xs text-gray-700 dark:text-gray-200"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">BASKET_ERP_PRICE:</span> {item.BASKET_ERP_PRICE ?? "-"}</p>
                            <p className="min-w-0 text-xs text-gray-700 dark:text-gray-200"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">BASKET_REQ_PRICE:</span> {item.BASKET_REQ_PRICE ?? "-"}</p>
                            <p className="min-w-0 text-xs text-gray-700 dark:text-gray-200"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">BargainStatus:</span> {item.BargainStatus ?? "-"}</p>
                            <p className="min-w-0 text-xs text-gray-700 dark:text-gray-200"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">ITEM_CODE:</span> {item.ITEM_CODE || "-"}</p>
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
