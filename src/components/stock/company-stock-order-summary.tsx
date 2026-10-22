"use client";

import { useMemo } from "react";
import SummaryInfoCard from "@/components/ui/summary-panel/summary-info-card";
import SummaryMetricGrid from "@/components/ui/summary-panel/summary-metric-grid";
import SummaryPanel, {
    SummaryPanelMessage,
} from "@/components/ui/summary-panel/summary-panel";
import SummaryPrimaryAction from "@/components/ui/summary-panel/summary-primary-action";
import {
    Check,
    ChevronDown,
    Package,
    Send,
    Truck,
    Warehouse,
} from "@/lib/icons/lucide";

export interface CompanyStockBasketLine {
    id: string;
    basketId: string;
    mtrl: string;
    code: string;
    name: string;
    quantity: number;
    supplierName?: string;
    supplierTrdr?: string;
    supplierCode?: string;
}

interface CompanyStockOrderSummaryProps {
    branchLabel: string;
    lines: CompanyStockBasketLine[];
    selectedSupplierTrdr: string | null;
    onSelectedSupplierTrdrChange: (trdr: string) => void;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

interface SupplierBasketGroup {
    key: string;
    trdr: string;
    supplierCode: string;
    supplierName: string;
    lines: CompanyStockBasketLine[];
    totalQuantity: number;
}

function normalize(value: unknown) {
    return String(value ?? "").trim();
}

function compareText(first: string, second: string) {
    return first.localeCompare(second, "el", {
        numeric: true,
        sensitivity: "base",
    });
}

function groupBasketLines(lines: CompanyStockBasketLine[]) {
    const groups = new Map<string, SupplierBasketGroup>();

    for (const line of lines) {
        const trdr = normalize(line.supplierTrdr);
        const key = trdr || "__without_trdr__";
        const existing = groups.get(key);

        if (existing) {
            existing.lines.push(line);
            existing.totalQuantity += line.quantity;
            if (!existing.supplierName) {
                existing.supplierName = normalize(line.supplierName);
            }
            if (!existing.supplierCode) {
                existing.supplierCode = normalize(line.supplierCode);
            }
            continue;
        }

        groups.set(key, {
            key,
            trdr,
            supplierCode: normalize(line.supplierCode),
            supplierName: normalize(line.supplierName),
            lines: [line],
            totalQuantity: line.quantity,
        });
    }

    return Array.from(groups.values())
        .map((group) => ({
            ...group,
            lines: [...group.lines].sort(
                (first, second) =>
                    compareText(first.code, second.code) ||
                    compareText(first.name, second.name)
            ),
        }))
        .sort((first, second) => {
            if (!first.trdr) return 1;
            if (!second.trdr) return -1;
            return compareText(first.trdr, second.trdr);
        });
}

export default function CompanyStockOrderSummary({
    branchLabel,
    lines,
    selectedSupplierTrdr,
    onSelectedSupplierTrdrChange,
    collapsed = false,
    onToggleCollapse,
}: CompanyStockOrderSummaryProps) {
    const supplierGroups = useMemo(() => groupBasketLines(lines), [lines]);
    const totalQuantity = lines.reduce(
        (total, line) => total + line.quantity,
        0
    );
    const selectedGroup = supplierGroups.find(
        (group) => group.trdr === selectedSupplierTrdr
    );

    return (
        <SummaryPanel
            label="Σύνοψη Κεντρικού Εφοδιασμού"
            title="Καλάθι Ανατροφοδοσίας Εταιρίας"
            collapsible
            collapsed={collapsed}
            onToggleCollapse={onToggleCollapse}
            collapseTitle="Απόκρυψη καλαθιού"
            asideClassName={collapsed
                ? "xl:!basis-auto xl:!min-w-0"
                : "xl:!basis-[25%] xl:!min-w-[272px] xl:max-h-full xl:min-h-0 xl:self-stretch"}
            fitContentWhenStacked
            footer={(
                <div className="space-y-3">
                    <div
                        className={[
                            "rounded-xl border px-3 py-3 transition",
                            selectedGroup
                                ? "border-brand-200 bg-brand-50 text-brand-700 shadow-sm dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-300"
                                : "border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400",
                        ].join(" ")}
                    >
                        <div className="flex items-center gap-2">
                            <span
                                className={[
                                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                                    selectedGroup
                                        ? "bg-brand-500 text-white"
                                        : "bg-gray-200 text-gray-400 dark:bg-gray-800",
                                ].join(" ")}
                            >
                                <Truck className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wide">
                                    Επιλεγμένος προμηθευτής
                                </p>
                                <p className="mt-0.5 truncate text-xs font-semibold text-gray-900 dark:text-white">
                                    {selectedGroup
                                        ? selectedGroup.supplierName || "Χωρίς όνομα"
                                        : "Επιλέξτε καλάθι προμηθευτή"}
                                </p>
                                {selectedGroup && (
                                    <p className="mt-0.5 text-[10px] font-medium tabular-nums opacity-80">
                                        TRDR {selectedGroup.trdr || "—"}
                                        {selectedGroup.supplierCode
                                            ? ` · Κωδικός ${selectedGroup.supplierCode}`
                                            : ""}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    <SummaryPrimaryAction
                        label="Αποστολή επιλεγμένου καλαθιού"
                        disabled
                        icon={<Send className="h-4 w-4" />}
                    />
                </div>
            )}
        >
            <SummaryInfoCard
                label="Κατάστημα"
                title={branchLabel || "—"}
                description="Κεντρικός εφοδιασμός εταιρείας"
                icon={<Warehouse className="h-4 w-4" />}
            />

            <SummaryPanelMessage tone="info">
                Κάθε καλάθι TRDR θα δημιουργεί ξεχωριστό PURDOC. Επιλέξτε ποιο
                καλάθι θα αποσταλεί στο S1.
            </SummaryPanelMessage>

            <SummaryMetricGrid
                metrics={[
                    {
                        id: "supplier-baskets",
                        label: "Καλάθια TRDR",
                        value: supplierGroups.length,
                        tone: "brand",
                    },
                    {
                        id: "quantity",
                        label: "Ποσότητα",
                        value: totalQuantity,
                    },
                ]}
            />

            <section className="mt-5">
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                        Καλάθια ανά Προμηθευτή
                    </p>
                    {supplierGroups.length > 0 && (
                        <span className="text-xs text-gray-400">
                            {supplierGroups.length}{" "}
                            {supplierGroups.length === 1 ? "καλάθι" : "καλάθια"}
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
                    <div
                        className="mt-4 space-y-3"
                        role="radiogroup"
                        aria-label="Επιλογή καλαθιού προμηθευτή για S1"
                    >
                        {supplierGroups.map((group) => {
                            const selected = group.trdr === selectedSupplierTrdr;

                            return (
                                <article
                                    key={group.key}
                                    className={[
                                        "overflow-hidden rounded-2xl border transition",
                                        selected
                                            ? "border-brand-300 bg-brand-50/40 ring-1 ring-brand-100 dark:border-brand-500/50 dark:bg-brand-500/10 dark:ring-brand-500/20"
                                            : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40",
                                    ].join(" ")}
                                >
                                    <button
                                        type="button"
                                        role="radio"
                                        aria-checked={selected}
                                        onClick={() =>
                                            onSelectedSupplierTrdrChange(group.trdr)
                                        }
                                        className="flex w-full items-start gap-3 p-3 text-left"
                                    >
                                        <span
                                            className={[
                                                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
                                                selected
                                                    ? "border-brand-500 bg-brand-500 text-white"
                                                    : "border-gray-300 bg-white text-transparent dark:border-gray-600 dark:bg-gray-900",
                                            ].join(" ")}
                                        >
                                            <Check className="h-3 w-3" />
                                        </span>

                                        <span className="min-w-0 flex-1">
                                            <span className="flex min-w-0 items-center gap-1.5">
                                                <Truck className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                                                <span className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
                                                    {group.supplierName || "Χωρίς όνομα προμηθευτή"}
                                                </span>
                                            </span>
                                            <span className="mt-1 block text-[11px] text-gray-500 dark:text-gray-400">
                                                TRDR {group.trdr || "—"}
                                                {group.supplierCode
                                                    ? ` · Κωδικός ${group.supplierCode}`
                                                    : ""}
                                            </span>
                                            <span className="mt-2 flex flex-wrap gap-1.5">
                                                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-gray-600 ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700">
                                                    {group.lines.length}{" "}
                                                    {group.lines.length === 1 ? "γραμμή" : "γραμμές"}
                                                </span>
                                                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold tabular-nums text-brand-600 ring-1 ring-brand-100 dark:bg-gray-900 dark:text-brand-300 dark:ring-brand-500/20">
                                                    {group.totalQuantity} τεμ.
                                                </span>
                                                {selected && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-2 py-1 text-[10px] font-semibold text-white shadow-sm">
                                                        <Truck className="h-3 w-3" />
                                                        Επιλεγμένος προμηθευτής
                                                    </span>
                                                )}
                                            </span>
                                        </span>

                                        <ChevronDown
                                            className={[
                                                "mt-1 h-4 w-4 shrink-0 text-gray-400 transition-transform",
                                                selected ? "rotate-180" : "",
                                            ].join(" ")}
                                        />
                                    </button>

                                    {selected && (
                                        <div className="divide-y divide-gray-100 border-t border-brand-100 bg-white/70 dark:divide-gray-800 dark:border-brand-500/20 dark:bg-gray-950/30">
                                            {group.lines.map((line) => (
                                                <div key={line.id} className="px-3 py-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="line-clamp-2 text-xs font-medium text-gray-700 dark:text-white/90">
                                                                {line.name || "—"}
                                                            </p>
                                                            <p className="mt-1 text-[11px] text-gray-500">
                                                                {line.code || line.mtrl}
                                                            </p>
                                                        </div>
                                                        <span className="shrink-0 rounded-full bg-brand-50 px-2 py-1 text-[10px] font-semibold tabular-nums text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                                                            {line.quantity} τεμ.
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-400">
                                                        <span>MTRL {line.mtrl}</span>
                                                        {line.basketId && (
                                                            <span>ID {line.basketId}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </SummaryPanel>
    );
}
