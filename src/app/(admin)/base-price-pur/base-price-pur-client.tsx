"use client";

import {
    Fragment,
    useCallback,
    useMemo,
    useState,
} from "react";
import toast from "react-hot-toast";
import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import DataTable from "@/components/ui/data-table/data-table";
import DataTableEmptyState from "@/components/ui/data-table/data-table-empty-state";
import DataTableHeader from "@/components/ui/data-table/data-table-header";
import DataTableSearchBar from "@/components/ui/data-table/data-table-search-bar";
import NumberBadge from "@/components/ui/data-table/number-badge";
import {
    Check,
    ChevronDown,
    Loader2,
    Receipt,
} from "@/lib/icons/lucide";
import {
    formatTrnDate,
    matchesBasePricePurSearch,
    PRICE_TIER_LABELS,
    type PriceTierKey,
    tierChanges,
} from "@/lib/base-price-pur/display";
import { groupBasePriceRowsByFindoc } from "@/lib/base-price-pur/group";
import type {
    BasePricePurDocument,
    IBasePricePurItemRow,
    IBasePricePurListRow,
} from "@/lib/base-price-pur/types";
import {
    useApplyBasePricePurMutation,
    useBasePricePurItemsMutation,
    useBasePricePurListQuery,
} from "@/hooks/queries/useBasePricePurQuery";
import { useRequestListIntervalRefresh } from "@/hooks/queries/useRequestListIntervalRefresh";
import { resolveBranchName } from "@/lib/auth/branches";
import { getBranchColor } from "@/lib/branch-colors";
import { formatEuro } from "@/lib/utils/number";

type ExpandedLinesState = {
    source: "list" | "items";
    rows: Array<IBasePricePurListRow | IBasePricePurItemRow>;
};

function PriceCell({
    oldValue,
    newValue,
    changes,
}: {
    oldValue: string;
    newValue: string;
    changes: boolean;
}) {
    if (!changes) {
        return (
            <span className="text-sm text-gray-700 dark:text-gray-200">
                {formatEuro(newValue || oldValue)}
            </span>
        );
    }

    return (
        <span className="inline-flex flex-col gap-0.5 rounded-md bg-amber-50 px-2 py-1 text-sm ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/30">
            <span className="text-xs text-gray-500 line-through dark:text-gray-400">
                {formatEuro(oldValue)}
            </span>
            <span className="font-semibold text-amber-900 dark:text-amber-100">
                {formatEuro(newValue)}
            </span>
        </span>
    );
}

