"use client";

import { useMemo, useState } from "react";
import BasketItemDetails from "@/components/ui/basket-lines/basket-line-details";
import DataTable from "@/components/ui/data-table/data-table";
import DataTableActions from "@/components/ui/data-table/data-table-action";
import DataTableEmptyState from "@/components/ui/data-table/data-table-empty-state";
import DataTableHeader from "@/components/ui/data-table/data-table-header";
import NumberBadge from "@/components/ui/data-table/number-badge";
import DataTableSelectionCheckbox from "@/components/ui/data-table/data-table-selection-checkbox";
import {
    BadgePercent,
    ChevronDown,
    ListChevronsDownUp,
    ListChevronsUpDown,
    Loader2,
    Plus,
    Send,
    ShoppingCart,
    Trash2,
} from "@/lib/icons/lucide";
import {
    getBasketItemApprovalStatus,
    getBasketItemBasePrice,
    getBasketItemCode,
    getBasketItemEffectivePrice,
    getBasketItemId,
    getBasketItemLineTotal,
    getBasketItemName,
    getBasketItemQty,
    getBasketItemRequestedPrice,
    hasBasketItemPriceRequest,
} from "@/lib/utils/basket-helpers";
import { IBasketItem } from "@/lib/interface";

interface BasketTableProps {
    items: IBasketItem[];
    selectedItems: Set<string>;
    onToggleItem: (uid: string) => void;
    onToggleAll: () => void;
    onUpdateQty: (uid: string, qty: number) => void;
    onRemove: (uid: string) => void;
    onRemoveSelected: (ids: string[]) => void;
    onAddMore: () => void;
    requestedPriceValues?: Record<string, string>;
    onRequestedPriceValueChange?: (uid: string, value: string) => void;
    onRequestPrice?: (uid: string) => void | Promise<void>;
    submittingRequestedPrices?: Set<string>;
    loading?: boolean;
    updatingQtyItems?: Set<string>;
    removingItems?: Set<string>;
    removingSelectedItems?: boolean;
    error?: string;
    successMessage?: string;
}

const formatPrice = (price: number | null) => {
    if (price == null || !Number.isFinite(price)) {
        return "--";
    }

    return `${price.toFixed(2)} €`;
};

const primaryActionClassName =
    "inline-flex h-10 items-center gap-2 rounded-xl bg-brand-500 px-3.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50";

const quantityOptions = Array.from({ length: 100 }, (_, index) => index + 1);

const parsePriceInput = (value: string) => {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
};

function getQuantityOptions(currentQty: number) {
    if (quantityOptions.includes(currentQty)) {
        return quantityOptions;
    }

    return [...quantityOptions, currentQty].sort((a, b) => a - b);
}

