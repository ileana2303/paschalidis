"use client";

import {
    Loader2,
    ShoppingCart,
    Trash2,
} from "@/lib/icons/lucide";
import DataTableSelectionCheckbox from "@/components/ui/data-table/data-table-selection-checkbox";
import RequestPriceBox from "@/components/ui/request-price-box";
import QuantitySelect from "@/components/ui/quantity-select";
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
    onOpenItem?: (item: IBasketItem) => void;
    onChangeQuantity?: (uid: string, quantity: number) => void;
    requestedPriceValues?: Record<string, string>;
    onRequestedPriceValueChange?: (uid: string, value: string) => void;
    onRequestPrice?: (uid: string) => void | Promise<void>;
    submittingRequestedPrices?: Set<string>;
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
    onOpenItem,
    onChangeQuantity,
    requestedPriceValues,
    onRequestedPriceValueChange,
    onRequestPrice,
    submittingRequestedPrices,
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
        <section className="mt-5 min-w-0 max-w-full">
            <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="min-w-0 text-sm font-semibold text-gray-800 dark:text-white/90">
                    {title}
                </p>

                <div className="flex max-w-full flex-wrap items-center gap-2">
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
                <div className="mt-3 min-w-0 max-w-full divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900/40">
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

                        const isApprovedRequest =
                            approvalStatus === "approved" &&
                            hasPriceRequest &&
                            (requestedPrice ?? 0) > 0;

                        const requestStatusLabel =
                            approvalStatus === "approved"
                                ? "Εγκρίθηκε"
                                : approvalStatus === "rejected"
                                    ? "Απορρίφθηκε"
                                    : "Σε αναμονή";

                        const requestStatusDotClassName =
                            approvalStatus === "approved"
                                ? "bg-green-500"
                                : approvalStatus === "rejected"
                                    ? "bg-red-500"
                                    : "bg-amber-500";

                        const currentQuantity = Number(item.QTY ?? 1);
                        const requestedPriceValue = requestedPriceValues?.[itemId] ?? "";
                        const isSubmittingRequestPrice =
                            submittingRequestedPrices?.has(itemId) ?? false;
                        const canRequestPrice =
                            onRequestedPriceValueChange != null && onRequestPrice != null;

                        return (
                            <article
                                key={itemId}
                                className={[
                                    "group min-w-0 max-w-full px-2.5 py-2 transition-colors",
                                    selected
                                        ? "hover:bg-gray-50/80 dark:hover:bg-white/[0.025]"
                                        : "bg-gray-50/60 opacity-60 dark:bg-white/[0.015]",
                                ].join(" ")}
                            >
                                <div className="flex min-w-0 items-start gap-2.5">
                                    {onToggleItem && (
                                        <DataTableSelectionCheckbox
                                            checked={selected}
                                            onCheckedChange={() => onToggleItem(itemId)}
                                            ariaLabel={selected ? "Αποεπιλογή" : "Επιλογή"}
                                            className="mt-0.5"
                                        />
                                    )}

                                    <div className="min-w-0 flex-1">
                                        <div className="flex min-w-0 items-center justify-between gap-2">
                                            <div className="flex min-w-0 flex-1 items-baseline gap-2">
                                                {onOpenItem ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenItem(item)}
                                                        className="max-w-[45%] shrink-0 truncate text-left font-mono text-xs font-bold tracking-wide text-gray-900 transition hover:text-brand-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 2xl:text-sm dark:text-white dark:hover:text-brand-400"
                                                    >
                                                        {item.ITEM_CODE || item.CODE2 || item.CODE || "-"}
                                                    </button>
                                                ) : (
                                                    <p className="truncate font-mono text-xs font-bold tracking-wide text-gray-900 2xl:text-sm dark:text-white">
                                                        {item.ITEM_CODE || item.CODE2 || item.CODE || "-"}
                                                    </p>
                                                )}

                                                <p
                                                    className="min-w-0 flex-1 truncate text-[11px] font-medium text-gray-500 2xl:text-xs dark:text-gray-400"
                                                    title={item.ITEM_DESCR || item.NAME || "-"}
                                                >
                                                    {item.ITEM_DESCR || item.NAME || "-"}
                                                </p>
                                            </div>

                                            {onRemoveItem && (
                                                <button
                                                    type="button"
                                                    onClick={() => onRemoveItem(itemId)}
                                                    disabled={removingItems?.has(itemId)}
                                                    aria-label="Αφαίρεση"
                                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                                                >
                                                    {removingItems?.has(itemId) ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    )}
                                                </button>
                                            )}
                                        </div>

                                        <div
                                            className={[
                                                "mt-1.5 grid items-start gap-1.5 border-t border-gray-100 pt-1.5 dark:border-gray-800",
                                                hasPriceRequest || canRequestPrice
                                                    ? "grid-cols-[3.25rem_0.75rem_minmax(0,1fr)_minmax(0,1.15fr)_auto]"
                                                    : "grid-cols-[3.25rem_0.75rem_minmax(0,1fr)_auto]",
                                            ].join(" ")}
                                        >
                                            <div>
                                                <label
                                                    htmlFor={`basket-qty-${itemId}`}
                                                    className="mb-1 flex h-4 items-center text-[9px] font-semibold uppercase leading-none tracking-[0.12em] text-gray-400 2xl:text-[10px]"
                                                >
                                                    Ποσ.
                                                </label>
                                                <QuantitySelect
                                                    id={`basket-qty-${itemId}`}
                                                    value={Number.isFinite(currentQuantity) ? currentQuantity : 1}
                                                    onChange={(nextQuantity) =>
                                                        onChangeQuantity?.(itemId, nextQuantity)
                                                    }
                                                    disabled={!onChangeQuantity}
                                                    compact
                                                    className="w-full"
                                                />
                                            </div>

                                            <div aria-hidden="true" />

                                            <div className="min-w-0">
                                                <p className="mb-1 flex h-4 items-center text-[9px] font-semibold uppercase leading-none tracking-[0.12em] text-gray-400 2xl:text-[10px]">
                                                    Τιμή ERP
                                                </p>
                                                <p
                                                    className={[
                                                        "truncate text-xs font-semibold leading-7 tabular-nums text-gray-700 2xl:text-sm dark:text-gray-200",
                                                        isApprovedRequest ? "line-through opacity-55" : "",
                                                    ].join(" ")}
                                                >
                                                    {formatPrice(erpPrice)}
                                                </p>
                                            </div>

                                            {(hasPriceRequest || canRequestPrice) && (
                                                <div className="min-w-0">
                                                    <div className="mb-1 flex h-4 min-w-0 items-center">
                                                        <p className="min-w-0 flex-1 truncate text-[9px] font-semibold uppercase leading-none tracking-[0.12em] text-gray-400 2xl:text-[10px]">
                                                            Αιτ. τιμή
                                                        </p>
                                                    </div>
                                                    <div className="flex h-7 min-w-0 items-center gap-1">
                                                        {hasPriceRequest && (
                                                            <span
                                                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${requestStatusDotClassName}`}
                                                                title={requestStatusLabel}
                                                                aria-label={requestStatusLabel}
                                                            />
                                                        )}

                                                        {canRequestPrice && !isApprovedRequest ? (
                                                            <RequestPriceBox
                                                                status={approvalStatus}
                                                                hasPriceRequest={hasPriceRequest}
                                                                requestedPrice={requestedPrice}
                                                                value={requestedPriceValue}
                                                                onChange={(value) =>
                                                                    onRequestedPriceValueChange?.(itemId, value)
                                                                }
                                                                onSubmit={() => onRequestPrice?.(itemId)}
                                                                submitting={isSubmittingRequestPrice}
                                                                prominent
                                                                valueSlot
                                                                className="w-fit min-w-0 max-w-full"
                                                            />
                                                        ) : hasPriceRequest ? (
                                                            <span
                                                                className={[
                                                                    "min-w-0 truncate text-[11px] font-semibold tabular-nums 2xl:text-sm",
                                                                    isApprovedRequest
                                                                        ? "text-green-700 dark:text-green-400"
                                                                        : "text-gray-700 dark:text-gray-200",
                                                                ].join(" ")}
                                                            >
                                                                {formatPrice(requestedPrice)}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="min-w-0 text-right">
                                                <p className="mb-1 flex h-4 items-center justify-end text-[9px] font-semibold uppercase leading-none tracking-[0.12em] text-gray-400 2xl:text-[10px]">
                                                    Σύνολο
                                                </p>
                                                <p className="truncate text-sm font-bold leading-7 tabular-nums text-brand-600 2xl:text-base dark:text-brand-300">
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
            )}
        </section>
    );
}
