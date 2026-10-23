"use client";

import { Fragment, useCallback, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import DataTable from "@/components/ui/data-table/data-table";
import DataTableEmptyState from "@/components/ui/data-table/data-table-empty-state";
import DataTableHeader from "@/components/ui/data-table/data-table-header";
import DataTableSearchBar from "@/components/ui/data-table/data-table-search-bar";
import {
    ChevronDown,
    ListChevronsDownUp,
    ListChevronsUpDown,
    Loader2,
    Send,
    ShoppingCart,
} from "@/lib/icons/lucide";
import type { IStockRequestListRow } from "@/lib/interface";
import {
    useFetchStockRequestsMutation,
    useSubmitSupplierBasketOrderMutation,
    useUpdateStockRequestMutation,
} from "@/hooks/queries/useApiMutations";
import { useRequestListIntervalRefresh } from "@/hooks/queries/useRequestListIntervalRefresh";
import { useLoadOnChange } from "@/hooks/useLoadOnChange";
import { useSessionState } from "@/hooks/useSessionState";
import { useAuthStore } from "@/stores/authStore";
import { normalizeBranchCode } from "@/lib/auth/branches";
import { formatDateTime } from "@/lib/utils/stock-requests";
import toast from "react-hot-toast";

const QUANTITY_OPTIONS = Array.from({ length: 100 }, (_, index) => index + 1);

type SupplierBasketGroup = {
    key: string;
    trdr: string;
    name: string;
    code: string;
    rows: IStockRequestListRow[];
    requestedQty: number;
};

function normalizedValue(value: string | null | undefined) {
    return String(value ?? "").trim();
}

function toNumber(value: string) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function getRequestedQuantity(row: IStockRequestListRow) {
    const quantity = Number(row.QTY_REQUESTED);

    return Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
}

function getQuantityOptions(currentQuantity: number) {
    if (QUANTITY_OPTIONS.includes(currentQuantity)) return QUANTITY_OPTIONS;

    return [...QUANTITY_OPTIONS, currentQuantity].sort((first, second) => first - second);
}

function getLocalIsoDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function sortBasketRows(rows: IStockRequestListRow[]) {
    return [...rows].sort((first, second) => {
        const dateDifference = second.INS_DATE.localeCompare(first.INS_DATE);

        if (dateDifference !== 0) return dateDifference;

        return Number(second.BASKETID) - Number(first.BASKETID);
    });
}

function groupRowsBySupplier(rows: IStockRequestListRow[]): SupplierBasketGroup[] {
    const groups = new Map<string, SupplierBasketGroup>();

    for (const row of rows) {
        const supplierName = normalizedValue(row.TRDR_NAME) || "Χωρίς προμηθευτή";
        const supplierCode = normalizedValue(row.TRDR_CODE) || "—";
        const supplierTrdr = normalizedValue(row.TRDR);
        const key =
            supplierTrdr ||
            normalizedValue(row.TRDR_CODE) ||
            supplierName;
        const existing = groups.get(key);

        if (existing) {
            existing.rows.push(row);
            existing.requestedQty += toNumber(row.QTY_REQUESTED);
            continue;
        }

        groups.set(key, {
            key,
            trdr: supplierTrdr,
            name: supplierName,
            code: supplierCode,
            rows: [row],
            requestedQty: toNumber(row.QTY_REQUESTED),
        });
    }

    return Array.from(groups.values())
        .map((group) => ({ ...group, rows: sortBasketRows(group.rows) }))
        .sort((first, second) => first.name.localeCompare(second.name, "el-GR"));
}

export default function CompanyStockRequestsClient() {
    const user = useAuthStore((state) => state.user);
    const currentBranchCode = useMemo(
        () => normalizeBranchCode(user?.mainBranch),
        [user?.mainBranch]
    );
    const { mutateAsync: fetchStockRequests } = useFetchStockRequestsMutation();
    const { mutateAsync: updateStockRequest } = useUpdateStockRequestMutation();
    const { mutateAsync: submitSupplierBasketOrder } =
        useSubmitSupplierBasketOrderMutation();
    const [rows, setRows] = useState<IStockRequestListRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedSupplierKeys, setExpandedSupplierKeys] = useState<Set<string>>(
        new Set()
    );
    const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());
    const [updatingBasketIds, setUpdatingBasketIds] = useState<Set<string>>(
        new Set()
    );
    const [sendingSupplierKeys, setSendingSupplierKeys] = useState<Set<string>>(
        new Set()
    );
    const [searchTerm, setSearchTerm] = useSessionState(
        "company-stock-requests-search",
        ""
    );

    const loadRows = useCallback(async () => {
        setLoading(true);

        if (!currentBranchCode) {
            setRows([]);
            setLoading(false);
            return;
        }

        try {
            const data = await fetchStockRequests({
                branch: currentBranchCode,
                origin: "PASCHALIDIS",
            });

            setRows(sortBasketRows(data.rows ?? []));
            setExpandedSupplierKeys(new Set());
            setExpandedRowIds(new Set());
        } catch (error) {
            setRows([]);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Αποτυχία φόρτωσης καλαθιών ανατροφοδοσίας εταιρίας."
            );
        } finally {
            setLoading(false);
        }
    }, [currentBranchCode, fetchStockRequests]);

    const refreshRows = useCallback(async () => {
        if (!currentBranchCode) return;

        try {
            const data = await fetchStockRequests({
                branch: currentBranchCode,
                origin: "PASCHALIDIS",
            });

            setRows(sortBasketRows(data.rows ?? []));
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Αποτυχία ανανέωσης καλαθιών ανατροφοδοσίας εταιρίας."
            );
        }
    }, [currentBranchCode, fetchStockRequests]);

    useLoadOnChange(loadRows);
    useRequestListIntervalRefresh({
        enabled: Boolean(currentBranchCode),
        refetch: refreshRows,
    });

    const allSupplierGroups = useMemo(() => groupRowsBySupplier(rows), [rows]);

    const supplierGroups = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();

        if (!query) return allSupplierGroups;

        return allSupplierGroups.filter((group) =>
            [
                group.name,
                group.code,
                group.trdr,
                ...group.rows.flatMap((row) => [
                    row.BASKETID,
                    row.MTRL,
                    row.ITEM_CODE,
                    row.ITEM_NAME,
                ]),
            ]
                .join(" ")
                .toLowerCase()
                .includes(query)
        );
    }, [allSupplierGroups, searchTerm]);

    const visibleLineCount = useMemo(
        () =>
            supplierGroups.reduce(
                (total, group) => total + group.rows.length,
                0
            ),
        [supplierGroups]
    );

    const totalRequestedQty = useMemo(
        () =>
            supplierGroups.reduce(
                (total, group) => total + group.requestedQty,
                0
            ),
        [supplierGroups]
    );

    const areAllSupplierBasketsExpanded =
        supplierGroups.length > 0 &&
        supplierGroups.every((group) => expandedSupplierKeys.has(group.key));

    const toggleAllSupplierBaskets = () => {
        setExpandedSupplierKeys(
            areAllSupplierBasketsExpanded
                ? new Set()
                : new Set(supplierGroups.map((group) => group.key))
        );
    };

    const toggleSupplierBasket = (supplierKey: string) => {
        setExpandedSupplierKeys((currentKeys) => {
            const nextKeys = new Set(currentKeys);

            if (nextKeys.has(supplierKey)) {
                nextKeys.delete(supplierKey);
            } else {
                nextKeys.add(supplierKey);
            }

            return nextKeys;
        });
    };

    const toggleRowExpanded = (basketId: string) => {
        setExpandedRowIds((currentIds) => {
            const nextIds = new Set(currentIds);

            if (nextIds.has(basketId)) {
                nextIds.delete(basketId);
            } else {
                nextIds.add(basketId);
            }

            return nextIds;
        });
    };

    const handleQuantityChange = useCallback(
        async (row: IStockRequestListRow, nextQuantity: number) => {
            const basketId = Number(row.BASKETID);

            if (!Number.isInteger(basketId) || basketId <= 0) {
                toast.error("Μη έγκυρο αναγνωριστικό καλαθιού.");
                return;
            }

            if (!Number.isInteger(nextQuantity) || nextQuantity <= 0) {
                toast.error("Η ποσότητα πρέπει να είναι θετικός ακέραιος αριθμός.");
                return;
            }

            const nextQuantityValue = String(nextQuantity);
            const previousQuantityValue = row.QTY_REQUESTED;

            if (nextQuantityValue === previousQuantityValue) return;

            setUpdatingBasketIds((currentIds) =>
                new Set(currentIds).add(row.BASKETID)
            );
            setRows((currentRows) =>
                currentRows.map((currentRow) =>
                    currentRow.BASKETID === row.BASKETID
                        ? { ...currentRow, QTY_REQUESTED: nextQuantityValue }
                        : currentRow
                )
            );

            try {
                await updateStockRequest({
                    action: "UPDATE",
                    basketId,
                    qty: nextQuantityValue,
                });
                toast.success("Η προτιμώμενη ποσότητα ενημερώθηκε.");
            } catch (error) {
                setRows((currentRows) =>
                    currentRows.map((currentRow) =>
                        currentRow.BASKETID === row.BASKETID
                            ? { ...currentRow, QTY_REQUESTED: previousQuantityValue }
                            : currentRow
                    )
                );
                toast.error(
                    error instanceof Error
                        ? error.message
                        : "Αποτυχία ενημέρωσης ποσότητας."
                );
            } finally {
                setUpdatingBasketIds((currentIds) => {
                    const nextIds = new Set(currentIds);
                    nextIds.delete(row.BASKETID);
                    return nextIds;
                });
            }
        },
        [updateStockRequest]
    );

    const handleSubmitSupplierBasket = useCallback(
        async (group: SupplierBasketGroup) => {
            if (!currentBranchCode) {
                toast.error("Δεν είναι διαθέσιμο το υποκατάστημα σύνδεσης.");
                return;
            }

            if (!group.trdr) {
                toast.error("Το καλάθι δεν έχει έγκυρο προμηθευτή TRDR.");
                return;
            }

            const confirmed = window.confirm(
                `Αποστολή PURDOC για ${group.name} (${group.code});\n` +
                    `${group.rows.length} γραμμές · ${group.requestedQty} τεμ.`
            );

            if (!confirmed) return;

            setSendingSupplierKeys((currentKeys) =>
                new Set(currentKeys).add(group.key)
            );

            try {
                const result = await submitSupplierBasketOrder({
                    branch: currentBranchCode,
                    supplierTrdr: group.trdr,
                    transactionDate: getLocalIsoDate(),
                    items: group.rows,
                });
                const submittedIds = new Set(
                    result.basketIds?.length
                        ? result.basketIds
                        : group.rows.map((row) => row.BASKETID)
                );

                setRows((currentRows) =>
                    currentRows.filter((row) => !submittedIds.has(row.BASKETID))
                );
                setExpandedSupplierKeys((currentKeys) => {
                    const nextKeys = new Set(currentKeys);
                    nextKeys.delete(group.key);
                    return nextKeys;
                });

                const documentId = String(result.id ?? "").trim();
                toast.success(
                    documentId
                        ? `Το PURDOC ${documentId} δημιουργήθηκε επιτυχώς.`
                        : "Το PURDOC δημιουργήθηκε επιτυχώς."
                );
            } catch (error) {
                toast.error(
                    error instanceof Error
                        ? error.message
                        : "Αποτυχία αποστολής καλαθιού προμηθευτή."
                );
            } finally {
                setSendingSupplierKeys((currentKeys) => {
                    const nextKeys = new Set(currentKeys);
                    nextKeys.delete(group.key);
                    return nextKeys;
                });
            }
        },
        [currentBranchCode, submitSupplierBasketOrder]
    );

    return (
        <div className="flex min-h-[calc(100dvh-8rem)] min-w-0 max-w-full flex-col md:min-h-[calc(100dvh-9rem)] xl:h-[calc(100dvh-9rem)] xl:min-h-0 xl:overflow-hidden">
            <div className="shrink-0">
                <PageBreadcrumb pageTitle="Καλάθια Ανατροφοδοσίας Εταιρίας" />
            </div>

            {loading ? (
                <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-gray-200 bg-white px-5 py-16 text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Φόρτωση καλαθιών εταιρίας...
                </div>
            ) : (
                <DataTable className="flex min-h-[420px] min-w-0 max-w-full flex-1 flex-col">
                    <DataTableHeader
                        title={(
                            <span className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={toggleAllSupplierBaskets}
                                    disabled={supplierGroups.length === 0}
                                    aria-label={
                                        areAllSupplierBasketsExpanded
                                            ? "Σύμπτυξη όλων των καλαθιών"
                                            : "Ανάπτυξη όλων των καλαθιών"
                                    }
                                    title={
                                        areAllSupplierBasketsExpanded
                                            ? "Σύμπτυξη όλων"
                                            : "Ανάπτυξη όλων"
                                    }
                                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                                >
                                    {areAllSupplierBasketsExpanded ? (
                                        <ListChevronsDownUp className="h-4 w-4" strokeWidth={2.25} />
                                    ) : (
                                        <ListChevronsUpDown className="h-4 w-4" strokeWidth={2.25} />
                                    )}
                                </button>
                                <span>Καλάθια Προμηθευτών</span>
                            </span>
                        )}
                        description="Συγκεντρωτική προβολή ειδών ανατροφοδοσίας εταιρίας ανά προμηθευτή."
                        count={(
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="rounded-full bg-brand-50 px-2.5 py-1 font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                                    {supplierGroups.length} προμηθευτές
                                </span>
                                <span className="rounded-full bg-gray-100 px-2.5 py-1 font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                    {visibleLineCount} γραμμές
                                </span>
                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                    {totalRequestedQty} τεμ.
                                </span>
                            </div>
                        )}
                        action={(
                            <DataTableSearchBar
                                value={searchTerm}
                                onChange={setSearchTerm}
                                onRefresh={loadRows}
                                isRefreshing={loading}
                                refreshDisabled={loading}
                                placeholder="Αναζήτηση προμηθευτή, είδους ή καλαθιού..."
                            />
                        )}
                    />

                    {supplierGroups.length === 0 ? (
                        <DataTableEmptyState
                            icon={<ShoppingCart className="h-7 w-7" />}
                            title={
                                rows.length === 0
                                    ? "Δεν υπάρχουν καλάθια προμηθευτών"
                                    : "Δεν βρέθηκαν αποτελέσματα"
                            }
                            description={
                                rows.length === 0
                                    ? "Δεν υπάρχουν καταχωρημένα είδη κεντρικού εφοδιασμού."
                                    : "Η αναζήτηση δεν επέστρεψε προμηθευτές ή είδη."
                            }
                            className="flex-1"
                        />
                    ) : (
                        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-gray-50/60 p-4 dark:bg-gray-950/30 sm:p-5">
                            {supplierGroups.map((group) => {
                                const isSupplierExpanded = expandedSupplierKeys.has(
                                    group.key
                                );
                                const isSupplierSending = sendingSupplierKeys.has(
                                    group.key
                                );

                                return (
                                <section
                                    key={group.key}
                                    className="grid grid-cols-[48px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900/60"
                                >
                                    <div className="flex items-start justify-center border-r border-brand-100 bg-gradient-to-b from-brand-50/80 to-white pt-3 dark:border-brand-500/15 dark:from-brand-500/10 dark:to-transparent">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                toggleSupplierBasket(group.key)
                                            }
                                            aria-expanded={isSupplierExpanded}
                                            aria-controls={`supplier-basket-${group.key}`}
                                            aria-label={
                                                isSupplierExpanded
                                                    ? `Απόκρυψη γραμμών ${group.name}`
                                                    : `Προβολή γραμμών ${group.name}`
                                            }
                                            title={
                                                isSupplierExpanded
                                                    ? "Απόκρυψη γραμμών"
                                                    : "Προβολή γραμμών"
                                            }
                                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-white hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                                        >
                                            <ChevronDown
                                                strokeWidth={2.25}
                                                className={`h-4 w-4 transition-transform ${isSupplierExpanded ? "rotate-180" : ""}`}
                                            />
                                        </button>
                                    </div>

                                    <div className="min-w-0">
                                    <header
                                        className={`flex flex-col gap-3 bg-gradient-to-r from-brand-50/60 via-white to-white px-4 py-3 dark:from-brand-500/[0.08] dark:via-transparent dark:to-transparent sm:flex-row sm:items-center sm:justify-between ${isSupplierExpanded ? "border-b border-gray-100 dark:border-gray-800" : ""}`}
                                    >
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-300">
                                                Προμηθευτής
                                            </p>
                                            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-2">
                                                <h2 className="truncate text-base font-semibold text-gray-900 dark:text-white">
                                                    {group.name}
                                                </h2>
                                                <span className="rounded-full border border-brand-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
                                                    Κωδικός: {group.code}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                                            <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                                                Γραμμές
                                                <strong className="font-semibold tabular-nums text-gray-800 dark:text-gray-100">
                                                    {group.rows.length}
                                                </strong>
                                            </span>
                                            <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50/70 px-2.5 text-xs text-brand-600 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-300">
                                                Ποσότητα
                                                <strong className="font-semibold tabular-nums text-brand-700 dark:text-brand-200">
                                                    {group.requestedQty}
                                                </strong>
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    void handleSubmitSupplierBasket(group)
                                                }
                                                disabled={isSupplierSending || !group.trdr}
                                                title={
                                                    group.trdr
                                                        ? "Αποστολή καλαθιού προμηθευτή στο SoftOne"
                                                        : "Λείπει το TRDR του προμηθευτή"
                                                }
                                                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 text-xs font-semibold text-brand-700 transition hover:border-brand-300 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400 dark:border-brand-500/30 dark:bg-transparent dark:text-brand-300 dark:hover:border-brand-500/50 dark:hover:bg-brand-500/10 dark:disabled:border-gray-700 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
                                            >
                                                {isSupplierSending ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Send className="h-3.5 w-3.5" />
                                                )}
                                                {isSupplierSending
                                                    ? "Αποστολή..."
                                                    : "Αποστολή στο S1"}
                                            </button>
                                        </div>
                                    </header>

                                    {isSupplierExpanded ? (
                                    <div
                                        id={`supplier-basket-${group.key}`}
                                        className="overflow-x-auto"
                                    >
                                        <table className="w-full min-w-[760px] table-fixed text-xs xl:text-sm">
                                            <colgroup>
                                                <col className="w-[7%]" />
                                                <col className="w-[13%]" />
                                                <col className="w-[45%]" />
                                                <col className="w-[15%]" />
                                                <col className="w-[20%]" />
                                            </colgroup>
                                            <thead className="bg-gray-50 text-gray-500 dark:bg-gray-950/50">
                                                <tr>
                                                    <th className="px-3 py-3" />
                                                    <th className="px-3 py-3 text-left font-semibold">
                                                        ID
                                                    </th>
                                                    <th className="px-3 py-3 text-left font-semibold">
                                                        Είδος
                                                    </th>
                                                    <th className="px-3 py-3 text-center font-semibold">
                                                        Ποσότητα
                                                    </th>
                                                    <th className="px-3 py-3 text-left font-semibold">
                                                        Ημερομηνία
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                {group.rows.map((row) => {
                                                    const isExpanded = expandedRowIds.has(
                                                        row.BASKETID
                                                    );
                                                    const isUpdatingQuantity =
                                                        updatingBasketIds.has(row.BASKETID);
                                                    const requestedQuantity =
                                                        getRequestedQuantity(row);

                                                    return (
                                                        <Fragment key={row.BASKETID}>
                                                            <tr className="align-top transition hover:bg-gray-50/70 dark:hover:bg-white/[0.02]">
                                                                <td className="px-3 py-4 text-center">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            toggleRowExpanded(
                                                                                row.BASKETID
                                                                            )
                                                                        }
                                                                        aria-expanded={isExpanded}
                                                                        aria-controls={`company-stock-request-${row.BASKETID}`}
                                                                        aria-label={
                                                                            isExpanded
                                                                                ? "Απόκρυψη λεπτομερειών"
                                                                                : "Εμφάνιση λεπτομερειών"
                                                                        }
                                                                        title={
                                                                            isExpanded
                                                                                ? "Απόκρυψη λεπτομερειών"
                                                                                : "Εμφάνιση λεπτομερειών"
                                                                        }
                                                                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                                                                    >
                                                                        <ChevronDown
                                                                            strokeWidth={2.25}
                                                                            className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                                                        />
                                                                    </button>
                                                                </td>
                                                                <td className="px-3 py-4 font-semibold text-gray-700 dark:text-gray-200">
                                                                    #{row.BASKETID}
                                                                </td>
                                                                <td className="px-3 py-4">
                                                                    <div className="font-medium text-gray-800 dark:text-gray-100">
                                                                        {row.ITEM_NAME || "—"}
                                                                    </div>
                                                                    <div className="mt-1 text-xs text-gray-400">
                                                                        {row.ITEM_CODE || row.MTRL}
                                                                    </div>
                                                                </td>
                                                                <td className="px-3 py-4 text-center">
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <select
                                                                            value={requestedQuantity}
                                                                            onChange={(event) =>
                                                                                void handleQuantityChange(
                                                                                    row,
                                                                                    Number(
                                                                                        event.target
                                                                                            .value
                                                                                    )
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                isUpdatingQuantity ||
                                                                                isSupplierSending
                                                                            }
                                                                            aria-label={`Προτιμώμενη ποσότητα για ${row.ITEM_CODE || row.MTRL}`}
                                                                            className="h-9 w-20 rounded-lg border border-brand-200 bg-brand-50 px-2 text-center text-sm font-semibold tabular-nums text-brand-700 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-wait disabled:opacity-60 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200"
                                                                        >
                                                                            {getQuantityOptions(
                                                                                requestedQuantity
                                                                            ).map((quantity) => (
                                                                                <option
                                                                                    key={quantity}
                                                                                    value={quantity}
                                                                                >
                                                                                    {quantity}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                        {isUpdatingQuantity ? (
                                                                            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-500" />
                                                                        ) : null}
                                                                    </div>
                                                                </td>
                                                                <td className="px-3 py-4 text-gray-500">
                                                                    {formatDateTime(row.INS_DATE)}
                                                                </td>
                                                            </tr>

                                                            {isExpanded ? (
                                                                <tr
                                                                    id={`company-stock-request-${row.BASKETID}`}
                                                                    className="bg-gray-50/70 dark:bg-gray-950/40"
                                                                >
                                                                    <td colSpan={5} className="px-5 py-3">
                                                                        <div className="ml-10 grid grid-cols-2 gap-3 rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:grid-cols-4">
                                                                            <div>
                                                                                <div className="text-[10px] text-gray-400">
                                                                                    MTRL
                                                                                </div>
                                                                                <div className="mt-0.5 text-gray-800 dark:text-gray-200">
                                                                                    {row.MTRL}
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <div className="text-[10px] text-gray-400">
                                                                                    Εγκεκριμένη ποσότητα
                                                                                </div>
                                                                                <div className="mt-0.5 tabular-nums text-gray-800 dark:text-gray-200">
                                                                                    {row.QTY}
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <div className="text-[10px] text-gray-400">
                                                                                    Παραγγελθέν
                                                                                </div>
                                                                                <div className="mt-0.5 tabular-nums text-gray-800 dark:text-gray-200">
                                                                                    {row.ORDERED}
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <div className="text-[10px] text-gray-400">
                                                                                    Σε άλλα καλάθια
                                                                                </div>
                                                                                <div className="mt-0.5 tabular-nums text-gray-800 dark:text-gray-200">
                                                                                    {row.QTY_IN_BASKETS}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ) : null}
                                                        </Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    ) : null}
                                    </div>
                                </section>
                                );
                            })}
                        </div>
                    )}
                </DataTable>
            )}
        </div>
    );
}
