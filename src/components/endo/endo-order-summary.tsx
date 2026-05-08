"use client";

import { useState } from "react";
import {
    Check,
    ChevronDown,
    Circle,
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
import BasketList from "@/components/ui/basket-list/basket-list";
import BasketListItem from "@/components/ui/basket-list/basket-list-item";

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
                <BasketList
                    title={linesLabel}
                    count={basketItems.length}
                    countLabel={`${basketItems.length} ${basketItems.length === 1 ? "γραμμή" : "γραμμές"}`}
                    emptyTitle={emptyStateLabel}
                    emptyIcon={<ShoppingCart className="h-8 w-8" />}
                >
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
                </BasketList>
            )}
        </SummaryPanel>
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
        <BasketListItem
            title={item.itemCode || String(item.mtrl)}
            subtitle={item.itemDescr || "—"}
            selected={isSelected}
            quantity={item.qty}
            leading={
                isSelectable && onToggle ? (
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
                )
            }
            actions={
                isRemovable && onRemove ? (
                    <button
                        type="button"
                        onClick={() => onRemove(item.uid)}
                        aria-label="Αφαίρεση"
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                ) : undefined
            }
            meta={[
                { label: "MTRL", value: item.mtrl },
                { label: "ΑΠΟ", value: item.fromBranch },
                { label: "ΠΡΟΣ", value: item.toBranch },
            ]}
        >
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
        </BasketListItem>
    );
}
