"use client";

import { useEffect, useMemo, useState } from "react";
import BasketItemDetails from "@/components/ui/basket-lines/basket-line-details";
import DataTable from "@/components/ui/data-table/data-table";
import DataTableActions from "@/components/ui/data-table/data-table-action";
import DataTableEmptyState from "@/components/ui/data-table/data-table-empty-state";
import DataTableHeader from "@/components/ui/data-table/data-table-header";
import NumberBadge from "@/components/ui/data-table/number-badge";
import DataTableSelectionCheckbox from "@/components/ui/data-table/data-table-selection-checkbox";
import {
    BadgePercent,
    Check,
    ChevronDown,
    Clock3,
    ListChevronsDownUp,
    ListChevronsUpDown,
    Loader2,
    Pencil,
    Plus,
    ShoppingCart,
    Trash2,
    X,
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
    onOpenItem?: (item: IBasketItem) => void;
    onAddMore: () => void;
    requestedPriceValues?: Record<string, string>;
    onRequestedPriceValueChange?: (uid: string, value: string) => void;
    onRequestPrice?: (uid: string) => void | Promise<void>;
    submittingRequestedPrices?: Set<string>;
    loading?: boolean;
    updatingQtyItems?: Set<string>;
    removingItems?: Set<string>;
    removingSelectedItems?: boolean;
}

const formatPrice = (price: number | null) => {
    if (price == null || !Number.isFinite(price)) {
        return "--";
    }

    return `${price.toFixed(2)} €`;
};

const parsePriceInput = (value: string) => {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
};

const primaryActionClassName =
    "inline-flex h-10 items-center gap-2 rounded-xl bg-brand-500 px-3.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50";

