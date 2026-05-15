"use client";

import { useState } from "react";
import {
    ChevronDown,
    Loader2,
    Send,
    ShoppingCart,
    Trash2,
} from "@/lib/icons/lucide";
import SummaryPanel, {
    SummaryPanelMessage,
} from "@/components/ui/summary-panel/summary-panel";
import SummaryInfoCard from "@/components/ui/summary-panel/summary-info-card";
import SummaryMetricGrid from "@/components/ui/summary-panel/summary-metric-grid";
import SummaryPrimaryAction from "@/components/ui/summary-panel/summary-primary-action";
import DataTableSelectionCheckbox from "@/components/ui/data-table/data-table-selection-checkbox";

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
    const sendDisabled = sendingOrder || selectedLines.length === 0;
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

    const toggleExpandedItem = (uid: string) => {
        setExpandedItems((prev) => {
            const next = new Set(prev);

            if (next.has(uid)) {
                next.delete(uid);
            } else {
                next.add(uid);
            }

            return next;
        });
    };

    return (
        <SummaryPanel
            label={summaryLabel}
            title={summaryTitle}
            collapsible={collapsible}
            collapsed={collapsed}
            onToggleCollapse={onToggleCollapse}
            collapseTitle="Απόκρυψη καλαθιού"
            footer={
                onSendOrder ? (
                    <div className="flex gap-2">
                        <SummaryPrimaryAction
                            label={sendButtonLabel}
                            loading={sendingOrder}
                            disabled={sendDisabled}
                            icon={<Send className="h-4 w-4" />}
                            onClick={onSendOrder}
                            fullWidth={!onClearSelection}
                            className={onClearSelection ? "flex-1" : ""}
                        />

                        {onClearSelection && (
                            <button
                                type="button"
                                onClick={onClearSelection}
                                disabled={sendDisabled}
                                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-3 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                                {clearButtonLabel}
                            </button>
                        )}
                    </div>
                ) : undefined
            }
        >
            <SummaryInfoCard
                label={branchCardLabel}
                title={currentBranchName || "—"}
                description={`Κωδικός: ${currentBranchCode || "—"}`}
            />

            <SummaryMetricGrid
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
                        tone: "brand",
                    },
                ]}
            />

            {error && <SummaryPanelMessage tone="error">{error}</SummaryPanelMessage>}
            {successMessage && (
                <SummaryPanelMessage tone="success">
                    {successMessage}
                </SummaryPanelMessage>
            )}
            {loading && (
                <div className="mt-5 flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
                </div>
            )}

            {!loading && (
                <section className="mt-5">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                            {linesLabel}
                        </p>
                        {basketItems.length > 0 && (
                            <span className="text-xs text-gray-400">
                                {basketItems.length} {basketItems.length === 1 ? "γραμμή" : "γραμμές"}
                            </span>
                        )}
                    </div>

                    {basketItems.length === 0 ? (
                        <div className="mt-4 rounded-2xl border border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
                            <div className="mx-auto flex h-8 w-8 items-center justify-center text-gray-300 dark:text-gray-600">
                                <ShoppingCart className="h-8 w-8" />
                            </div>
                            <p className="mt-3 text-sm text-gray-400">{emptyStateLabel}</p>
                        </div>
                    ) : (
                        <div className="mt-4 space-y-3">
                            {basketItems.map((item) => {
                                const isSelected = selectedSet.has(item.uid);
                                const isExpanded = expandedItems.has(item.uid);

                                return (
                                    <article
                                        key={item.uid}
                                        className={[
                                            "group rounded-xl border p-3 transition-all",
                                            isSelected
                                                ? "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40"
                                                : "border-gray-200 bg-gray-50/50 opacity-60 dark:border-gray-800 dark:bg-gray-900/40",
                                        ].join(" ")}
                                    >
                                        <div className="flex items-start gap-2">
                                            {isSelectable && onToggleItem ? (
                                                <DataTableSelectionCheckbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => onToggleItem(item.uid)}
                                                    ariaLabel={isSelected ? "Αποεπιλογή" : "Επιλογή"}
                                                    className="mt-0.5"
                                                />
                                            ) : (
                                                <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-brand-500/70" />
                                            )}

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium text-gray-700 dark:text-white/90">
                                                            {item.itemCode || String(item.mtrl)}
                                                        </p>
                                                        <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                                                            {item.itemDescr || "—"}
                                                        </p>
                                                    </div>

                                                    {isRemovable && onRemoveItem && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onRemoveItem(item.uid)}
                                                            aria-label="Αφαίρεση"
                                                            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="mt-3">
                                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-semibold tabular-nums text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
                                                        <span className="text-[10px] uppercase tracking-[0.14em] opacity-75">
                                                            ΠΟΣΟΤΗΤΑ:
                                                        </span>
                                                        <span>{item.qty}</span>
                                                    </span>
                                                </div>

                                                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-500">
                                                    <span className="min-w-0">
                                                        MTRL:{" "}
                                                        <span className="font-medium text-gray-700 dark:text-white/90">
                                                            {item.mtrl}
                                                        </span>
                                                    </span>
                                                    <span className="min-w-0">
                                                        ΑΠΟ:{" "}
                                                        <span className="font-medium text-gray-700 dark:text-white/90">
                                                            {item.fromBranch}
                                                        </span>
                                                    </span>
                                                    <span className="min-w-0">
                                                        ΠΡΟΣ:{" "}
                                                        <span className="font-medium text-gray-700 dark:text-white/90">
                                                            {item.toBranch}
                                                        </span>
                                                    </span>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => toggleExpandedItem(item.uid)}
                                                    aria-expanded={isExpanded}
                                                    className="mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                                                >
                                                    {isExpanded ? "Απόκρυψη στοιχείων" : "Περισσότερα στοιχεία"}
                                                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
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
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            )}
        </SummaryPanel>
    );
}