export default function BasketTable({
    items,
    selectedItems,
    onToggleItem,
    onToggleAll,
    onUpdateQty,
    onRemove,
    onRemoveSelected,
    onAddMore,
    requestedPriceValues,
    onRequestedPriceValueChange,
    onRequestPrice,
    submittingRequestedPrices,
    loading = false,
    updatingQtyItems,
    removingItems,
    removingSelectedItems = false,
    error,
    successMessage,
}: BasketTableProps) {
    const itemIds = useMemo(
        () => items.map((item) => getBasketItemId(item)),
        [items]
    );
    const selectedIds = useMemo(
        () => itemIds.filter((itemId) => selectedItems.has(itemId)),
        [itemIds, selectedItems]
    );
    const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set());
    const selectedCount = selectedIds.length;
    const allSelected = items.length > 0 && selectedCount === items.length;
    const someSelected = selectedCount > 0 && !allSelected;
    const tableBusy = removingSelectedItems;
    const canRemoveSelectedBasketItems = selectedCount > 0;
    const areAllResultsExpanded =
        itemIds.length > 0 && itemIds.every((itemId) => expandedItemIds.has(itemId));
    const grandTotal = useMemo(
        () => items.reduce((sum, item) => sum + getBasketItemLineTotal(item), 0),
        [items]
    );

    const handleDeleteSelected = () => {
        if (selectedIds.length === 0 || tableBusy) {
            return;
        }

        onRemoveSelected(selectedIds);
    };

    const onToggleAllExpanded = () => {
        setExpandedItemIds((prev) => {
            const allExpanded =
                itemIds.length > 0 && itemIds.every((itemId) => prev.has(itemId));

            return allExpanded ? new Set() : new Set(itemIds);
        });
    };

    const handleToggleExpanded = (itemId: string) => {
        setExpandedItemIds((prev) => {
            const next = new Set(prev);

            if (next.has(itemId)) {
                next.delete(itemId);
            } else {
                next.add(itemId);
            }

            return next;
        });
    };

    return (
        <DataTable className="flex min-h-0 w-full flex-col xl:min-w-0 xl:basis-2/3">
            <DataTableHeader
                title="Γραμμές Καλαθιού"
                description="Ενημέρωση ποσοτήτων και επιλογή γραμμών για παραγγελία."
                count={items.length}
                action={(
                    <DataTableActions className="flex-wrap justify-start sm:justify-end">
                        <button
                            type="button"
                            onClick={onAddMore}
                            className={primaryActionClassName}
                        >
                            <Plus className="h-4 w-4" />
                            Προσθήκη
                        </button>
                    </DataTableActions>
                )}
            />

            {(error || successMessage) && (
                <div className="shrink-0 px-5 pt-4">
                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-500/35 dark:bg-red-500/10 dark:text-red-400">
                            {error}
                        </div>
                    )}
                    {!error && successMessage && (
                        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700 dark:border-green-500/35 dark:bg-green-500/10 dark:text-green-400">
                            {successMessage}
                        </div>
                    )}
                </div>
            )}

            {loading ? (
                <div className="flex flex-1 items-center justify-center px-5 py-16 text-sm text-gray-500 dark:text-gray-400">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-brand-500" />
                    Φόρτωση καλαθιού...
                </div>
            ) : items.length === 0 ? (
                <DataTableEmptyState
                    icon={<ShoppingCart className="h-7 w-7" />}
                    title="Το καλάθι είναι άδειο"
                    description="Προσθέστε προϊόντα για να ξεκινήσετε την παραγγελία πελάτη."
                    className="flex-1"
                    action={(
                        <button
                            type="button"
                            onClick={onAddMore}
                            className={primaryActionClassName}
                        >
                            <Plus className="h-4 w-4" />
                            Προσθήκη προϊόντων
                        </button>
                    )}
                />
            ) : (
                <>
                    <div className="min-h-0 flex-1 overflow-auto">
                        <table className="w-full min-w-[1360px] divide-y divide-gray-100 text-sm dark:divide-gray-800">
                            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-950">
                                <tr>
                                    <th className="w-24 px-4 py-3 text-left">
                                        <div className="flex items-center gap-2">
                                            <DataTableSelectionCheckbox
                                                ariaLabel="Επιλογή όλων των γραμμών"
                                                checked={allSelected}
                                                indeterminate={someSelected}
                                                onCheckedChange={onToggleAll}
                                                disabled={tableBusy}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleDeleteSelected}
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
                                        </div>
                                    </th>
                                    <th className="w-14 px-2 py-3 text-center">
                                        <button
                                            type="button"
                                            onClick={onToggleAllExpanded}
                                            aria-label={areAllResultsExpanded ? "Κλείσιμο λεπτομερειών" : "Άνοιγμα λεπτομερειών"}
                                            title={areAllResultsExpanded ? "Κλείσιμο λεπτομερειών" : "Άνοιγμα λεπτομερειών"}
                                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:border-brand-500 dark:hover:text-brand-400"
                                        >
                                            {areAllResultsExpanded ? (
                                                <ListChevronsDownUp className="h-4 w-4" />
                                            ) : (
                                                <ListChevronsUpDown className="h-4 w-4" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
                                        Είδος
                                    </th>
                                    <th className="w-[150px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
                                        Ποσότητα
                                    </th>
                                    <th className="w-[160px] px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
                                        Τιμή
                                    </th>
                                    <th className="w-[210px] px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
                                        Ζητούμενη Τιμή
                                    </th>
                                    <th className="w-[360px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
                                        Αίτημα Τιμής
                                    </th>
                                    <th className="w-[140px] px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
                                        Σύνολο
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {items.map((item) => {
                                    const itemId = getBasketItemId(item);

                                    return (
                                        <BasketTableRow
                                            key={itemId}
                                            item={item}
                                            selected={selectedItems.has(itemId)}
                                            onToggleItem={onToggleItem}
                                            onUpdateQty={onUpdateQty}
                                            onRemove={onRemove}
                                            isUpdatingQty={updatingQtyItems?.has(itemId) ?? false}
                                            isRemoving={removingItems?.has(itemId) ?? false}
                                            isTableBusy={tableBusy}
                                            expanded={expandedItemIds.has(itemId)}
                                            onToggleExpanded={handleToggleExpanded}
                                            requestedPriceValue={requestedPriceValues?.[itemId] ?? ""}
                                            onRequestedPriceValueChange={onRequestedPriceValueChange}
                                            onRequestPrice={onRequestPrice}
                                            isSubmittingRequestPrice={submittingRequestedPrices?.has(itemId) ?? false}
                                        />
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 border-t border-gray-100 bg-gray-50/70 px-5 py-3 text-sm dark:border-gray-800 dark:bg-gray-900/40 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                            Επιλεγμένα
                            <NumberBadge
                                value={`${selectedCount} / ${items.length}`}
                                variant={selectedCount > 0 ? "brand" : "neutral"}
                            />
                        </div>
                        <div className="text-gray-700 dark:text-gray-200">
                            Σύνολο καλαθιού: <span className="font-semibold">{formatPrice(grandTotal)}</span>
                        </div>
                    </div>
                </>
            )}
        </DataTable>
    );
}

function BasketTableRow({
    item,
    selected,
    onToggleItem,
    onUpdateQty,
    onRemove,
    isUpdatingQty,
    isRemoving,
    isTableBusy,
    expanded,
    onToggleExpanded,
    requestedPriceValue,
    onRequestedPriceValueChange,
    onRequestPrice,
    isSubmittingRequestPrice,
}: {
    item: IBasketItem;
    selected: boolean;
    onToggleItem: (uid: string) => void;
    onUpdateQty: (uid: string, qty: number) => void;
    onRemove: (uid: string) => void;
    isUpdatingQty: boolean;
    isRemoving: boolean;
    isTableBusy: boolean;
    expanded: boolean;
    onToggleExpanded: (uid: string) => void;
    requestedPriceValue: string;
    onRequestedPriceValueChange?: (uid: string, value: string) => void;
    onRequestPrice?: (uid: string) => void | Promise<void>;
    isSubmittingRequestPrice: boolean;
}) {
    const itemId = getBasketItemId(item);
    const qty = Math.max(1, getBasketItemQty(item));
    const sku = item.ITEM_CODE || item.CODE2 || getBasketItemCode(item) || "—";
    const productName = item.ITEM_DESCR || getBasketItemName(item) || "Χωρίς περιγραφή";
    const unitPrice = getBasketItemEffectivePrice(item);
    const erpPrice = getBasketItemBasePrice(item);
    const requestedPrice = getBasketItemRequestedPrice(item);
    const rowTotal = getBasketItemLineTotal(item);
    const qtySelectDisabled = isUpdatingQty || isRemoving || isTableBusy;
    const rowQuantityOptions = getQuantityOptions(qty);
    const detailsId = `basket-line-details-${itemId}`;
    const approvalStatus = getBasketItemApprovalStatus(item);
    const hasPriceRequest = hasBasketItemPriceRequest(item);
    const requestedPriceInput = parsePriceInput(requestedPriceValue);
    const canRequestPrice =
        onRequestedPriceValueChange != null && onRequestPrice != null;
    const isApprovedPriceRequest =
        hasPriceRequest && approvalStatus === "approved" && requestedPrice > 0;
    const isPendingPriceRequest =
        hasPriceRequest && approvalStatus !== "approved" && approvalStatus !== "rejected";
    const requestStatusLabel =
        approvalStatus === "approved"
            ? "Εγκρίθηκε"
            : approvalStatus === "rejected"
                ? "Απορρίφθηκε"
                : hasPriceRequest
                    ? "Σε αναμονή"
                    : "Χωρίς αίτημα";
    const requestStatusClassName =
        approvalStatus === "approved"
            ? "border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400"
            : approvalStatus === "rejected"
                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                : hasPriceRequest
                    ? "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-400"
                    : "border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400";
    const requestStatusBadgeClassName =
        `inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${requestStatusClassName}`;
    const requestedPriceBadgeClassName =
        `inline-flex rounded-full border px-2.5 py-1 text-sm font-semibold tabular-nums ${requestStatusClassName}`;

    return (
        <>
            <tr className="transition hover:bg-gray-50 dark:hover:bg-white/[0.04]">
                <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-2">
                        <DataTableSelectionCheckbox
                            ariaLabel={`Επιλογή ${sku}`}
                            checked={selected}
                            onCheckedChange={() => onToggleItem(itemId)}
                            disabled={isTableBusy}
                        />

                        <button
                            type="button"
                            onClick={() => onRemove(itemId)}
                            disabled={isRemoving || isUpdatingQty || isTableBusy}
                            aria-label="Αφαίρεση γραμμής"
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        >
                            {isRemoving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                            )}
                        </button>
                    </div>
                </td>

                <td className="px-2 py-3 text-center align-middle">
                    <button
                        type="button"
                        onClick={() => onToggleExpanded(itemId)}
                        aria-expanded={expanded}
                        aria-controls={detailsId}
                        aria-label={expanded ? "Απόκρυψη λεπτομερειών" : "Εμφάνιση λεπτομερειών"}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    >
                        <ChevronDown
                            strokeWidth={2.25}
                            className={[
                                "h-4 w-4 transition-transform",
                                expanded ? "rotate-180" : "",
                            ].join(" ")}
                        />
                    </button>
                </td>

                <td className="px-4 py-3 align-middle">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                        {sku}
                    </p>
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                        {productName}
                    </p>
                </td>

                <td className="px-4 py-3 align-middle">
                    <select
                        value={qty}
                        onChange={(event) =>
                            onUpdateQty(itemId, Number(event.target.value))
                        }
                        disabled={qtySelectDisabled}
                        aria-label="Ποσότητα"
                        className="h-8 w-20 rounded-lg border border-gray-200 bg-white px-2 text-sm font-semibold tabular-nums text-gray-800 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-500/40 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
                    >
                        {rowQuantityOptions.map((quantity) => (
                            <option key={quantity} value={quantity}>
                                {quantity}
                            </option>
                        ))}
                    </select>

                    {isUpdatingQty && (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs text-gray-400">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Ενημέρωση
                        </span>
                    )}
                </td>

                <td className="px-4 py-3 text-right align-middle">
                    {isApprovedPriceRequest ? (
                        <span className="inline-flex rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm font-semibold tabular-nums text-gray-400 line-through dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500">
                            {formatPrice(erpPrice)}
                        </span>
                    ) : (
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                            {formatPrice(unitPrice)}
                        </span>
                    )}
                </td>

                <td className="px-4 py-3 text-right align-middle">
                    {hasPriceRequest && requestedPrice > 0 ? (
                        <div className="flex flex-col items-end gap-1">
                            {isPendingPriceRequest ? (
                                <span className={requestedPriceBadgeClassName}>
                                    {formatPrice(requestedPrice)}
                                </span>
                            ) : isApprovedPriceRequest ? (
                                <span className="text-sm font-semibold tabular-nums text-green-700 dark:text-green-400">
                                    {formatPrice(requestedPrice)}
                                </span>
                            ) : (
                                <span className="text-sm font-semibold tabular-nums text-gray-800 dark:text-white/90">
                                    {formatPrice(requestedPrice)}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-sm text-gray-400">--</span>
                    )}
                </td>

                <td className="px-4 py-3 align-middle">
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-2.5 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                            {canRequestPrice && (
                                <>
                                    <div className="flex shrink-0 items-center gap-1 text-amber-700 dark:text-amber-300">
                                        <BadgePercent className="h-3.5 w-3.5" />
                                    </div>

                                    <input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={requestedPriceValue}
                                        onChange={(event) =>
                                            onRequestedPriceValueChange?.(itemId, event.target.value)
                                        }
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter") {
                                                void onRequestPrice?.(itemId);
                                            }
                                        }}
                                        placeholder="Νέα τιμή..."
                                        className="h-8 min-w-[7rem] flex-1 rounded-md border border-amber-200 bg-white px-2 text-sm text-gray-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-amber-500/30 dark:bg-gray-900 dark:text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => void onRequestPrice?.(itemId)}
                                        disabled={
                                            isSubmittingRequestPrice ||
                                            requestedPriceInput == null ||
                                            requestedPriceInput <= 0
                                        }
                                        aria-label="Υποβολή αιτήματος τιμής"
                                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-500 text-white shadow-sm transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        {isSubmittingRequestPrice ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Send className="h-3.5 w-3.5" />
                                        )}
                                    </button>
                                </>
                            )}

                            {!canRequestPrice && (
                                <div className="flex items-center gap-1 text-amber-700 dark:text-amber-300">
                                    <BadgePercent className="h-3.5 w-3.5" />
                                </div>
                            )}
                        </div>

                        <div className="flex shrink-0 items-center justify-end">
                            <span className={requestStatusBadgeClassName}>
                                {requestStatusLabel}
                            </span>
                        </div>
                    </div>
                </td>

                <td className="px-4 py-3 text-right align-middle text-sm font-semibold text-gray-800 dark:text-white/90">
                    {formatPrice(rowTotal)}
                </td>

            </tr>

            {expanded && (
                <tr id={detailsId} className="bg-gray-50/60 dark:bg-white/[0.02]">
                    <td colSpan={8} className="px-4 pb-4 pt-0">
                        <div className="pl-20">
                            <BasketItemDetails item={item} className="mt-0" />
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}
