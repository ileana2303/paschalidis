"use client";

import {
    Check,
    Loader2,
    RefreshCw,
    Send,
    StickyNote,
    Trash2,
} from "@/lib/icons/lucide";
import SummaryPanel from "@/components/ui/summary-panel/summary-panel";
import SummaryInfoCard from "@/components/ui/summary-panel/summary-info-card";
import SummaryMetricGrid from "@/components/ui/summary-panel/summary-metric-grid";
import SummaryPrimaryAction from "@/components/ui/summary-panel/summary-primary-action";
import SummaryTextareaField from "@/components/ui/summary-panel/summary-textarea-field";
import StockBasketLine from "@/components/stock/stock-basket-line";
import type { IStockRequestListRow } from "@/lib/interface";

export interface StockOrderSummaryProps {
    rows: IStockRequestListRow[];
    requestedQtyTotal: number;
    branchLabel: string;
    title?: string;
    basketTitle?: string;
    emptyMessage?: string;
    error?: string;
    showRequestDetails?: boolean;
    onChangeQuantity?: (row: IStockRequestListRow, quantity: number) => void;
    updatingBasketIds?: Set<string>;
    selectedBasketIds?: Set<string>;
    removingBasketIds?: Set<string>;
    removingSelectedLines?: boolean;
    onToggleLineSelection?: (basketId: string) => void;
    onRemoveLine?: (row: IStockRequestListRow) => void;
    onRemoveSelectedLines?: () => void;
    getRequestedQty: (row: IStockRequestListRow) => string;
    formatDateTime: (value?: string) => string;
    loading: boolean;
    onRefresh: () => void;
    sendingOrder?: boolean;
    onSendOrder?: () => void;
    notes?: string;
    onNotesChange?: (value: string) => void;
    collapsible?: boolean;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

export default function StockOrderSummary({
    rows,
    requestedQtyTotal,
    branchLabel,
    title = "Αποστολή Ανατροφοδοσίας S1",
    basketTitle = "Καλάθι Ανατροφοδοσίας",
    emptyMessage = "Εδώ θα εμφανιστούν τα αιτήματα ανατροφοδοσίας που αποδέχεστε και μπορείτε να στείλετε στο SoftOne.",
    error = "",
    showRequestDetails = false,
    onChangeQuantity,
    updatingBasketIds,
    selectedBasketIds,
    removingBasketIds,
    removingSelectedLines = false,
    onToggleLineSelection,
    onRemoveLine,
    onRemoveSelectedLines,
    getRequestedQty,
    formatDateTime,
    loading,
    onRefresh,
    sendingOrder = false,
    onSendOrder,
    notes = "",
    onNotesChange,
    collapsible = false,
    collapsed = false,
    onToggleCollapse,
}: StockOrderSummaryProps) {
    const allLinesSelected =
        rows.length > 0 &&
        selectedBasketIds != null &&
        rows.every((row) => selectedBasketIds.has(row.BASKETID));
    const selectedLineCount = selectedBasketIds
        ? rows.filter((row) => selectedBasketIds.has(row.BASKETID)).length
        : rows.length;
    const hasPartialSelection =
        selectedBasketIds != null && selectedLineCount !== rows.length;
    const sendDisabled = sendingOrder || rows.length === 0;

    const handleToggleAllLines = () => {
        if (!selectedBasketIds || !onToggleLineSelection) return;

        rows.forEach((row) => {
            const selected = selectedBasketIds.has(row.BASKETID);
            if (allLinesSelected ? selected : !selected) {
                onToggleLineSelection(row.BASKETID);
            }
        });
    };

    return (
        <SummaryPanel
            label="Σύνοψη Αιτημάτων Ανατροφοδοσίας"
            title={title}
            asideClassName={collapsed
                ? "xl:!basis-auto xl:!min-w-0"
                : "xl:!basis-[25%] xl:!min-w-[272px] xl:max-h-full xl:min-h-0 xl:self-stretch"}
            fitContentWhenStacked
            collapsible={collapsible}
            collapsed={collapsed}
            onToggleCollapse={onToggleCollapse}
            collapseTitle="Απόκρυψη καλαθιού"
            error={error}
            actions={
                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={loading}
                    title="Ανανέωση"
                    aria-label="Ανανέωση ανατροφοδοσίας"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </button>
            }
            footer={
                onSendOrder ? (
                    <SummaryPrimaryAction
                        label="Αποστολή Ανατροφοδοσίας"
                        loading={sendingOrder}
                        disabled={sendDisabled}
                        icon={<Send className="h-4 w-4" />}
                        onClick={onSendOrder}
                    />
                ) : undefined
            }
        >
            <SummaryInfoCard
                label="ΑΝΑΤΡΟΦΟΔΟΣΙΑ ΓΙΑ ΚΑΤΑΣΤΗΜΑ:"
                title={branchLabel || "—"}
            />

            <SummaryMetricGrid
                metrics={[
                    {
                        id: "lines",
                        label: "Γραμμές",
                        value: selectedLineCount,
                        trailingValue: hasPartialSelection
                            ? `/ ${rows.length}`
                            : undefined,
                    },
                    {
                        id: "qty",
                        label: "Ποσότητα",
                        value: requestedQtyTotal,
                        tone: "brand",
                    },
                ]}
            />

            <section className="mt-5">
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                        {basketTitle}
                    </p>
                    <div className="flex max-w-full flex-wrap items-center gap-2">
                        {selectedBasketIds &&
                            onToggleLineSelection &&
                            rows.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleToggleAllLines}
                                    className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
                                >
                                    {allLinesSelected
                                        ? "Αποεπιλογή όλων"
                                        : "Επιλογή όλων"}
                                </button>
                            )}