function LineGrid({
    lines,
}: {
    lines: Array<IBasePricePurListRow | IBasePricePurItemRow>;
}) {
    const tiers: PriceTierKey[] = ["W", "01", "02", "03", "04", "05"];

    return (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-800">
                <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900/60 dark:text-gray-400">
                    <tr>
                        <th className="px-3 py-2">Κωδικός</th>
                        <th className="px-3 py-2">Περιγραφή</th>
                        <th className="px-3 py-2">LOGOS</th>
                        <th className="px-3 py-2">Κόστος</th>
                        {tiers.map((tier) => (
                            <th key={tier} className="px-3 py-2 whitespace-nowrap">
                                {PRICE_TIER_LABELS[tier]}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950/40">
                    {lines.map((line) => {
                        const changedTiers = tierChanges(line);
                        const cost =
                            "KOSTOS_MTRL" in line
                                ? line.KOSTOS_MTRL
                                : line.KOSTOS;

                        return (
                            <tr key={line.MTRL + line.CODE}>
                                <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">
                                    {line.CODE}
                                    {line.FALLBACK_PCT === "1" ? (
                                        <span
                                            className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-violet-800 dark:bg-violet-500/20 dark:text-violet-200"
                                            title="Χρησιμοποιήθηκε fallback ποσοστό"
                                        >
                                            FB
                                        </span>
                                    ) : null}
                                </td>
                                <td className="max-w-[220px] px-3 py-2 text-gray-700 dark:text-gray-200">
                                    {line.NAME}
                                </td>
                                <td className="px-3 py-2">
                                    <span
                                        className={
                                            line.LOGOS === "OK"
                                                ? "text-success-600 dark:text-success-400"
                                                : "font-medium text-rose-600 dark:text-rose-400"
                                        }
                                    >
                                        {line.LOGOS}
                                    </span>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                    {formatEuro(cost)}
                                </td>
                                {tiers.map((tier) => {
                                    const oldKey =
                                        `OLD_${tier}` as keyof typeof line;
                                    const newKey =
                                        `NEW_${tier}` as keyof typeof line;
                                    const changes = changedTiers.includes(tier);

                                    return (
                                        <td key={tier} className="px-3 py-2">
                                            <PriceCell
                                                oldValue={String(line[oldKey] ?? "")}
                                                newValue={String(line[newKey] ?? "")}
                                                changes={changes}
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

type DocumentCardProps = {
    document: BasePricePurDocument;
    expanded: boolean;
    expandedLines: ExpandedLinesState | null;
    linesLoading: boolean;
    applying: boolean;
    onToggle: () => void;
    onApply: () => void;
};

function DocumentCard({
    document,
    expanded,
    expandedLines,
    linesLoading,
    applying,
    onToggle,
    onApply,
}: DocumentCardProps) {
    const { header } = document;
    const asyncWarning = Number(header.KOSTOS_ASYNCHRONISTO) > 0;
    const missingSuffix = Number(header.XORIS_SUFIX) > 0;

    return (
        <article
            className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/80"
        >
            <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <NumberBadge value={header.FINCODE || header.FINDOC} />
                        <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getBranchColor(header.BRANCH)}`}
                        >
                            {resolveBranchName(header.BRANCH)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTrnDate(header.TRNDATE)}
                        </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {header.PARASTATIKO}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        {header.PROMITHEYTIS}{" "}
                        <span className="text-gray-400">({header.TRDR_CODE})</span>
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-brand-50 px-2 py-1 font-semibold text-brand-800 ring-1 ring-inset ring-brand-200 dark:bg-brand-500/10 dark:text-brand-200 dark:ring-brand-500/30">
                            Προς ανατίμηση: {header.PROS_ANATIMISI}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                            Είδη: {header.EIDI}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                            Αξία: {formatEuro(header.AKSIA)}
                        </span>
                        {asyncWarning ? (
                            <span className="rounded-full bg-amber-50 px-2 py-1 font-semibold text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200">
                                Ασυγχρονισμένο κόστος: {header.KOSTOS_ASYNCHRONISTO}
                            </span>
                        ) : null}
                        {missingSuffix ? (
                            <span className="rounded-full bg-rose-50 px-2 py-1 font-semibold text-rose-800 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200">
                                Χωρίς suffix: {header.XORIS_SUFIX}
                            </span>
                        ) : null}
                    </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={onToggle}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                        <ChevronDown
                            aria-hidden="true"
                            className={[
                                "size-4 transition",
                                expanded ? "rotate-180" : "",
                            ].join(" ")}
                        />
                        {expanded ? "Απόκρυψη" : "Γραμμές"}
                    </button>
                    <button
                        type="button"
                        onClick={onApply}
                        disabled={applying}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-500 px-4 text-xs font-semibold text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-wait disabled:opacity-60"
                    >
                        {applying ? (
                            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                        ) : (
                            <Check aria-hidden="true" className="size-4" />
                        )}
                        Εφαρμογή
                    </button>
                </div>
            </div>

            {expanded ? (
                <div className="border-t border-gray-100 px-4 py-4 dark:border-gray-800">
                    {linesLoading ? (
                        <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
                            <Loader2 className="size-5 animate-spin" />
                            Φόρτωση γραμμών…
                        </div>
                    ) : expandedLines && expandedLines.rows.length > 0 ? (
                        <LineGrid lines={expandedLines.rows} />
                    ) : (
                        <p className="py-4 text-sm text-gray-500">
                            Δεν βρέθηκαν γραμμές για το παραστατικό.
                        </p>
                    )}
                </div>
            ) : null}
        </article>
    );
}

export default function BasePricePurClient() {
    const {
        data: listData,
        isLoading,
        isFetching,
        isError,
        error,
        refetch,
    } = useBasePricePurListQuery(true);
    const itemsMutation = useBasePricePurItemsMutation();
    const applyMutation = useApplyBasePricePurMutation();

    const [search, setSearch] = useState("");
    const [expandedFindoc, setExpandedFindoc] = useState<string | null>(null);
    const [expandedLinesByFindoc, setExpandedLinesByFindoc] = useState<
        Record<string, ExpandedLinesState>
    >({});
    const [loadingFindoc, setLoadingFindoc] = useState<string | null>(null);
    const [applyingFindoc, setApplyingFindoc] = useState<string | null>(null);

    const refetchList = useCallback(() => {
        void refetch();
    }, [refetch]);

    useRequestListIntervalRefresh({
        enabled: true,
        refetch: refetchList,
    });

    const documents = useMemo(() => {
        const rows = listData?.rows ?? [];
        return groupBasePriceRowsByFindoc(rows);
    }, [listData?.rows]);

    const filteredDocuments = useMemo(() => {
        return documents.filter((doc) =>
            matchesBasePricePurSearch(
                search,
                doc.header.FINCODE,
                doc.header.PROMITHEYTIS,
                doc.header.PARASTATIKO
            )
        );
    }, [documents, search]);

    const setLinesFromList = useCallback((document: BasePricePurDocument) => {
        setExpandedLinesByFindoc((current) => ({
            ...current,
            [document.findoc]: {
                source: "list",
                rows: document.lines,
            },
        }));
    }, []);

    const refreshLinesFromItems = useCallback(
        async (document: BasePricePurDocument) => {
            setLoadingFindoc(document.findoc);

            try {
                const response = await itemsMutation.mutateAsync({
                    findoc: document.findoc,
                });

                const rows =
                    response.rows.length > 0
                        ? response.rows
                        : document.lines;

                setExpandedLinesByFindoc((current) => ({
                    ...current,
                    [document.findoc]: {
                        source:
                            response.rows.length > 0 ? "items" : "list",
                        rows,
                    },
                }));
            } catch (error) {
                setLinesFromList(document);

                toast.error(
                    error instanceof Error
                        ? error.message
                        : "Αποτυχία φόρτωσης γραμμών από το ERP."
                );
            } finally {
                setLoadingFindoc(null);
            }
        },
        [itemsMutation, setLinesFromList]
    );

    const handleToggleExpand = useCallback(
        (document: BasePricePurDocument) => {
            if (expandedFindoc === document.findoc) {
                setExpandedFindoc(null);
                return;
            }

            setExpandedFindoc(document.findoc);
            setLinesFromList(document);
            void refreshLinesFromItems(document);
        },
        [expandedFindoc, refreshLinesFromItems, setLinesFromList]
    );

    const handleApply = useCallback(
        async (document: BasePricePurDocument) => {
            setApplyingFindoc(document.findoc);

            try {
                const response = await applyMutation.mutateAsync({
                    findoc: document.findoc,
                });
                const row = response.rows[0];
                const updated = row?.EIDI_ENIMEROTHIKAN ?? "0";

                toast.success(
                    `Οι τιμές εφαρμόστηκαν (${updated} είδη ενημερώθηκαν).`
                );

                if (expandedFindoc === document.findoc) {
                    setExpandedFindoc(null);
                }

                setExpandedLinesByFindoc((current) => {
                    const next = { ...current };
                    delete next[document.findoc];
                    return next;
                });
            } catch (error) {
                toast.error(
                    error instanceof Error
                        ? error.message
                        : "Αποτυχία εφαρμογής τιμών."
                );
            } finally {
                setApplyingFindoc(null);
            }
        },
        [applyMutation, expandedFindoc]
    );

    const isInitialLoading = isLoading && !listData;
    const isRefreshing = isFetching && !!listData;

    const filteredLineCount = filteredDocuments.reduce(
        (total, doc) => total + doc.lines.length,
        0
    );
    const headerCount = `${filteredDocuments.length} παραστατικά · ${filteredLineCount} γραμμές`;

    return (
        <div className="flex h-[calc(100dvh-8rem)] flex-col overflow-hidden md:h-[calc(100dvh-9rem)]">
            <div className="shrink-0">
                <PageBreadcrumb pageTitle="Διαμόρφωση Τιμών" />
            </div>

            <DataTable className="flex min-h-0 min-w-0 flex-1 flex-col">
                <DataTableHeader
                    title="Εκκρεμή παραστατικά"
                    description="Παραστατικά αγοράς με αλλαγή κόστος που αναμένουν έγκριση και ανατίμηση τιμών πώλησης."
                    count={headerCount}
                    action={(
                        <DataTableSearchBar
                            value={search}
                            onChange={setSearch}
                            onRefresh={() => void refetchList()}
                            isRefreshing={isRefreshing}
                            refreshDisabled={isInitialLoading}
                            placeholder="Αναζήτηση κωδικού, προμηθευτή, παραστατικού…"
                        />
                    )}
                />

            {isInitialLoading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
                    <Loader2 className="size-6 animate-spin" />
                    Φόρτωση λίστας…
                </div>
            ) : isError ? (
                <DataTableEmptyState
                    icon={<Receipt className="size-6" aria-hidden="true" />}
                    title="Αποτυχία φόρτωσης"
                    description={
                        error instanceof Error
                            ? error.message
                            : "Δοκιμάστε ξανά."
                    }
                />
            ) : filteredDocuments.length === 0 ? (
                <DataTableEmptyState
                    icon={<Receipt className="size-6" aria-hidden="true" />}
                    title="Καμία εκκρεμότητα"
                    description={
                        search.trim()
                            ? "Δεν βρέθηκαν παραστατικά με αυτή την αναζήτηση."
                            : "Δεν υπάρχουν ασήμαντα παραστατικά προς διαμόρφωση τιμών."
                    }
                />
            ) : (
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                    {filteredDocuments.map((document) => (
                        <Fragment key={document.findoc}>
                            <DocumentCard
                                document={document}
                                expanded={expandedFindoc === document.findoc}
                                expandedLines={
                                    expandedLinesByFindoc[document.findoc] ?? null
                                }
                                linesLoading={loadingFindoc === document.findoc}
                                applying={applyingFindoc === document.findoc}
                                onToggle={() => handleToggleExpand(document)}
                                onApply={() => void handleApply(document)}
                            />
                        </Fragment>
                    ))}
                </div>
            )}
            </DataTable>
        </div>
    );
}
