"use client";

import {
    Loader2,
    Send,
    ShoppingCart,
} from "@/lib/icons/lucide";
import SummaryPanel, {
    SummaryPanelMessage,
} from "@/components/ui/summary-panel/summary-panel";
import SummaryInfoCard from "@/components/ui/summary-panel/summary-info-card";
import SummaryMetricGrid from "@/components/ui/summary-panel/summary-metric-grid";
import SummaryPrimaryAction from "@/components/ui/summary-panel/summary-primary-action";

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
    onSendOrder,
    onClearSelection,
    clearButtonLabel = "Καθαρισμός",
    collapsible = false,
    collapsed = false,
    onToggleCollapse,
}: EndoOrderSummaryProps) {
    const totalQty = basketItems.reduce((sum, item) => sum + item.qty, 0);
    const sendDisabled = sendingOrder || basketItems.length === 0;

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
                description={` ${currentBranchCode || "—"}`}
            />

            <SummaryMetricGrid
                metrics={[
                    {
                        id: "lines",
                        label: "Γραμμές",
                        value: basketItems.length,
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
                                return (
                                    <article
                                        key={item.uid}
                                        className="group rounded-2xl border border-gray-200 bg-white p-3.5 shadow-xs transition-all hover:border-brand-200 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-brand-500/30"
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-500/70 ring-4 ring-brand-500/10" /> */}

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
                                                            {item.itemCode || String(item.mtrl)}
                                                        </p>

                                                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                                                            {item.itemDescr || "—"}
                                                        </p>
                                                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                                                            MTRL: {item.mtrl || "—"}
                                                        </p>
                                                    </div>

                                                    <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
                                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
                                                            <span className="text-[10px] uppercase tracking-[0.14em] opacity-75">
                                                                QTY
                                                            </span>
                                                            <span>{item.qty}</span>
                                                        </span>

                                                        <span className="inline-flex max-w-[220px] items-center gap-1.5 truncate rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300">
                                                            <span className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                                                                Basket
                                                            </span>
                                                            <span className="truncate tabular-nums">
                                                                {item.basketIds.join(", ") || "-"}
                                                            </span>
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Branch transfer visualization */}
                                                <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-gray-800 dark:bg-white/[0.03]">
                                                    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                                                                ΠΡΟΣ:
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
                                                                ΑΠΟ:
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
