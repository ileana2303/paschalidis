"use client";

import type { ReactNode } from "react";
import { Modal } from "@/components/ui/modal";
import Badge from "@/components/ui/badge/Badge";
import DataTableEmptyState from "@/components/ui/data-table/data-table-empty-state";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertCircle,
    ChartColumn,
    ClipboardList,
    Loader2,
    PackageSearch,
} from "@/lib/icons/lucide";
import type { ICustomerInfo, IItem } from "@/lib/interface";
import type {
    CompetitionSaleRow,
    CompetitionSalesResponse,
    LastOrderRow,
    LastOrdersResponse,
} from "@/lib/part-insights";
import { formatDateEl } from "@/lib/utils/date";
import { formatEuro, parseSoftOneNumber } from "@/lib/utils/number";

export interface InsightSectionState<TData> {
    loading: boolean;
    error: string;
    data: TData | null;
}

interface PartInsightsModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: IItem | null;
    customer: ICustomerInfo | null;
    lastOrders: InsightSectionState<LastOrdersResponse>;
    competition: InsightSectionState<CompetitionSalesResponse>;
}

interface InsightSectionProps {
    title: string;
    description: string;
    icon: ReactNode;
    loading: boolean;
    error: string;
    count: number;
    isEmpty: boolean;
    emptyTitle: string;
    emptyDescription: string;
    children: ReactNode;
}

const headerCellClassName =
    "border-b border-gray-200 bg-gray-50 px-1 py-2 text-[9px] font-semibold uppercase leading-3 tracking-normal text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400 lg:text-[10px] lg:leading-4 xl:px-1.5";
const bodyCellClassName =
    "border-b border-gray-100 px-1 py-2 align-top text-[11px] leading-4 text-gray-700 last:border-b-0 dark:border-gray-800 dark:text-gray-200 lg:text-xs lg:leading-5 xl:px-1.5";

function text(value: unknown) {
    const normalized = String(value ?? "").trim();
    return normalized || "—";
}

function formatQuantity(value: unknown) {
    const parsed = parseSoftOneNumber(value);

    if (parsed == null) {
        return "—";
    }

    return new Intl.NumberFormat("el-GR", {
        maximumFractionDigits: 2,
    }).format(parsed);
}

function normalizeMatchType(value: unknown) {
    return String(value ?? "").trim().toLocaleLowerCase("en-US");
}

function getMatchTypePriority(value: unknown) {
    const matchType = normalizeMatchType(value);

    if (matchType === "exact") return 0;
    if (matchType === "similar") return 1;
    return 2;
}

function getTransactionTimestamp(value: unknown) {
    const raw = String(value ?? "").trim();

    if (!raw) return Number.NEGATIVE_INFINITY;

    const timestamp = Date.parse(raw.replace(" ", "T"));
    return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function sortInsightRows<TRow extends { MATCH_TYPE?: string; TRNDATE?: string }>(
    rows: TRow[]
) {
    return [...rows].sort((left, right) => {
        const matchTypeDifference =
            getMatchTypePriority(left.MATCH_TYPE) -
            getMatchTypePriority(right.MATCH_TYPE);

        if (matchTypeDifference !== 0) {
            return matchTypeDifference;
        }

        return (
            getTransactionTimestamp(right.TRNDATE) -
            getTransactionTimestamp(left.TRNDATE)
        );
    });
}

function getMatchTypeClassName(value: unknown) {
    const matchType = normalizeMatchType(value);

    if (matchType === "exact") {
        return "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500";
    }

    if (matchType === "similar") {
        return "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400";
    }

    return "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80";
}

function MatchTypePill({ value }: { value: unknown }) {
    const label = text(value);

    return (
        <span
            title={label}
            className={`inline-flex max-w-full items-center justify-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none lg:text-[10px] ${getMatchTypeClassName(value)}`}
        >
            <span className="truncate">{label}</span>
        </span>
    );
}

function InsightSection({
    title,
    description,
    icon,
    loading,
    error,
    count,
    isEmpty,
    emptyTitle,
    emptyDescription,
    children,
}: InsightSectionProps) {
    return (
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]">
            <header className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                        {icon}
                    </span>
                    <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            {title}
                        </h3>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 lg:text-sm">
                            {description}
                        </p>
                    </div>
                </div>

                {!loading && !error && (
                    <Badge color="light" size="sm">
                        {count} {count === 1 ? "εγγραφή" : "εγγραφές"}
                    </Badge>
                )}
            </header>

            {loading ? (
                <div className="flex min-h-44 items-center justify-center gap-3 px-5 py-12 text-sm text-gray-500 dark:text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
                    Φόρτωση στοιχείων…
                </div>
            ) : error ? (
                <div className="m-5 flex items-start gap-3 rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                        <p className="font-semibold">Δεν ήταν δυνατή η φόρτωση</p>
                        <p className="mt-1">{error}</p>
                    </div>
                </div>
            ) : isEmpty ? (
                <DataTableEmptyState
                    icon={<PackageSearch className="h-7 w-7" />}
                    title={emptyTitle}
                    description={emptyDescription}
                    className="py-12"
                />
            ) : (
                children
            )}
        </section>
    );
}