                        {onRemoveSelectedLines &&
                            rows.length > 0 && (
                                <button
                                    type="button"
                                    onClick={onRemoveSelectedLines}
                                    disabled={
                                        !selectedBasketIds?.size ||
                                        removingSelectedLines
                                    }
                                    title="Διαγραφή επιλεγμένων"
                                    aria-label="Διαγραφή επιλεγμένων γραμμών"
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-200 bg-white text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300 dark:border-red-500/30 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-500/10 dark:disabled:border-gray-700 dark:disabled:text-gray-600"
                                >
                                    {removingSelectedLines ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                </button>
                            )}

                        {rows.length > 0 && (
                            <span className="text-xs text-gray-400">
                                {hasPartialSelection
                                    ? `${selectedLineCount} / ${rows.length} γραμμές`
                                    : `${rows.length} ${rows.length === 1 ? "γραμμή" : "γραμμές"}`}
                            </span>
                        )}
                    </div>
                </div>

                {rows.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
                        <div className="mx-auto flex h-8 w-8 items-center justify-center text-gray-300 dark:text-gray-600">
                            <Check className="h-8 w-8" />
                        </div>
                        <p className="mt-3 text-sm text-gray-400">
                            {emptyMessage}
                        </p>
                    </div>
                ) : (
                    <div className="mt-4 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white/70 dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-950/30">
                        {rows.map((row) => (
                            <StockBasketLine
                                key={row.BASKETID}
                                idPrefix="stock-order"
                                code={row.ITEM_CODE}
                                name={row.ITEM_NAME}
                                quantity={Number(getRequestedQty(row))}
                                mtrl={row.MTRL}
                                basketId={row.BASKETID}
                                updating={updatingBasketIds?.has(row.BASKETID)}
                                selected={
                                    selectedBasketIds?.has(row.BASKETID) ?? true
                                }
                                removing={removingBasketIds?.has(row.BASKETID)}
                                details={
                                    showRequestDetails ? (
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                            <span className="whitespace-nowrap">
                                                Ημ/νία Αιτήματος:{" "}
                                                <strong className="font-semibold tabular-nums text-gray-700 dark:text-gray-200">
                                                    {formatDateTime(row.INS_DATE)}
                                                </strong>
                                            </span>
                                            <span className="whitespace-nowrap">
                                                Ημ/νία Έγκρισης:{" "}
                                                <strong className="font-semibold tabular-nums text-gray-700 dark:text-gray-200">
                                                    {formatDateTime(row.APPROVED_TS)}
                                                </strong>
                                            </span>
                                        </div>
                                    ) : undefined
                                }
                                onQuantityChange={
                                    onChangeQuantity
                                        ? (quantity) => onChangeQuantity(row, quantity)
                                        : undefined
                                }
                                onToggleSelection={
                                    onToggleLineSelection
                                        ? () => onToggleLineSelection(row.BASKETID)
                                        : undefined
                                }
                                onRemove={
                                    onRemoveLine
                                        ? () => onRemoveLine(row)
                                        : undefined
                                }
                            />
                        ))}
                    </div>
                )}
            </section>

            {onNotesChange ? (
                <SummaryTextareaField
                    id="anatrof-notes"
                    label="Παρατηρήσεις"
                    icon={<StickyNote className="h-4 w-4" />}
                    value={notes}
                    onChange={onNotesChange}
                    rows={3}
                    placeholder="Προσθέστε παρατηρήσεις για την ανατροφοδοσία..."
                    fieldClassName="mt-5"
                />
            ) : null}
        </SummaryPanel>
    );
}
