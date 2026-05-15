"use client";

import { Check, Send } from "@/lib/icons/lucide";
import SummaryPanel from "@/components/ui/summary-panel/summary-panel";
import SummaryInfoCard from "@/components/ui/summary-panel/summary-info-card";
import SummaryMetricGrid from "@/components/ui/summary-panel/summary-metric-grid";
import SummaryPrimaryAction from "@/components/ui/summary-panel/summary-primary-action";
import type { IStockRequestListRow } from "@/lib/interface";

export interface StockOrderSummaryProps {
    rows: IStockRequestListRow[];
    requestedQtyTotal: number;
    branchLabel: string;
    getStatusStyle: (status: string) => string;
    getRequestedQty: (row: IStockRequestListRow) => string;
    formatDateTime: (value?: string) => string;
    sendingOrder?: boolean;
    onSendOrder?: () => void;
}

export default function StockOrderSummary({
    rows,
    requestedQtyTotal,
    branchLabel,
    getStatusStyle,
    getRequestedQty,
    formatDateTime,
    sendingOrder = false,
    onSendOrder,
}: StockOrderSummaryProps) {
    const sendDisabled = sendingOrder || rows.length === 0;

    return (
        <SummaryPanel
            label="Σύνοψη Ανατροφοδοσίας"
            title="Αποστολή Ανατροφοδοσίας :: S1"
            asideClassName="xl:!basis-[25%] xl:!min-w-[272px]"
            actions={
                <span className="rounded-full bg-gray-900/10 px-2 py-1 text-[10px] font-semibold text-gray-700 dark:bg-gray-100/10 dark:text-gray-200">
                    {rows.length}
                </span>
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
                        value: rows.length,
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
                        Καλάθι Ανατροφοδοσίας
                    </p>
                    {rows.length > 0 && (
                        <span className="text-xs text-gray-400">
                            {rows.length} {rows.length === 1 ? "γραμμή" : "γραμμές"}
                        </span>
                    )}
                </div>

                {rows.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
                        <div className="mx-auto flex h-8 w-8 items-center justify-center text-gray-300 dark:text-gray-600">
                            <Check className="h-8 w-8" />
                        </div>
                        <p className="mt-3 text-sm text-gray-400">
                            Δεν υπάρχουν ολοκληρωμένα αιτήματα.
                        </p>
                    </div>
                ) : (
                    <div className="mt-4 space-y-3">
                        {rows.map((row) => (
                            <article
                                key={row.BASKETID}
                                className="group rounded-xl border border-gray-200 bg-gray-50 p-3 transition-all dark:border-gray-800 dark:bg-gray-900/40"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-gray-700 dark:text-white/90">
                                            {row.ITEM_NAME || "—"}
                                        </p>
                                        <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                                            {row.ITEM_CODE || row.MTRL}
                                        </p>
                                    </div>

                                    <span
                                        className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${getStatusStyle(
                                            row.STATUS
                                        )}`}
                                    >
                                        {row.STATUS}
                                    </span>
                                </div>

                                <div className="mt-3">
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-semibold tabular-nums text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
                                        <span className="text-[10px] uppercase tracking-[0.14em] opacity-75">
                                            ΠΟΣΟΤΗΤΑ:
                                        </span>
                                        <span>{getRequestedQty(row)}</span>
                                    </span>
                                </div>

                                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-500">
                                    <span className="min-w-0">
                                        ID:{" "}
                                        <span className="font-medium text-gray-700 dark:text-white/90">
                                            {row.BASKETID}
                                        </span>
                                    </span>
                                    <span className="min-w-0">
                                        MTRL:{" "}
                                        <span className="font-medium text-gray-700 dark:text-white/90">
                                            {row.MTRL}
                                        </span>
                                    </span>
                                    <span className="min-w-0">
                                        ΚΑΤ/ΜΑ:{" "}
                                        <span className="font-medium text-gray-700 dark:text-white/90">
                                            {row.BRANCH}
                                        </span>
                                    </span>
                                </div>

                                <div className="mt-3 border-t border-gray-200 pt-3 text-[11px] text-gray-500 dark:border-gray-800">
                                    <p>Ημ/νία Αιτήματος: {formatDateTime(row.INS_DATE)}</p>
                                    <p className="mt-1">
                                        Ημ/νία Έγκρισης: {formatDateTime(row.APPROVED_TS)}
                                    </p>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </SummaryPanel>
    );
}
