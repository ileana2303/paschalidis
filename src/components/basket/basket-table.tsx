"use client";

import { KeyboardEvent, useEffect, useMemo, useState } from "react";
import {
    Loader2,
    Minus,
    Plus,
    ShoppingCart,
    Trash2,
    X,
} from "@/app/lib/lucide";
import {
    getBasketItemCode,
    getBasketItemEffectivePrice,
    getBasketItemId,
    getBasketItemLineTotal,
    getBasketItemName,
    getBasketItemQty,
} from "@/app/lib/basket";
import { IBasketItem } from "@/app/lib/interface";

interface BasketTableProps {
    items: IBasketItem[];
    selectedItems: Set<string>;
    onToggleItem: (uid: string) => void;
    onToggleAll: () => void;
    onUpdateQty: (uid: string, qty: number) => void;
    onRemove: (uid: string) => void;
    onRemoveSelected: (ids: string[]) => void;
    onClearAll: () => void;
    onAddMore: () => void;
    loading?: boolean;
    updatingQtyItems?: Set<string>;
    removingItems?: Set<string>;
    removingSelectedItems?: boolean;
    clearingAll?: boolean;
    error?: string;
    successMessage?: string;
}

const formatPrice = (price: number | null) => {
    if (price == null || !Number.isFinite(price)) {
        return "--";
    }

    return `${price.toFixed(2)} €`;
};

export default function BasketTable({
    items,
    selectedItems,
    onToggleItem,
    onToggleAll,
    onUpdateQty,
    onRemove,
    onRemoveSelected,
    onClearAll,
    onAddMore,
    loading = false,
    updatingQtyItems,
    removingItems,
    removingSelectedItems = false,
    clearingAll = false,
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
    const tableBusy = removingSelectedItems || clearingAll;
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
        <section className="flex min-h-0 w-full flex-col rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] xl:min-w-0 xl:basis-2/3">
            <div className="flex shrink-0 flex-col gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
                        Basket Table
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-gray-800 dark:text-white/90">
                        Products {items.length > 0 ? `(${items.length})` : ""}
                    </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={onAddMore}
                        className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
                    >
                        <Plus className="h-4 w-4" />
                        + Add products
                    </button>

                    <button
                        type="button"
                        onClick={handleDeleteSelected}
                        disabled={selectedCount === 0 || tableBusy}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300 dark:border-red-500/35 dark:bg-gray-900/40 dark:text-red-400 dark:hover:bg-red-500/10 dark:disabled:border-gray-700 dark:disabled:text-gray-600"
                    >
                        {removingSelectedItems ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Trash2 className="h-4 w-4" />
                        )}
                        Delete selected
                    </button>

                    <button
                        type="button"
                        onClick={onClearAll}
                        disabled={items.length === 0 || tableBusy}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300 dark:hover:border-red-500/40 dark:hover:text-red-400"
                    >
                        {clearingAll ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <X className="h-4 w-4" />
                        )}
                        Clear basket
                    </button>
                </div>
            </div>

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
                <div className="flex flex-1 items-center justify-center px-6 py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
                </div>
            ) : items.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                    <div className="rounded-full bg-gray-100 p-3 text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                        <ShoppingCart className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-gray-800 dark:text-white/90">
                        Basket is empty
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Add products to start building a customer order.
                    </p>
                    <button
                        type="button"
                        onClick={onAddMore}
                        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
                    >
                        <Plus className="h-4 w-4" />
                        + Add products
                    </button>
                </div>
            ) : (
                <>
                    <div className="min-h-0 flex-1 overflow-auto">
                        <table className="min-w-[900px] w-full divide-y divide-gray-100 dark:divide-gray-800">
                            <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur dark:bg-gray-900/95">
                                <tr>
                                    <th className="w-12 px-4 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            aria-label="Select all rows"
                                            checked={allSelected}
                                            onChange={onToggleAll}
                                            disabled={tableBusy}
                                            className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/60 dark:border-gray-700"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                                        Product
                                    </th>
                                    <th className="w-[170px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                                        Quantity
                                    </th>
                                    <th className="w-[140px] px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                                        Unit Price
                                    </th>
                                    <th className="w-[140px] px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                                        Total
                                    </th>
                                    <th className="w-[80px] px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                                        Remove
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
                        <div className="text-gray-500 dark:text-gray-400">
                            {selectedCount} selected
                        </div>
                        <div className="text-gray-700 dark:text-gray-200">
                            Basket total: <span className="font-semibold">{formatPrice(grandTotal)}</span>
                        </div>
                    </div>
                </>
            )}
        </section>
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
    const productName = item.ITEM_DESCR || getBasketItemName(item) || "Unnamed product";
    const [qtyInput, setQtyInput] = useState(String(qty));

    useEffect(() => {
        setQtyInput(String(qty));
    }, [qty]);

    const commitQty = () => {
        const parsed = Number.parseInt(qtyInput, 10);
        const nextQty = Number.isFinite(parsed) ? Math.max(1, parsed) : qty;
        setQtyInput(String(nextQty));

        if (nextQty !== qty) {
            onUpdateQty(itemId, nextQty);
        }
    };

    const handleQtyKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            event.preventDefault();
            commitQty();
            return;
        }

        if (event.key === "Escape") {
            setQtyInput(String(qty));
            return;
        }
    };

    const unitPrice = getBasketItemEffectivePrice(item);
    const rowTotal = getBasketItemLineTotal(item);

    return (
        <tr className="transition hover:bg-gray-50/70 dark:hover:bg-gray-900/40">
            <td className="px-4 py-3 align-middle">
                <input
                    type="checkbox"
                    aria-label={`Select ${sku}`}
                    checked={selected}
                    onChange={() => onToggleItem(itemId)}
                    disabled={isTableBusy}
                    className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/60 dark:border-gray-700"
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
                <div className="inline-flex items-center overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900/40">
                    <button
                        type="button"
                        onClick={() => onUpdateQty(itemId, qty - 1)}
                        disabled={qty <= 1 || isUpdatingQty || isRemoving || isTableBusy}
                        aria-label="Decrease quantity"
                        className="flex h-9 w-9 items-center justify-center text-gray-500 transition hover:bg-brand-50 hover:text-brand-600 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent dark:text-gray-300 dark:hover:bg-brand-500/10 dark:hover:text-brand-300 dark:disabled:text-gray-600"
                    >
                        <Minus className="h-4 w-4" />
                    </button>

                    <input
                        value={qtyInput}
                        onChange={(event) => {
                            const digitsOnly = event.target.value.replace(/\D/g, "");
                            setQtyInput(digitsOnly);
                        }}
                        onBlur={commitQty}
                        onKeyDown={handleQtyKeyDown}
                        inputMode="numeric"
                        aria-label="Quantity"
                        disabled={isUpdatingQty || isRemoving || isTableBusy}
                        className="h-9 w-14 border-x border-gray-200 bg-gray-50 text-center text-sm font-semibold text-gray-800 outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-800/70 dark:text-white dark:focus:bg-gray-900"
                    />

                    <button
                        type="button"
                        onClick={() => onUpdateQty(itemId, qty + 1)}
                        disabled={isUpdatingQty || isRemoving || isTableBusy}
                        aria-label="Increase quantity"
                        className="flex h-9 w-9 items-center justify-center text-gray-500 transition hover:bg-brand-50 hover:text-brand-600 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent dark:text-gray-300 dark:hover:bg-brand-500/10 dark:hover:text-brand-300 dark:disabled:text-gray-600"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                </div>

                {isUpdatingQty && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-gray-400">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Updating
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
                    aria-label="Remove row"
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
