"use client";

import SummaryInfoCard from "@/components/ui/summary-panel/summary-info-card";
import SummaryMetricGrid from "@/components/ui/summary-panel/summary-metric-grid";
import SummaryPanel, {
    SummaryPanelMessage,
} from "@/components/ui/summary-panel/summary-panel";
import SummaryPrimaryAction from "@/components/ui/summary-panel/summary-primary-action";
import { Package, Send, Warehouse } from "@/lib/icons/lucide";

export interface CompanyStockBasketLine {
    id: string;
    basketId: string;
    mtrl: string;
    code: string;
    name: string;
    quantity: number;
}

interface CompanyStockOrderSummaryProps {
    branchLabel: string;
    lines: CompanyStockBasketLine[];
}

export default function CompanyStockOrderSummary({
    branchLabel,
    lines,
}: CompanyStockOrderSummaryProps) {
    const totalQuantity = lines.reduce(
        (total, line) => total + line.quantity,
        0
    );

    return (
        <SummaryPanel
            label="Σύνοψη Κεντρικού Εφοδιασμού"
            title="Καλάθι Ανατροφοδοσίας Εταιρίας"
            asideClassName="xl:!basis-[25%] xl:!min-w-[272px] xl:max-h-full xl:min-h-0 xl:self-stretch"
            fitContentWhenStacked
            footer={(
                <SummaryPrimaryAction
                    label="Αποστολή Παραγγελίας"
                    disabled
                    icon={<Send className="h-4 w-4" />}
                />
            )}
        >
            <SummaryInfoCard
                label="Κατάστημα"
                title={branchLabel || "—"}
                description="Κεντρικός εφοδιασμός εταιρείας"
                icon={<Warehouse className="h-4 w-4" />}
            />

            <SummaryPanelMessage tone="info">
                Η αποστολή παραγγελίας στο S1 θα ενεργοποιηθεί όταν διατεθεί το
                αντίστοιχο API.
            </SummaryPanelMessage>

            <SummaryMetricGrid
                metrics={[
                    {
                        id: "lines",
                        label: "Γραμμές",
                        value: lines.length,
                    },
                    {
                        id: "quantity",
                        label: "Ποσότητα",
                        value: totalQuantity,
                        tone: "brand",
                    },
                ]}
            />

            <section className="mt-5">
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                        Είδη Καλαθιού
                    </p>
                    {lines.length > 0 && (
                        <span className="text-xs text-gray-400">
                            {lines.length} {lines.length === 1 ? "γραμμή" : "γραμμές"}
                        </span>
                    )}
                </div>

                {lines.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
                            <Package className="h-5 w-5" />
                        </div>
                        <p className="mt-3 text-sm text-gray-400">
                            Δεν έχουν προστεθεί είδη στο καλάθι.
                        </p>
                    </div>
                ) : (
                    <div className="mt-4 space-y-3">
                        {lines.map((line) => (
                            <article
                                key={line.id}
                                className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/40"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="line-clamp-2 text-sm font-medium text-gray-700 dark:text-white/90">
                                            {line.name || "—"}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            {line.code || line.mtrl}
                                        </p>
                                    </div>

                                    <span className="shrink-0 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-semibold tabular-nums text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
                                        {line.quantity} τεμ.
                                    </span>
                                </div>

                                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-gray-200 pt-3 text-[11px] text-gray-500 dark:border-gray-800">
                                    <span>
                                        MTRL:{" "}
                                        <strong className="font-medium text-gray-700 dark:text-gray-200">
                                            {line.mtrl}
                                        </strong>
                                    </span>
                                    {line.basketId && (
                                        <span>
                                            ID:{" "}
                                            <strong className="font-medium text-gray-700 dark:text-gray-200">
                                                {line.basketId}
                                            </strong>
                                        </span>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </SummaryPanel>
    );
}
