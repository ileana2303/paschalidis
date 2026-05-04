"use client";

import { useState } from "react";
import {
    Check,
    Circle,
    Loader2,
    Send,
    ShoppingCart,
    Trash2,
} from "@/lib/icons/lucide";
import { OrderSummary as OrderSummaryPanel } from "@/components/order-summary/order-summary";

export interface EndoBasketUiItem {
    uid: string;
    basketIds: string[];
    mtrl: number;
    qty: number;
    fromBranch: string;
    toBranch: string;
    itemCode: string;
    itemDescr: string;
    manufacturer?: string;
}

interface EndoOrderSummaryProps {
    currentBranchCode: string;
    currentBranchName: string;
    basketItems: EndoBasketUiItem[];
    selectedItems?: Set<string>;
    loading: boolean;
    error: string;
    successMessage: string;
    sendingOrder?: boolean;
    summaryLabel?: string;
    summaryTitle?: string;
    branchCardLabel?: string;
    linesLabel?: string;
    sendButtonLabel?: string;
    emptyStateLabel?: string;
    onToggleItem?: (uid: string) => void;
    onRemoveItem?: (uid: string) => void;
    onSendOrder?: () => void;
    onClearSelection?: () => void;
    clearButtonLabel?: string;
    collapsible?: boolean;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

export default function EndoOrderSummary({
    currentBranchCode,
    currentBranchName,
    basketItems,
    selectedItems,
    loading,
    error,
    successMessage,
    sendingOrder = false,
    summaryLabel = "Σύνοψη Ενδοδιακίνησης",
    summaryTitle = "Καλάθι Ενδοπαραγγελίας",
    branchCardLabel = "Κατάστημα Παραλαβής",
    linesLabel = "Γραμμές Καλαθιού",
    sendButtonLabel = "Αποστολή Ενδοπαραγγελίας",
    emptyStateLabel = "Το καλάθι είναι κενό",
    onToggleItem,
    onRemoveItem,
    onSendOrder,
    onClearSelection,
    clearButtonLabel = "Καθαρισμός",
    collapsible = false,
    collapsed = false,
    onToggleCollapse,
}: EndoOrderSummaryProps) {
    const isSelectable = Boolean(onToggleItem);
    const isRemovable = Boolean(onRemoveItem);
    const selectedSet = selectedItems ?? new Set(basketItems.map((item) => item.uid));
    const selectedLines = isSelectable
        ? basketItems.filter((item) => selectedSet.has(item.uid))
        : basketItems;
    const selectedQty = selectedLines.reduce((sum, item) => sum + item.qty, 0);

    return (
        <OrderSummaryPanel
            summaryLabel={summaryLabel}
            summaryTitle={summaryTitle}
            infoCard={{
                label: branchCardLabel,
                title: currentBranchName || "—",
                description: `Κωδικός: ${currentBranchCode || "—"}`,
            }}
            metrics={[
                {
                    id: "lines",
                    label: "Γραμμές",
                    value: selectedLines.length,
                    trailingValue: isSelectable ? ` / ${basketItems.length}` : undefined,
                },
                {
                    id: "qty",
                    label: "Τεμάχια",
                    value: selectedQty,
                },
            ]}
            error={error}
            successMessage={successMessage}
            loading={loading}
            collapsible={collapsible}
            collapsed={collapsed}
            onToggleCollapse={onToggleCollapse}
            collapseTitle="Απόκρυψη καλαθιού"
            footer={
                onSendOrder ? (
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onSendOrder}
                            disabled={sendingOrder || selectedLines.length === 0}
                            className={`flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300 ${
                                onClearSelection ? "flex-1" : "w-full"
                            }`}
                        >
                            {sendingOrder ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                            {sendButtonLabel}
                        </button>

                        {onClearSelection && (
                            <button
                                type="button"
                                onClick={onClearSelection}
                                disabled={sendingOrder || selectedLines.length === 0}
                                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-3 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                                {clearButtonLabel}
                            </button>
                        )}
                    </div>
                ) : undefined
            }
        >
            {!loading && (
                <div className="mt-5">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                            {linesLabel}
                        </p>
                        {basketItems.length > 0 && (
                            <span className="text-xs text-gray-400">
                                {basketItems.length}{" "}
                                {basketItems.length === 1 ? "γραμμή" : "γραμμές"}
                            </span>
                        )}
                    </div>

                    {basketItems.length === 0 ? (
                        <div className="mt-4 rounded-2xl border border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
                            <ShoppingCart className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
                            <p className="mt-3 text-sm text-gray-400">{emptyStateLabel}</p>
                        </div>
                    ) : (
                        <div className="mt-4 space-y-3">
                            {basketItems.map((item) => (
                                <EndoBasketLineItem
                                    key={item.uid}
                                    item={item}
                                    isSelected={selectedSet.has(item.uid)}
                                    isSelectable={isSelectable}
                                    isRemovable={isRemovable}
                                    onToggle={onToggleItem}
                                    onRemove={onRemoveItem}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </OrderSummaryPanel>
    );
}

function EndoBasketLineItem({
    item,
    isSelected,
    isSelectable,
    isRemovable,
    onToggle,
    onRemove,
}: {
    item: EndoBasketUiItem;
    isSelected: boolean;
    isSelectable: boolean;
    isRemovable: boolean;
    onToggle?: (uid: string) => void;
    onRemove?: (uid: string) => void;
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div
            className={`group rounded-xl border p-3 transition-all ${
                isSelected
                    ? "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40"
                    : "border-gray-200 bg-gray-50/50 opacity-60 dark:border-gray-800 dark:bg-gray-900/40"
            }`}
        >
            <div className="flex items-start gap-2">
                {isSelectable && onToggle ? (
                    <button
                        type="button"
                        onClick={() => onToggle(item.uid)}
                        aria-label={isSelected ? "Αποεπιλογή" : "Επιλογή"}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                            isSelected
                                ? "border-brand-500 bg-brand-500 text-white"
                                : "border-gray-300 text-transparent hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500"
                        }`}
                    >
                        {isSelected ? (
                            <Check className="h-3 w-3" />
                        ) : (
                            <Circle className="h-3 w-3" />
                        )}
                    </button>
                ) : (
                    <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-brand-500/70" />
                )}

                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-700 dark:text-white/90">
                        {item.itemCode || String(item.mtrl)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{item.itemDescr || "—"}</p>
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span>
                            ΠΟΣΟΤΗΤΑ:{" "}
                            <span className="font-medium text-gray-700 dark:text-white/90">
                                {item.qty}
                            </span>
                        </span>
                        <span>
                            MTRL:{" "}
                            <span className="font-medium text-gray-700 dark:text-white/90">
                                {item.mtrl}
                            </span>
                        </span>
                        <span>
                            ΑΠΟ:{" "}
                            <span className="font-medium text-gray-700 dark:text-white/90">
                                {item.fromBranch}
                            </span>
                        </span>
                        <span>
                            ΠΡΟΣ:{" "}
                            <span className="font-medium text-gray-700 dark:text-white/90">
                                {item.toBranch}
                            </span>
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsExpanded((prev) => !prev)}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    >
                        {isExpanded ? "Απόκρυψη στοιχείων" : "Περισσότερα στοιχεία"}
                    </button>

                    {isExpanded && (
                        <div className="mt-2 grid grid-cols-1 gap-2 rounded-lg border border-gray-200 bg-white/70 p-3 dark:border-gray-800 dark:bg-gray-900/60">
                            <p className="text-xs text-gray-700 dark:text-gray-200">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                                    BASKET IDS:
                                </span>{" "}
                                {item.basketIds.join(", ") || "-"}
                            </p>
                            {item.manufacturer && (
                                <p className="text-xs text-gray-700 dark:text-gray-200">
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                                        Μάρκα:
                                    </span>{" "}
                                    {item.manufacturer}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {isRemovable && onRemove && (
                    <button
                        type="button"
                        onClick={() => onRemove(item.uid)}
                        aria-label="Αφαίρεση"
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                )}
            </div>
        </div>
    );
}
