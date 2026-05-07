"use client";

import { Check } from "@/lib/icons/lucide";
import { OrderSummary as OrderSummaryPanel } from "@/components/order-summary/order-summary";
import type { IStockRequestListRow } from "@/lib/interface";

interface StockOrderSummaryProps {
    rows: IStockRequestListRow[];
    requestedQtyTotal: number;
    branchLabel: string;
    getStatusStyle: (status: string) => string;
    getRequestedQty: (row: IStockRequestListRow) => string;
    formatDateTime: (value?: string) => string;
}

export default function StockOrderSummary({
    rows,
    requestedQtyTotal,
    branchLabel,
    getStatusStyle,
    getRequestedQty,
    formatDateTime,
}: StockOrderSummaryProps) {
    return (
        <OrderSummaryPanel
            summaryLabel="Σύνοψη Ανατροφοδοσίας"
            summaryTitle="Αποστολή Ανατροφοδοσίας :: S1"
            asideClassName="xl:!basis-[25%] xl:!min-w-[272px]"
            headerActions={
                <span className="rounded-full bg-gray-900/10 px-2 py-1 text-[10px] font-semibold text-gray-700 dark:bg-gray-100/10 dark:text-gray-200">
                    {rows.length}
                </span>
            }
            infoCard={{
                label: "ΑΝΑΤΡΟΦΟΔΟΣΙΑ ΓΙΑ ΚΑΤΑΣΤΗΜΑ:",
                title: branchLabel || "—"
            }}
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
                },
            ]}
        >
            <div className="mt-5">
                <div className="flex items-center justify-between">
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
                        <Check className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
                        <p className="mt-3 text-sm text-gray-400">
                            Δεν υπάρχουν ολοκληρωμένα αιτήματα.
                        </p>
                    </div>
                ) : (
                    <div className="mt-4 space-y-3">
                        {rows.map((row) => (
                            <div
                                key={row.BASKETID}
                                className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/40"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                                            {row.ITEM_CODE || row.MTRL}
                                        </p>
                                        <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                                            {row.ITEM_NAME || "—"}
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

                                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-500">
                                    <span>
                                        ID:{" "}
                                        <span className="font-medium text-gray-700 dark:text-white/90">
                                            {row.BASKETID}
                                        </span>
                                    </span>
                                    <span>
                                        ΠΟΣΟΤΗΤΑ:{" "}
                                        <span className="font-medium text-gray-700 dark:text-white/90">
                                            {getRequestedQty(row)}
                                        </span>
                                    </span>
                                    <span>
                                        MTRL:{" "}
                                        <span className="font-medium text-gray-700 dark:text-white/90">
                                            {row.MTRL}
                                        </span>
                                    </span>
                                    <span>
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
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </OrderSummaryPanel>
    );
}