function LastOrdersTable({ rows }: { rows: LastOrderRow[] }) {
    return (
        <div className="overflow-x-auto md:overflow-x-hidden">
            <Table className="min-w-[680px] table-fixed text-left md:min-w-0">
                <colgroup>
                    <col className="w-[11%]" />
                    <col className="w-[13%]" />
                    <col className="w-[14%]" />
                    <col className="w-[20%]" />
                    <col className="w-[13%]" />
                    <col className="w-[7%]" />
                    <col className="w-[11%]" />
                    <col className="w-[11%]" />
                </colgroup>
                <TableHeader>
                    <TableRow>
                        <TableCell isHeader className={headerCellClassName}><span title="Match type">Match</span></TableCell>
                        <TableCell isHeader className={headerCellClassName}><span title="Ημερομηνία">Ημ/νία</span></TableCell>
                        <TableCell isHeader className={headerCellClassName}>Κωδικός</TableCell>
                        <TableCell isHeader className={headerCellClassName}>Περιγραφή</TableCell>
                        <TableCell isHeader className={headerCellClassName}><span title="Παραστατικό">Παρ/κό</span></TableCell>
                        <TableCell isHeader className={headerCellClassName}><span title="Ποσότητα">Ποσ.</span></TableCell>
                        <TableCell isHeader className={headerCellClassName}>Τιμή</TableCell>
                        <TableCell isHeader className={headerCellClassName}><span title="Turnover">Σύνολο</span></TableCell>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((row, index) => (
                        <TableRow key={`${text(row.PARASTATIKO)}-${text(row.MTRL)}-${index}`}>
                            <TableCell className={bodyCellClassName}>
                                <MatchTypePill value={row.MATCH_TYPE} />
                            </TableCell>
                            <TableCell className={`${bodyCellClassName} whitespace-nowrap`}>
                                {formatDateEl(row.TRNDATE)}
                            </TableCell>
                            <TableCell className={`${bodyCellClassName} break-all font-semibold text-gray-900 dark:text-white`}>
                                <span className="line-clamp-2" title={text(row.ITEM_CODE)}>
                                    {text(row.ITEM_CODE)}
                                </span>
                            </TableCell>
                            <TableCell className={`${bodyCellClassName} break-words text-[10px] leading-[0.875rem] lg:text-[11px] lg:leading-4`}>
                                <span className="line-clamp-3" title={text(row.ITEM_DESCR)}>
                                    {text(row.ITEM_DESCR)}
                                </span>
                            </TableCell>
                            <TableCell className={`${bodyCellClassName} break-all`}>
                                <span className="line-clamp-2" title={text(row.PARASTATIKO)}>
                                    {text(row.PARASTATIKO)}
                                </span>
                            </TableCell>
                            <TableCell className={`${bodyCellClassName} whitespace-nowrap text-right tabular-nums`}>
                                {formatQuantity(row.QTY)}
                            </TableCell>
                            <TableCell className={`${bodyCellClassName} whitespace-nowrap text-right tabular-nums`}>
                                {formatEuro(row.PRICE, "—")}
                            </TableCell>
                            <TableCell className={`${bodyCellClassName} whitespace-nowrap text-right font-semibold tabular-nums`}>
                                {formatEuro(row.Turnover, "—")}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function CompetitionTable({ rows }: { rows: CompetitionSaleRow[] }) {
    return (
        <div className="overflow-x-auto md:overflow-x-hidden">
            <Table className="min-w-[680px] table-fixed text-left md:min-w-0">
                <colgroup>
                    <col className="w-[11%]" />
                    <col className="w-[13%]" />
                    <col className="w-[14%]" />
                    <col className="w-[21%]" />
                    <col className="w-[7%]" />
                    <col className="w-[11%]" />
                    <col className="w-[13%]" />
                    <col className="w-[10%]" />
                </colgroup>
                <TableHeader>
                    <TableRow>
                        <TableCell isHeader className={headerCellClassName}><span title="Match type">Match</span></TableCell>
                        <TableCell isHeader className={headerCellClassName}><span title="Ημερομηνία">Ημ/νία</span></TableCell>
                        <TableCell isHeader className={headerCellClassName}>Κωδικός</TableCell>
                        <TableCell isHeader className={headerCellClassName}>Περιγραφή</TableCell>
                        <TableCell isHeader className={headerCellClassName}><span title="Ποσότητα">Ποσ.</span></TableCell>
                        <TableCell isHeader className={headerCellClassName}>Τιμή</TableCell>
                        <TableCell isHeader className={headerCellClassName}><span title="Κατάστημα">Κατ/μα</span></TableCell>
                        <TableCell isHeader className={headerCellClassName}><span title="Ομάδα Πελάτη">Ομάδα</span></TableCell>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((row, index) => (
                        <TableRow key={`${text(row.TRNDATE)}-${text(row.MTRL)}-${index}`}>
                            <TableCell className={bodyCellClassName}>
                                <MatchTypePill value={row.MATCH_TYPE} />
                            </TableCell>
                            <TableCell className={`${bodyCellClassName} whitespace-nowrap`}>
                                {formatDateEl(row.TRNDATE)}
                            </TableCell>
                            <TableCell className={`${bodyCellClassName} break-all font-semibold text-gray-900 dark:text-white`}>
                                <span className="line-clamp-2" title={text(row.ITEM_CODE)}>
                                    {text(row.ITEM_CODE)}
                                </span>
                            </TableCell>
                            <TableCell className={`${bodyCellClassName} break-words text-[10px] leading-[0.875rem] lg:text-[11px] lg:leading-4`}>
                                <span className="line-clamp-3" title={text(row.ITEM_DESCR)}>
                                    {text(row.ITEM_DESCR)}
                                </span>
                            </TableCell>
                            <TableCell className={`${bodyCellClassName} whitespace-nowrap text-right tabular-nums`}>
                                {formatQuantity(row.QTY)}
                            </TableCell>
                            <TableCell className={`${bodyCellClassName} whitespace-nowrap text-right tabular-nums`}>
                                {formatEuro(row.PRICE, "—")}
                            </TableCell>
                            <TableCell className={`${bodyCellClassName} break-words text-[10px] leading-[0.875rem]`}>
                                <span className="line-clamp-3" title={text(row.MAGAZI)}>
                                    {text(row.MAGAZI)}
                                </span>
                            </TableCell>
                            <TableCell className={bodyCellClassName}>
                                <span
                                    title={text(row.PEER_SCOPE)}
                                    className="inline-block max-w-full truncate rounded-full bg-blue-light-50 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-blue-light-500 dark:bg-blue-light-500/15 lg:text-[10px]"
                                >
                                    {text(row.PEER_SCOPE)}
                                </span>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

export default function PartInsightsModal({
    isOpen,
    onClose,
    item,
    customer,
    lastOrders,
    competition,
}: PartInsightsModalProps) {
    const lastOrderRows = sortInsightRows(lastOrders.data?.rows ?? []);
    const competitionRows = sortInsightRows(competition.data?.rows ?? []);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            className="m-4 max-w-[96vw] xl:max-w-[1920px]"
        >
            <div className="p-5 sm:p-7">
                <header className="border-b border-gray-200 pb-5 pr-12 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <ChartColumn className="h-5 w-5 text-brand-500" />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
                            Ιστορικό &amp; Ανταγωνισμός
                        </h2>
                    </div>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {text(item?.ITEM_CODE)}
                        </span>
                        {item?.ITEM_DESCR ? ` — ${item.ITEM_DESCR}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        Πελάτης: {customer ? `${customer.NAME} (${customer.TRDR})` : "—"}
                    </p>
                </header>

                <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
                    <InsightSection
                        title="Προηγούμενες Αγορές Πελάτη"
                        description="Προηγούμενες παραγγελίες του επιλεγμένου πελάτη για το είδος."
                        icon={<ClipboardList className="h-5 w-5" />}
                        loading={lastOrders.loading}
                        error={lastOrders.error}
                        count={lastOrders.data?.totalcount ?? lastOrderRows.length}
                        isEmpty={
                            (lastOrders.data?.totalcount ?? lastOrderRows.length) === 0 ||
                            lastOrderRows.length === 0
                        }
                        emptyTitle="Δεν βρέθηκαν προηγούμενες αγορές"
                        emptyDescription="Ο επιλεγμένος πελάτης δεν έχει προηγούμενη αγορά για αυτό το είδος."
                    >
                        <LastOrdersTable rows={lastOrderRows} />
                    </InsightSection>

                    <InsightSection
                        title="Ανταγωνισμός / Παρόμοιες Πωλήσεις"
                        description="Πρόσφατες συγκρίσιμες πωλήσεις για το επιλεγμένο είδος."
                        icon={<ChartColumn className="h-5 w-5" />}
                        loading={competition.loading}
                        error={competition.error}
                        count={competition.data?.totalcount ?? competitionRows.length}
                        isEmpty={
                            (competition.data?.totalcount ?? competitionRows.length) === 0 ||
                            competitionRows.length === 0
                        }
                        emptyTitle="Δεν βρέθηκαν παρόμοιες πωλήσεις"
                        emptyDescription="Δεν υπάρχουν διαθέσιμα στοιχεία ανταγωνισμού για αυτό το είδος."
                    >
                        <CompetitionTable rows={competitionRows} />
                    </InsightSection>
                </div>
            </div>
        </Modal>
    );
}
