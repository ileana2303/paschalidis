"use client";

import {
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

const quantityOptions = Array.from({ length: 100 }, (_, index) => index + 1);

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
    onRemoveSelectedItems?: () => void;
    removingSelectedItems?: boolean;
    onChangeQuantity?: (uid: string, quantity: number) => void;
    updatingItems?: Set<string>;
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
    summaryLabel = "Σύνοψη Ενδοδιακίνησης Καταστήματος",
    summaryTitle = "Εξερχόμενα Αιτήματα Ενδοδιακίνησης",
    branchCardLabel = "ΚΑΤΑΣΤΗΜΑ ΠΑΡΑΛΑΒΗΣ",
    linesLabel = "Γραμμές Καλαθιού",
    sendButtonLabel = "Αποστολή Ενδοπαραγγελίας",
    emptyStateLabel = "Το καλάθι είναι κενό",
    onToggleItem,
    onRemoveItem,
    onRemoveSelectedItems,
    removingSelectedItems = false,
    onChangeQuantity,
    updatingItems,
    onSendOrder,
    onClearSelection,
    clearButtonLabel = "Καθαρισμός",
    collapsible = false,
    collapsed = false,
    onToggleCollapse,
}: EndoOrderSummaryProps) {
    const selectedSet = selectedItems ?? new Set(basketItems.map((item) => item.uid));
    const selectedBasketItems =
        selectedItems != null
            ? basketItems.filter((item) => selectedSet.has(item.uid))
            : basketItems;
    const totalQty = selectedBasketItems.reduce((sum, item) => sum + item.qty, 0);
    const sendDisabled = sendingOrder || selectedBasketItems.length === 0;
    const canToggleItems = selectedItems != null && onToggleItem != null;
    const canToggleAllBasketItems = canToggleItems && basketItems.length > 0;
    const areAllBasketItemsSelected =
        canToggleAllBasketItems &&
        basketItems.every((item) => selectedSet.has(item.uid));
    const canRemoveSelectedItems =
        onRemoveSelectedItems != null && selectedBasketItems.length > 0;

    const handleToggleAllBasketItems = () => {
        if (selectedItems == null || onToggleItem == null || basketItems.length === 0) {
            return;
        }

        basketItems.forEach((item) => {
            const isSelected = selectedItems.has(item.uid);

            if (areAllBasketItemsSelected ? isSelected : !isSelected) {
                onToggleItem(item.uid);
            }
        });
    };

    return (
        <SummaryPanel
            label={summaryLabel}
            title={summaryTitle}
            collapsible={collapsible}
            collapsed={collapsed}
            href="/endo/endo-lists-requested"
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
                description={` ${currentBranchCode || "—"}`}
            />

            <SummaryMetricGrid
                metrics={[
                    {
                        id: "lines",
                        label: "Γραμμές",
                        value: selectedBasketItems.length,
                        trailingValue:
                            selectedItems != null
                                ? ` / ${basketItems.length}`
                                : undefined,
                    },
                    {
                        id: "qty",
                        label: "Τεμάχια",
                        value: totalQty,
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

                        <div className="flex items-center gap-2">
                            {canToggleAllBasketItems && (
                                <button
                                    type="button"
                                    onClick={handleToggleAllBasketItems}
                                    className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
                                >
                                    {areAllBasketItemsSelected ? "Αποεπιλογή όλων" : "Επιλογή όλων"}
                                </button>
                            )}

                            {canRemoveSelectedItems && (
                                <button
                                    type="button"
                                    onClick={onRemoveSelectedItems}
                                    disabled={removingSelectedItems}
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

                            {basketItems.length > 0 && (
                                <span className="text-xs text-gray-400">
                                    {basketItems.length} {basketItems.length === 1 ? "γραμμή" : "γραμμές"}
                                </span>
                            )}
                        </div>
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
                                const isUpdatingQuantity =
                                    updatingItems?.has(item.uid) ?? false;
                                const canChangeQuantity =
                                    onChangeQuantity != null &&
                                    item.basketIds.length === 1;

                                return (
                                    <article
                                        key={item.uid}
                                        className={[
                                            "group rounded-2xl border bg-white p-3.5 shadow-xs transition-all dark:bg-gray-900/50",
                                            isSelected
                                                ? "border-gray-200 hover:border-brand-200 hover:shadow-sm dark:border-gray-800 dark:hover:border-brand-500/30"
                                                : "border-gray-200 opacity-60 dark:border-gray-800",
                                        ].join(" ")}
                                    >
                                        <div className="flex items-start gap-3">
                                            {canToggleItems && onToggleItem ? (
                                                <DataTableSelectionCheckbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => onToggleItem(item.uid)}
                                                    ariaLabel={isSelected ? "Αποεπιλογή" : "Επιλογή"}
                                                    className="mt-1"
                                                />
                                            ) : (
                                                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-500/70 ring-4 ring-brand-500/10" />
                                            )}

                                            <div className="min-w-0 flex-1">
                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
                                                            {item.itemCode || String(item.mtrl)}
                                                        </p>

                                                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                                                            {item.itemDescr || "—"} 

                                                            {item.manufacturer && (
                                                                <>
                                                                    <span className="mx-1.5 text-gray-500 dark:text-gray-600">•</span>
                                                                    <span className="font-medium text-gray-500 dark:text-gray-300">
                                                                        {item.manufacturer}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </p>

                                                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                            <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-400">
                                                                MTRL:&nbsp;
                                                                <span className="font-semibold tabular-nums text-gray-700 dark:text-white/90">
                                                                    {item.mtrl || "—"}
                                                                </span>
                                                            </span>

                                                            <span className="inline-flex max-w-[260px] items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-400">
                                                                Basket ID:&nbsp;
                                                                <span className="truncate font-semibold tabular-nums text-gray-700 dark:text-white/90">
                                                                    {item.basketIds.join(", ") || "-"}
                                                                </span>
                                                            </span>

                                                        </div>
                                                    </div>

                                                    <div className="flex shrink-0 items-end gap-2 sm:justify-end">
                                                        <div className="w-20">
                                                            <label
                                                                htmlFor={`endo-basket-qty-${item.uid}`}
                                                                className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400"
                                                            >
                                                                Ποσότητα
                                                            </label>

                                                            <select
                                                                id={`endo-basket-qty-${item.uid}`}
                                                                value={Number.isFinite(item.qty) ? item.qty : 1}
                                                                onChange={(event) =>
                                                                    onChangeQuantity?.(
                                                                        item.uid,
                                                                        Number(event.target.value)
                                                                    )
                                                                }
                                                                disabled={
                                                                    !canChangeQuantity ||
                                                                    isUpdatingQuantity ||
                                                                    removingSelectedItems
                                                                }
                                                                title={
                                                                    item.basketIds.length > 1
                                                                        ? "Η γραμμή πρέπει να αντιστοιχεί σε ένα BASKETID για ενημέρωση ποσότητας."
                                                                        : undefined
                                                                }
                                                                className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm font-semibold tabular-nums text-gray-800 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-500/40 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
                                                            >
                                                                {quantityOptions.map((quantity) => (
                                                                    <option key={quantity} value={quantity}>
                                                                        {quantity}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        {onRemoveItem && (
                                                            <button
                                                                type="button"
                                                                onClick={() => onRemoveItem(item.uid)}
                                                                disabled={removingSelectedItems}
                                                                aria-label="Αφαίρεση"
                                                                className="mb-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                                                            >
                                                                {removingSelectedItems ? (
                                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                ) : (
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-gray-800 dark:bg-white/[0.03]">
                                                    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                                                                Αίτημα από
                                                            </p>
                                                            <p className="mt-1 truncate text-sm font-semibold text-gray-700 dark:text-white/90">
                                                                {item.fromBranch || "-"}
                                                            </p>
                                                        </div>

                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-200 bg-white text-brand-600 shadow-xs dark:border-brand-500/30 dark:bg-gray-900 dark:text-brand-300">
                                                            <span className="text-sm font-bold">→</span>
                                                        </div>

                                                        <div className="min-w-0 text-right">
                                                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                                                                Προς
                                                            </p>
                                                            <p className="mt-1 truncate text-sm font-semibold text-gray-700 dark:text-white/90">
                                                                {item.toBranch || "-"}
                                                            </p>
                                                        </div>
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
            )}
        </SummaryPanel>
    );
}
