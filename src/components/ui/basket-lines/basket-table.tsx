"use client";

import { useEffect, useMemo, useState } from "react";
import QuantityControl from "@/components/ui/quantity-control";
import DataTable from "@/components/ui/data-table/data-table";
import DataTableActions from "@/components/ui/data-table/data-table-action";
import DataTableEmptyState from "@/components/ui/data-table/data-table-empty-state";
import DataTableHeader from "@/components/ui/data-table/data-table-header";
import NumberBadge from "@/components/ui/data-table/number-badge";
import DataTableSelectionCheckbox from "@/components/ui/data-table/data-table-selection-checkbox";
import {
    Loader2,
    Plus,
    ShoppingCart,
    Trash2,
} from "@/lib/icons/lucide";
import {
    getBasketItemCode,
    getBasketItemEffectivePrice,
    getBasketItemId,
    getBasketItemLineTotal,
    getBasketItemName,
    getBasketItemQty,
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

const dangerActionClassName =
    "inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-white px-3.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300 dark:border-red-500/35 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-500/10 dark:disabled:border-gray-700 dark:disabled:text-gray-600";

export default function BasketTable({
    items,
    selectedItems,
    onToggleItem,
    onToggleAll,
    onUpdateQty,
    onRemove,
    onRemoveSelected,
    onAddMore,
    loading = false,
    updatingQtyItems,
    removingItems,
    removingSelectedItems = false,
    error,
    successMessage,
}: BasketTableProps) {
    const selectedIds = useMemo(
        () => items
            .map((item) => getBasketItemId(item))
            .filter((itemId) => selectedItems.has(itemId)),
        [items, selectedItems]
    );
    const selectedCount = selectedIds.length;
    const allSelected = items.length > 0 && selectedCount === items.length;
    const someSelected = selectedCount > 0 && !allSelected;
    const tableBusy = removingSelectedItems;
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

                        <button
                            type="button"
                            onClick={handleDeleteSelected}
                            disabled={selectedCount === 0 || tableBusy}
                            className={dangerActionClassName}
                        >
                            {removingSelectedItems ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="h-4 w-4" />
                            )}
                            Διαγραφή επιλεγμένων
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
                        <table className="w-full min-w-[900px] divide-y divide-gray-100 text-sm dark:divide-gray-800">
                            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-950">
                                <tr>
                                    <th className="w-12 px-4 py-3 text-left">
                                        <DataTableSelectionCheckbox
                                            ariaLabel="Επιλογή όλων των γραμμών"
                                            checked={allSelected}
                                            indeterminate={someSelected}
                                            onCheckedChange={onToggleAll}
                                            disabled={tableBusy}
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
                                        Είδος
                                    </th>
                                    <th className="w-[170px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
                                        Ποσότητα
                                    </th>
                                    <th className="w-[140px] px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
                                        Τιμή
                                    </th>
                                    <th className="w-[140px] px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
                                        Σύνολο
                                    </th>
                                    <th className="w-[80px] px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
                                        Αφαίρεση
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
}: {
    item: IBasketItem;
    selected: boolean;
    onToggleItem: (uid: string) => void;
    onUpdateQty: (uid: string, qty: number) => void;
    onRemove: (uid: string) => void;
    isUpdatingQty: boolean;
    isRemoving: boolean;
    isTableBusy: boolean;
}) {
    const itemId = getBasketItemId(item);
    const qty = Math.max(1, getBasketItemQty(item));
    const sku = item.ITEM_CODE || item.CODE2 || getBasketItemCode(item) || "—";
    const productName = item.ITEM_DESCR || getBasketItemName(item) || "Χωρίς περιγραφή";
    const [draftQty, setDraftQty] = useState(qty);
    const unitPrice = getBasketItemEffectivePrice(item);
    const rowTotal = getBasketItemLineTotal(item);

    useEffect(() => {
        setDraftQty(qty);
    }, [qty]);

    const commitQty = (nextQty = draftQty) => {
        const normalizedQty = Math.max(1, Math.floor(nextQty));
        setDraftQty(normalizedQty);

        if (normalizedQty !== qty) {
            onUpdateQty(itemId, normalizedQty);
        }
    };

    return (
        <tr className="transition hover:bg-gray-50 dark:hover:bg-white/[0.04]">
            <td className="px-4 py-3 align-middle">
                <DataTableSelectionCheckbox
                    ariaLabel={`Επιλογή ${sku}`}
                    checked={selected}
                    onCheckedChange={() => onToggleItem(itemId)}
                    disabled={isTableBusy}
                />
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
                <QuantityControl
                    value={draftQty}
                    onChange={setDraftQty}
                    min={1}
                    disabled={isUpdatingQty || isRemoving || isTableBusy}
                    onBlur={commitQty}
                    inputLabel="Ποσότητα"
                    decrementLabel="Μείωση ποσότητας"
                    incrementLabel="Αύξηση ποσότητας"
                />

                {isUpdatingQty && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-gray-400">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Ενημέρωση
                    </span>
                )}
            </td>

            <td className="px-4 py-3 text-right align-middle text-sm text-gray-600 dark:text-gray-300">
                {formatPrice(unitPrice)}
            </td>

            <td className="px-4 py-3 text-right align-middle text-sm font-semibold text-gray-800 dark:text-white/90">
                {formatPrice(rowTotal)}
            </td>

            <td className="px-4 py-3 text-right align-middle">
                <button
                    type="button"
                    onClick={() => onRemove(itemId)}
                    disabled={isRemoving || isUpdatingQty || isTableBusy}
                    aria-label="Αφαίρεση γραμμής"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-red-500/40 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                    {isRemoving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Trash2 className="h-4 w-4" />
                    )}
                </button>
            </td>
        </tr>
    );
}
