"use client";

import { Check, Send } from "@/lib/icons/lucide";
import SummaryPanel from "@/components/ui/summary-panel/summary-panel";
import SummaryInfoCard from "@/components/ui/summary-panel/summary-info-card";
import SummaryMetricGrid from "@/components/ui/summary-panel/summary-metric-grid";
import SummaryPrimaryAction from "@/components/ui/summary-panel/summary-primary-action";
import BasketList from "@/components/ui/basket-list/basket-list";
import BasketListItem from "@/components/ui/basket-list/basket-list-item";
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

            <BasketList
                title="Καλάθι Ανατροφοδοσίας"
                count={rows.length}
                countLabel={`${rows.length} ${rows.length === 1 ? "γραμμή" : "γραμμές"}`}
                emptyTitle="Δεν υπάρχουν ολοκληρωμένα αιτήματα."
                emptyIcon={<Check className="h-8 w-8" />}
            >
                {rows.map((row) => (
                    <BasketListItem
                        key={row.BASKETID}
                        title={row.ITEM_NAME || "—"}
                        subtitle={row.ITEM_CODE || row.MTRL}
                        status={
                            <span
                                className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${getStatusStyle(
                                    row.STATUS
                                )}`}
                            >
                                {row.STATUS}
                            </span>
                        }
                        quantity={getRequestedQty(row)}
                        meta={[
                            { label: "ID", value: row.BASKETID },
                            { label: "MTRL", value: row.MTRL },
                            { label: "ΚΑΤ/ΜΑ", value: row.BRANCH },
                        ]}
                        footer={
                            <>
                                <p>Ημ/νία Αιτήματος: {formatDateTime(row.INS_DATE)}</p>
                                <p className="mt-1">
                                    Ημ/νία Έγκρισης: {formatDateTime(row.APPROVED_TS)}
                                </p>
                            </>
                        }
                    />
                ))}
            </BasketList>
        </SummaryPanel>
    );
}