const quantityOptions = Array.from({ length: 100 }, (_, index) => index + 1);

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
    onOpenItem,
    onAddMore,
    requestedPriceValues,
    onRequestedPriceValueChange,
    onRequestPrice,
    submittingRequestedPrices,
    loading = false,
    updatingQtyItems,
    removingItems,
    removingSelectedItems = false,
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
        <DataTable className="flex min-h-0 min-w-0 max-w-full flex-col min-[1800px]:basis-2/3">
            <DataTableHeader
                title="Γραμμές Καλαθιού"
                description="Ενημέρωση ποσοτήτων και επιλογή γραμμών για παραγγελία."
                count={items.length}
                action={(
                    <DataTableActions className="flex-wrap justify-start sm:justify-end">
                        <button
                            type="button"
                            onClick={handleDeleteSelected}
                            disabled={!canRemoveSelectedBasketItems || removingSelectedItems}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300 dark:border-red-500/30 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-500/10 dark:disabled:border-gray-700 dark:disabled:text-gray-600"
                        >
                            {removingSelectedItems ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="h-4 w-4" />
                            )}
                            Διαγραφή επιλεγμένων
                            {selectedCount > 0 ? ` (${selectedCount})` : ""}
                        </button>
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
                    <div className="min-h-0 min-w-0 max-w-full flex-1 overflow-y-auto">
                        <table className="w-full table-fixed divide-y divide-gray-100 text-xs dark:divide-gray-800 xl:text-sm">
                            <colgroup>
                                <col className="w-[4%]" />
                                <col className="w-[5%]" />
                                <col className="w-[29%]" />
                                <col className="w-[8%]" />
                                <col className="w-[18%]" />
                                <col className="w-[18%]" />
                                <col className="w-[12%]" />
                                <col className="w-[6%]" />
                            </colgroup>
                            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-950">
                                <tr>
                                    <th className="px-2 py-3 text-left">
                                        <DataTableSelectionCheckbox
                                            ariaLabel="Επιλογή όλων των γραμμών"
                                            checked={allSelected}
                                            indeterminate={someSelected}
                                            onCheckedChange={onToggleAll}
                                            disabled={tableBusy}
                                        />
                                    </th>
                                    <th className="px-1 py-3 text-center">
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
                                    <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400 xl:px-4">
                                        Είδος
                                    </th>
                                    <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400 xl:px-4">
                                        Ποσότητα
                                    </th>
                                    <th className="px-2 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400 xl:px-4">
                                        Τιμή
                                    </th>
                                    <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400 xl:px-4">
                                        Αίτημα Τιμής
                                    </th>
                                    <th className="px-2 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400 xl:px-4">
                                        Σύνολο
                                    </th>
                                    <th className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400 xl:px-4">
                                        <span className="sr-only">Ενέργειες</span>
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
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
                                            onOpenItem={onOpenItem}
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
    onOpenItem,
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
    onOpenItem?: (item: IBasketItem) => void;
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
    const canRequestPrice =
        onRequestedPriceValueChange != null && onRequestPrice != null;
    const isApprovedPriceRequest =
        hasPriceRequest && approvalStatus === "approved" && requestedPrice > 0;
    const isRejectedPriceRequest = hasPriceRequest && approvalStatus === "rejected";
    const isPendingPriceRequest =
        hasPriceRequest && !isApprovedPriceRequest && !isRejectedPriceRequest;

    const [isEditingPrice, setIsEditingPrice] = useState(false);

    useEffect(() => {
        if (isSubmittingRequestPrice) {
            return () => setIsEditingPrice(false);
        }
    }, [isSubmittingRequestPrice]);

    const parsedRequestedPriceValue = parsePriceInput(requestedPriceValue);
    const submitPriceDisabled =
        isSubmittingRequestPrice ||
        parsedRequestedPriceValue == null ||
        parsedRequestedPriceValue <= 0;
    const showPriceEditor = canRequestPrice && isEditingPrice;
    const rowAccentClassName = isApprovedPriceRequest
        ? "border-l-[3px] border-l-green-400 dark:border-l-green-500/70"
        : isPendingPriceRequest
            ? "border-l-[3px] border-l-amber-300 dark:border-l-amber-500/50"
            : isRejectedPriceRequest
                ? "border-l-[3px] border-l-red-300 dark:border-l-red-500/50"
                : "border-l-[3px] border-l-transparent";

    return (
        <>
            <tr className={`border-t border-gray-100 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.04] ${rowAccentClassName}`}>
                <td className="px-2 py-3 align-middle">
                    <DataTableSelectionCheckbox
                        ariaLabel={`Επιλογή ${sku}`}
                        checked={selected}
                        onCheckedChange={() => onToggleItem(itemId)}
                        disabled={isTableBusy}
                    />
                </td>

                <td className="px-1 py-3 text-center align-middle">
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

                <td className="break-words px-2 py-3 align-middle xl:px-4">
                    {onOpenItem ? (
                        <>
                            <button
                                type="button"
                                onClick={() => onOpenItem(item)}
                                className="block text-left text-sm font-semibold text-gray-800 transition hover:text-brand-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 dark:text-white/90 dark:hover:text-brand-400"
                            >
                                {sku}
                            </button>
                              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                        {productName}
                    </p>
                        </>
                    ) : (
                        <>
                            <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                        
                                {sku}
                            </p>
                            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                                {productName}
                            </p>
                        </>
                    )}
                </td>

                <td className="px-2 py-3 align-middle xl:px-4">
                    <select
                        value={qty}
                        onChange={(event) =>
                            onUpdateQty(itemId, Number(event.target.value))
                        }
                        disabled={qtySelectDisabled}
                        aria-label="Ποσότητα"
                        className="h-8 w-14 rounded-lg border border-gray-200 bg-white px-1 text-sm font-semibold tabular-nums text-gray-800 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-500/40 dark:disabled:bg-gray-800 dark:disabled:text-gray-500 xl:w-20 xl:px-2"
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

                <td className="px-2 py-3 text-right align-middle xl:px-4">
                    <div className="flex flex-col items-end gap-1">
                        {isApprovedPriceRequest ? (
                            <>
                                <span className="text-xs text-gray-400 line-through dark:text-gray-500">
                                    {formatPrice(erpPrice)}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-sm font-bold tabular-nums text-green-700 dark:bg-green-500/10 dark:text-green-400">
                                    <Check className="h-3 w-3" strokeWidth={2.5} />
                                    {formatPrice(requestedPrice)}
                                </span>
                            </>
                        ) : isPendingPriceRequest ? (
                            <>
                                <span className="text-xs text-gray-400 line-through dark:text-gray-500">
                                    {formatPrice(erpPrice)}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-sm font-bold tabular-nums text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                                    <Clock3 className="h-3 w-3" />
                                    {formatPrice(requestedPrice)}
                                </span>
                            </>
                        ) : isRejectedPriceRequest ? (
                            <>
                                <span className="text-base font-semibold tabular-nums text-gray-800 dark:text-white/90">
                                    {formatPrice(unitPrice)}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-red-600 dark:bg-red-500/10 dark:text-red-400">
                                    <X className="h-3 w-3" />
                                    {formatPrice(requestedPrice)}
                                </span>
                            </>
                        ) : (
                            <span className="text-base font-semibold tabular-nums text-gray-800 dark:text-white/90">
                                {formatPrice(unitPrice)}
                            </span>
                        )}
                    </div>
                </td>

                <td className="px-2 py-3 align-middle xl:px-4">
                    {canRequestPrice && !isApprovedPriceRequest && (
                        showPriceEditor ? (
                            <div className="flex items-center gap-1">
                                <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    autoFocus
                                    value={requestedPriceValue}
                                    onChange={(event) =>
                                        onRequestedPriceValueChange?.(itemId, event.target.value)
                                    }
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            void onRequestPrice?.(itemId);
                                        }
                                        if (event.key === "Escape") {
                                            setIsEditingPrice(false);
                                        }
                                    }}
                                    disabled={isSubmittingRequestPrice}
                                    placeholder="Τιμή..."
                                    aria-label="Ζητούμενη τιμή"
                                    className="h-7 w-20 rounded-md border border-gray-200 bg-white px-1.5 text-xs tabular-nums text-gray-800 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => void onRequestPrice?.(itemId)}
                                    disabled={submitPriceDisabled}
                                    aria-label="Υποβολή τιμής"
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-500 text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {isSubmittingRequestPrice ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsEditingPrice(false)}
                                    disabled={isSubmittingRequestPrice}
                                    aria-label="Ακύρωση"
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ) : hasPriceRequest ? (
                            <button
                                type="button"
                                onClick={() => setIsEditingPrice(true)}
                                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-400 transition hover:bg-gray-100 hover:text-brand-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-brand-400"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                                {isPendingPriceRequest ? "Επεξεργασία" : "Νέο αίτημα"}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setIsEditingPrice(true)}
                                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-400 transition hover:bg-gray-100 hover:text-brand-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-brand-400"
                            >
                                <BadgePercent className="h-3.5 w-3.5" />
                                Αίτημα τιμής
                            </button>
                        )
                    )}
                </td>

                <td className="px-2 py-3 text-right align-middle font-semibold text-gray-800 dark:text-white/90 xl:px-4">
                    {formatPrice(rowTotal)}
                </td>

                <td className="px-2 py-3 text-center align-middle">
                    <button
                        type="button"
                        onClick={() => onRemove(itemId)}
                        disabled={isRemoving || isUpdatingQty || isTableBusy}
                        aria-label="Αφαίρεση γραμμής"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    >
                        {isRemoving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                        )}
                    </button>
                </td>

            </tr>

            {expanded && (
                <tr id={detailsId}>
                    <td colSpan={8} className="px-5 py-2">
                        <div className="pl-12">
                            <BasketItemDetails item={item} />
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}
