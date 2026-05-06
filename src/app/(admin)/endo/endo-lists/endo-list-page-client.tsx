"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/template components/common/PageBreadCrumb";
import {
    Check,
    Loader2,
    Minus,
    Plus,
    RefreshCw,
    Search,
} from "@/lib/icons/lucide";
import {
    useFetchEndoListsMutation,
    useSubmitEndoBasketOrderMutation,
    useUpdateEndoListQtyMutation,
} from "@/hooks/queries/useApiMutations";
import { normalizeBranchCode, resolveBranchName } from "@/lib/auth/branches";
import { useAuthStore } from "@/stores/authStore";
import type {
    EndoListRoutePayload,
    IEndoListRow,
} from "@/lib/interface";
import EndoOrderSummary, {
    type EndoBasketUiItem,
} from "@/components/endo/endo-order-summary";

type EndoListScope = Exclude<EndoListRoutePayload["scope"], "both" | undefined>;
const REQUESTED_QTY_COLUMN_KEY = "__REQUESTED_QTY";
const QTY_ACTIONS_COLUMN_KEY = "__QTY_ACTIONS";
const CURRENT_STORE_STOCK_COLUMN_KEY = "__CURRENT_STORE_STOCK";
const NET_RESERVED_COLUMN_KEY = "__NET_RESERVED";

interface EndoListPageClientProps {
    scope: EndoListScope;
}

function formatColumnLabel(key: string) {
    if (key === CURRENT_STORE_STOCK_COLUMN_KEY) {
        return "Store Stock";
    }

    if (key === NET_RESERVED_COLUMN_KEY) {
        return "Net / Reserved";
    }

    if (key === REQUESTED_QTY_COLUMN_KEY) {
        return "Requested QTY";
    }

    if (key === QTY_ACTIONS_COLUMN_KEY) {
        return "Update / SALDOC";
    }

    return key.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

function formatDateTime(value?: string) {
    if (!value) return "—";

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleString("el-GR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getStatusClass(value: string) {
    const normalized = value.toUpperCase();

    if (
        normalized.includes("ΟΛΟΚΛΗΡ") ||
        normalized.includes("ΕΓΚΡΙΘ") ||
        normalized.includes("AVAILABLE")
    ) {
        return "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400";
    }

    if (normalized.includes("ΑΚΥΡ") || normalized.includes("ΑΠΟΡΡΙ")) {
        return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400";
    }

    return "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
}

function buildColumns(rows: IEndoListRow[]) {
    const keys = new Set<string>();

    rows.forEach((row) => {
        Object.keys(row).forEach((key) => keys.add(key));
    });

    const preferredOrder = [
        "BASKETID",
        "ID",
        "INS_DATE",
        "BRANCH",
        "TO_BRANCH",
        "MTRL",
        "ITEM_CODE",
        "ITEM_DESCR",
        "QTY",
        "QTY_REQUESTED",
        "STATUS",
        "STATUS_LABEL",
    ];

    return Array.from(keys).sort((a, b) => {
        const aIndex = preferredOrder.indexOf(a);
        const bIndex = preferredOrder.indexOf(b);

        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;

        return a.localeCompare(b, "el-GR");
    });
}

function filterRows(rows: IEndoListRow[], searchTerm: string) {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return rows;

    return rows.filter((row) =>
        Object.values(row).some((value) =>
            String(value).toLowerCase().includes(normalizedSearch)
        )
    );
}

function parseQtyValue(value: string) {
    const parsed = Number(String(value).trim().replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) {
        return 0;
    }

    return Math.floor(parsed);
}

function parsePositiveValue(value: unknown) {
    const parsed = Number(String(value ?? "").trim().replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 0;
    }

    return Math.floor(parsed);
}

function getRowKey(row: IEndoListRow, index: number) {
    return row.BASKETID || row.ID || `${row.MTRL ?? "row"}-${index}`;
}

function hasQtyUpdateFields(row: IEndoListRow) {
    const basketId = String(row.BASKETID ?? row.ID ?? "").trim();
    const mtrl = String(row.MTRL ?? "").trim();
    const toBranch = String(row.TO_BRANCH ?? "").trim();

    return Boolean(basketId && mtrl && toBranch);
}

function getRequestedQtyFromRow(row: IEndoListRow) {
    return parseQtyValue(row.QTY_REQUESTED || row.QTY || "0");
}

function canApproveRowWithQty(row: IEndoListRow, qty: number) {
    const basketId = String(row.BASKETID ?? row.ID ?? "").trim();
    const mtrl = parsePositiveValue(row.MTRL);
    const sourceBranch = parsePositiveValue(row.BRANCH);
    const destinationBranch = parsePositiveValue(row.TO_BRANCH);

    return Boolean(
        basketId &&
        mtrl > 0 &&
        qty > 0 &&
        sourceBranch > 0 &&
        destinationBranch > 0
    );
}

function getRowFieldValue(row: IEndoListRow, key: string) {
    const directValue = row[key];
    if (directValue !== undefined) {
        return String(directValue).trim();
    }

    const lookupKey = key.toLowerCase();
    const matchedKey = Object.keys(row).find(
        (entryKey) => entryKey.toLowerCase() === lookupKey
    );

    if (!matchedKey) {
        return "";
    }

    return String(row[matchedKey] ?? "").trim();
}

function getBranchStockValue(row: IEndoListRow, branchCode: string) {
    const normalizedBranchCode = String(branchCode ?? "").trim();
    if (!normalizedBranchCode) return "";

    const stockKey = `YP${normalizedBranchCode}`;
    return getRowFieldValue(row, stockKey);
}

function getNetQtyAvailableValue(row: IEndoListRow) {
    return getRowFieldValue(row, "NET_QTY_AVAILABLE") || getRowFieldValue(row, "TOTAL_AVAIL");
}

function getSoReservedValue(row: IEndoListRow) {
    return getRowFieldValue(row, "SoReserved") || getRowFieldValue(row, "SO_RESERVED");
}

function renderCell(key: string, value: string) {
    if (!value) {
        return "—";
    }

    if (/DATE|TS|TIME/i.test(key)) {
        return formatDateTime(value);
    }

    if (/STATUS/i.test(key)) {
        return (
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${getStatusClass(value)}`}>
                {value}
            </span>
        );
    }

    return value;
}

export default function EndoListPageClient({ scope }: EndoListPageClientProps) {
    const [rows, setRows] = useState<IEndoListRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [warning, setWarning] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [search, setSearch] = useState("");
    const [editedQtyByRow, setEditedQtyByRow] = useState<Record<string, string>>(
        {}
    );
    const [requestedQtyByRow, setRequestedQtyByRow] = useState<Record<string, number>>(
        {}
    );
    const [finalQtyByRow, setFinalQtyByRow] = useState<Record<string, number>>({});
    const [savingRowKeys, setSavingRowKeys] = useState<Set<string>>(new Set());
    const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());
    const [approvingBulk, setApprovingBulk] = useState(false);
    const user = useAuthStore((state) => state.user);
    const { mutateAsync: fetchEndoLists } = useFetchEndoListsMutation();
    const { mutateAsync: submitEndoBasketOrder } = useSubmitEndoBasketOrderMutation();
    const { mutateAsync: updateEndoListQty } = useUpdateEndoListQtyMutation();
    const isReceivedScope = scope === "received";

    const currentBranchCode = useMemo(
        () => normalizeBranchCode(user?.s1code),
        [user?.s1code]
    );
    const hasValidBranch = currentBranchCode.length > 0;

    const currentBranchName = useMemo(() => {
        if (!hasValidBranch) {
            return "—";
        }

        const currentCode = normalizeBranchCode(currentBranchCode);
        const fromProfile = user?.listBranches?.find(
            (branch) => normalizeBranchCode(branch.s1Code) === currentCode
        )?.name;

        return resolveBranchName(currentCode, fromProfile);
    }, [currentBranchCode, hasValidBranch, user?.listBranches]);

    const listConfig = useMemo(
        () =>
            scope === "requested"
                ? {
                    pageTitle: "Ενδολίστα Παραλαβών",
                    title: "Τι Περιμένω Να Πάρω",
                    subtitle: "ENDO_LIST_ESO",
                }
                : {
                    pageTitle: "Ενδολίστα Αποστολών",
                    title: "Τι Περιμένω Να Δώσω",
                    subtitle: "ENDO_LIST_EXO",
                },
        [scope]
    );

    const loadRows = useCallback(async () => {
        setLoading(true);
        setError("");
        setWarning("");
        setSuccessMessage("");
        setEditedQtyByRow({});
        setRequestedQtyByRow({});
        setFinalQtyByRow({});
        setSavingRowKeys(new Set());
        setSelectedRowKeys(new Set());
        setApprovingBulk(false);

        if (!hasValidBranch) {
            setRows([]);
            setError("Δεν βρέθηκε ενεργό κατάστημα στο προφίλ χρήστη");
            setLoading(false);
            return;
        }

        try {
            const data = await fetchEndoLists({
                branch: currentBranchCode,
                scope,
            });

            const nextRows =
                scope === "requested"
                    ? data.requested.rows ?? []
                    : data.received.rows ?? [];

            setRows(nextRows);
            const nextRequestedQtyByRow: Record<string, number> = {};
            const nextFinalQtyByRow: Record<string, number> = {};
            nextRows.forEach((row, index) => {
                const rowKey = getRowKey(row, index);
                const requestedQty = getRequestedQtyFromRow(row);
                nextRequestedQtyByRow[rowKey] = requestedQty;
                nextFinalQtyByRow[rowKey] = requestedQty;
            });
            setRequestedQtyByRow(nextRequestedQtyByRow);
            setFinalQtyByRow(nextFinalQtyByRow);
            setWarning(String(data.message ?? "").trim());
        } catch (err) {
            setRows([]);
            setError(
                err instanceof Error
                    ? err.message
                    : "Αποτυχία φόρτωσης λίστας ενδοδιακίνησης"
            );
        } finally {
            setLoading(false);
        }
    }, [currentBranchCode, fetchEndoLists, hasValidBranch, scope]);

    useEffect(() => {
        loadRows();
    }, [loadRows]);

    const filteredRows = useMemo(() => filterRows(rows, search), [rows, search]);
    const columns = useMemo(() => buildColumns(filteredRows), [filteredRows]);
    const tableColumns = useMemo(() => {
        if (!isReceivedScope) {
            return columns;
        }

        const withoutQtyColumns = columns.filter(
            (column) =>
                column !== "QTY" &&
                column !== "QTY_REQUESTED" &&
                !/^YP\d+$/i.test(column) &&
                !/^THESI\d+$/i.test(column) &&
                column !== "NET_QTY_AVAILABLE" &&
                column !== "SoReserved" &&
                column !== "SO_RESERVED"
        );

        return [
            ...withoutQtyColumns,
            CURRENT_STORE_STOCK_COLUMN_KEY,
            NET_RESERVED_COLUMN_KEY,
            REQUESTED_QTY_COLUMN_KEY,
            QTY_ACTIONS_COLUMN_KEY,
        ];
    }, [columns, isReceivedScope]);
    const showSummaryAside = isReceivedScope;

    const selectedRowsForApproval = useMemo(
        () =>
            rows
                .map((row, index) => ({
                    row,
                    rowKey: getRowKey(row, index),
                }))
                .filter(
                    ({ row, rowKey }) =>
                        selectedRowKeys.has(rowKey) &&
                        canApproveRowWithQty(
                            row,
                            finalQtyByRow[rowKey] ??
                            requestedQtyByRow[rowKey] ??
                            getRequestedQtyFromRow(row)
                        )
                ),
        [finalQtyByRow, requestedQtyByRow, rows, selectedRowKeys]
    );
    const selectedRowsSummaryItems = useMemo<EndoBasketUiItem[]>(
        () =>
            selectedRowsForApproval.map(({ row, rowKey }) => ({
                uid: rowKey,
                basketIds: [
                    String(row.BASKETID ?? row.ID ?? "").trim(),
                ].filter(Boolean),
                mtrl: parsePositiveValue(row.MTRL),
                qty:
                    finalQtyByRow[rowKey] ??
                    requestedQtyByRow[rowKey] ??
                    getRequestedQtyFromRow(row),
                fromBranch: String(row.BRANCH ?? "—").trim() || "—",
                toBranch: String(row.TO_BRANCH ?? "—").trim() || "—",
                itemCode: String(row.ITEM_CODE ?? row.MTRL ?? "—").trim(),
                itemDescr: String(row.ITEM_DESCR ?? row.ITEM_NAME ?? "—").trim(),
                manufacturer:
                    String(row.MNF_DESCR ?? row.MANUFACTURER ?? "").trim() ||
                    undefined,
            })),
        [finalQtyByRow, requestedQtyByRow, selectedRowsForApproval]
    );

    const getResolvedQty = useCallback(
        (rowKey: string, row: IEndoListRow) => {
            const draft = editedQtyByRow[rowKey];
            const fallbackQty =
                finalQtyByRow[rowKey] ??
                requestedQtyByRow[rowKey] ??
                getRequestedQtyFromRow(row);

            if (draft === undefined) {
                return fallbackQty;
            }

            if (!draft.trim()) {
                return 0;
            }

            return parseQtyValue(draft);
        },
        [editedQtyByRow, finalQtyByRow, requestedQtyByRow]
    );

    const isQtyChanged = useCallback(
        (rowKey: string, row: IEndoListRow) => {
            if (!(rowKey in editedQtyByRow)) {
                return false;
            }

            const currentQty =
                finalQtyByRow[rowKey] ??
                requestedQtyByRow[rowKey] ??
                getRequestedQtyFromRow(row);
            const editedQty = getResolvedQty(rowKey, row);
            return currentQty !== editedQty;
        },
        [editedQtyByRow, finalQtyByRow, getResolvedQty, requestedQtyByRow]
    );

    const handleQtyInputChange = (rowKey: string, value: string) => {
        const normalized = value.trim();

        if (!normalized) {
            setEditedQtyByRow((prev) => ({
                ...prev,
                [rowKey]: "",
            }));
            return;
        }

        if (!/^\d+$/.test(normalized)) {
            return;
        }

        setEditedQtyByRow((prev) => ({
            ...prev,
            [rowKey]: normalized,
        }));
    };

    const handleQtyStep = (
        rowKey: string,
        row: IEndoListRow,
        delta: number
    ) => {
        const nextQty = Math.max(0, getResolvedQty(rowKey, row) + delta);

        setEditedQtyByRow((prev) => ({
            ...prev,
            [rowKey]: String(nextQty),
        }));
    };

    const addRowToSelection = useCallback((rowKey: string) => {
        setSelectedRowKeys((prev) => {
            if (prev.has(rowKey)) {
                return prev;
            }

            const next = new Set(prev);
            next.add(rowKey);
            return next;
        });
    }, []);
    const clearSelection = useCallback(() => {
        setSelectedRowKeys(new Set());
    }, []);
    const handleRemoveSelectedLine = useCallback((rowKey: string) => {
        setSelectedRowKeys((prev) => {
            if (!prev.has(rowKey)) {
                return prev;
            }

            const next = new Set(prev);
            next.delete(rowKey);
            return next;
        });
    }, []);

    const handleQtyUpdate = useCallback(
        async (rowKey: string, row: IEndoListRow) => {
            const basketId = String(row.BASKETID ?? row.ID ?? "").trim();
            const mtrl = String(row.MTRL ?? "").trim();
            const toBranch = String(row.TO_BRANCH ?? "").trim();
            const branch =
                String(row.BRANCH ?? "").trim() || String(currentBranchCode).trim();

            if (!basketId || !mtrl || !toBranch) {
                setError("Λείπουν απαραίτητα στοιχεία γραμμής για ενημέρωση ποσότητας");
                return;
            }

            const nextQty = getResolvedQty(rowKey, row);
            setError("");
            setSuccessMessage("");
            setSavingRowKeys((prev) => new Set(prev).add(rowKey));

            try {
                const data = await updateEndoListQty({
                    basketId,
                    qty: nextQty,
                    mtrl,
                    toBranch,
                    branch,
                    appUserId: user?.uid,
                });

                setEditedQtyByRow((prev) => {
                    const next = { ...prev };
                    delete next[rowKey];
                    return next;
                });
                setFinalQtyByRow((prev) => ({
                    ...prev,
                    [rowKey]: nextQty,
                }));

                const canBeIncludedInSummary = canApproveRowWithQty(row, nextQty);
                setSelectedRowKeys((prev) => {
                    const next = new Set(prev);
                    if (canBeIncludedInSummary) {
                        next.add(rowKey);
                    } else {
                        next.delete(rowKey);
                    }
                    return next;
                });

                setSuccessMessage(
                    String(data.message ?? "").trim() || "Η ποσότητα ενημερώθηκε"
                );
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Αποτυχία ενημέρωσης ποσότητας"
                );
            } finally {
                setSavingRowKeys((prev) => {
                    const next = new Set(prev);
                    next.delete(rowKey);
                    return next;
                });
            }
        },
        [currentBranchCode, getResolvedQty, updateEndoListQty, user?.uid]
    );

    const handleApproveSelected = useCallback(async () => {
        if (selectedRowsForApproval.length === 0) {
            return;
        }

        setError("");
        setSuccessMessage("");
        setApprovingBulk(true);

        try {
                const data = await submitEndoBasketOrder({
                    appUserId: user?.uid,
                    items: selectedRowsForApproval.map(({ row, rowKey }) => ({
                        basketIds: [
                            String(row.BASKETID ?? row.ID ?? "").trim(),
                        ],
                        mtrl: parsePositiveValue(row.MTRL),
                        qty:
                            finalQtyByRow[rowKey] ??
                            requestedQtyByRow[rowKey] ??
                            getRequestedQtyFromRow(row),
                        branch: parsePositiveValue(row.TO_BRANCH),
                        toBranch: parsePositiveValue(row.BRANCH),
                        itemCode: String(row.ITEM_CODE ?? "").trim() || undefined,
                        itemDescr: String(row.ITEM_DESCR ?? "").trim() || undefined,
                    })),
            });

            await loadRows();
            setSuccessMessage(
                String(data.message ?? "").trim() ||
                "Η μαζική έγκριση ενδοδιακίνησης καταχωρήθηκε"
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Αποτυχία μαζικής έγκρισης ενδοδιακίνησης"
            );
        } finally {
            setApprovingBulk(false);
        }
    }, [
        finalQtyByRow,
        loadRows,
        requestedQtyByRow,
        selectedRowsForApproval,
        submitEndoBasketOrder,
        user?.uid,
    ]);

    return (
        <div>
            <PageBreadcrumb pageTitle={listConfig.pageTitle} />

            <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50/70 px-5 py-4 dark:border-brand-500/20 dark:bg-brand-500/5">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">
                            Ενεργό Κατάστημα
                        </p>
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                            {currentBranchName} ({currentBranchCode})
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={loadRows}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                        {loading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        Ανανέωση
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                    {error}
                </div>
            )}

            {!error && warning && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
                    {warning}
                </div>
            )}

            {!error && !warning && successMessage && (
                <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-5 py-3 text-sm text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400">
                    {successMessage}
                </div>
            )}

            <div className={`grid gap-4 ${showSummaryAside ? "xl:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
                <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]">
                    <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                                    {listConfig.title} ({rows.length})
                                </h3>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {listConfig.subtitle}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 dark:border-gray-700 dark:bg-gray-900/50">
                                <Search className="h-3.5 w-3.5 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Αναζήτηση..."
                                    className="w-full bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-400 dark:text-gray-200"
                                />
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center px-5 py-20 text-gray-500 dark:text-gray-400">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Φόρτωση λίστας...
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="px-5 py-16 text-center text-sm text-gray-500 dark:text-gray-400">
                            Δεν υπάρχουν εγγραφές.
                        </div>
                    ) : filteredRows.length === 0 ? (
                        <div className="px-5 py-16 text-center text-sm text-gray-500 dark:text-gray-400">
                            Δεν βρέθηκαν αποτελέσματα για την αναζήτηση.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                                <thead className="bg-gray-50 dark:bg-white/[0.02]">
                                    <tr>
                                        {tableColumns.map((column) => (
                                            <th
                                                key={column}
                                                className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                                            >
                                                {formatColumnLabel(column)}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {filteredRows.map((row, index) => {
                                        const rowKey = getRowKey(row, index);
                                        const canEditQty = isReceivedScope && hasQtyUpdateFields(row);
                                        const requestedQty =
                                            requestedQtyByRow[rowKey] ??
                                            getRequestedQtyFromRow(row);
                                        const finalQty =
                                            finalQtyByRow[rowKey] ?? requestedQty;

                                        return (
                                            <tr key={rowKey}>
                                                {tableColumns.map((column) => {
                                                    if (
                                                        isReceivedScope &&
                                                        column === CURRENT_STORE_STOCK_COLUMN_KEY
                                                    ) {
                                                        const currentStoreStockValue =
                                                            getBranchStockValue(
                                                                row,
                                                                currentBranchCode
                                                            ) || "—";

                                                        return (
                                                            <td
                                                                key={`${rowKey}-${column}`}
                                                                className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-200"
                                                            >
                                                                <span className="inline-flex min-w-[70px] items-center justify-center rounded-lg border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
                                                                    {currentStoreStockValue}
                                                                </span>
                                                            </td>
                                                        );
                                                    }

                                                    if (
                                                        isReceivedScope &&
                                                        column === NET_RESERVED_COLUMN_KEY
                                                    ) {
                                                        const netQtyAvailable =
                                                            getNetQtyAvailableValue(row) ||
                                                            "—";
                                                        const soReserved =
                                                            getSoReservedValue(row) ||
                                                            "—";

                                                        return (
                                                            <td
                                                                key={`${rowKey}-${column}`}
                                                                className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-200"
                                                            >
                                                                <div className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900/40">
                                                                    <span className="font-medium text-gray-500 dark:text-gray-300">
                                                                        NET
                                                                    </span>
                                                                    <span className="font-semibold text-gray-800 dark:text-gray-100">
                                                                        {netQtyAvailable}
                                                                    </span>
                                                                    <span className="text-gray-300 dark:text-gray-600">
                                                                        /
                                                                    </span>
                                                                    <span className="font-medium text-gray-500 dark:text-gray-300">
                                                                        RES
                                                                    </span>
                                                                    <span className="font-semibold text-gray-800 dark:text-gray-100">
                                                                        {soReserved}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                        );
                                                    }

                                                    if (
                                                        isReceivedScope &&
                                                        column === REQUESTED_QTY_COLUMN_KEY
                                                    ) {
                                                        return (
                                                            <td
                                                                key={`${rowKey}-${column}`}
                                                                className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-200"
                                                            >
                                                                <span className="inline-flex min-w-[64px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
                                                                    {requestedQty}
                                                                </span>
                                                            </td>
                                                        );
                                                    }

                                                    if (
                                                        isReceivedScope &&
                                                        column === QTY_ACTIONS_COLUMN_KEY
                                                    ) {
                                                        if (!canEditQty) {
                                                            return (
                                                                <td
                                                                    key={`${rowKey}-${column}`}
                                                                    className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400"
                                                                >
                                                                    —
                                                                </td>
                                                            );
                                                        }

                                                        const rowSaving = savingRowKeys.has(rowKey);
                                                        const draftValue =
                                                            editedQtyByRow[rowKey] ??
                                                            (finalQty === 0
                                                                ? ""
                                                                : String(finalQty));
                                                        const resolvedQty = getResolvedQty(rowKey, row);
                                                        const qtyChanged = isQtyChanged(rowKey, row);
                                                        const rowSelected = selectedRowKeys.has(rowKey);
                                                        const canApproveWithResolvedQty =
                                                            canApproveRowWithQty(row, resolvedQty);

                                                        return (
                                                            <td
                                                                key={`${rowKey}-${column}`}
                                                                className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-200"
                                                            >
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            handleQtyStep(
                                                                                rowKey,
                                                                                row,
                                                                                -1
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            rowSaving ||
                                                                            resolvedQty <= 0
                                                                        }
                                                                        className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                                                                    >
                                                                        <Minus className="h-3.5 w-3.5" />
                                                                    </button>

                                                                    <input
                                                                        type="text"
                                                                        inputMode="numeric"
                                                                        value={draftValue}
                                                                        placeholder="0"
                                                                        disabled={rowSaving}
                                                                        onChange={(event) =>
                                                                            handleQtyInputChange(
                                                                                rowKey,
                                                                                event.target.value
                                                                            )
                                                                        }
                                                                        onKeyDown={(event) => {
                                                                            if (
                                                                                event.key === "Enter" &&
                                                                                qtyChanged
                                                                            ) {
                                                                                event.preventDefault();
                                                                                void handleQtyUpdate(
                                                                                    rowKey,
                                                                                    row
                                                                                );
                                                                            }
                                                                        }}
                                                                        className={`h-8 w-16 rounded-md border bg-white px-2 text-center text-xs font-medium text-gray-800 outline-none transition dark:bg-gray-900 dark:text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${qtyChanged
                                                                            ? "border-brand-400 ring-1 ring-brand-200 dark:border-brand-500 dark:ring-brand-500/20"
                                                                            : "border-gray-200 dark:border-gray-700"
                                                                            }`}
                                                                    />

                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            handleQtyStep(
                                                                                rowKey,
                                                                                row,
                                                                                1
                                                                            )
                                                                        }
                                                                        disabled={rowSaving}
                                                                        className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                                                                    >
                                                                        <Plus className="h-3.5 w-3.5" />
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            qtyChanged
                                                                                ? void handleQtyUpdate(
                                                                                    rowKey,
                                                                                    row
                                                                                )
                                                                                : addRowToSelection(rowKey)
                                                                        }
                                                                        disabled={rowSaving || !canApproveWithResolvedQty}
                                                                        className={`ml-1 inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-white transition disabled:opacity-40 ${rowSelected && !qtyChanged
                                                                            ? "bg-green-500 hover:bg-green-600"
                                                                            : "bg-brand-500 hover:bg-brand-600"
                                                                            }`}
                                                                    >
                                                                        {rowSaving ? (
                                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                        ) : (
                                                                            <Check className="h-3.5 w-3.5" />
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        );
                                                    }

                                                    return (
                                                        <td
                                                            key={`${rowKey}-${column}`}
                                                            className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-200"
                                                        >
                                                            {renderCell(column, row[column])}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {showSummaryAside && (
                    <EndoOrderSummary
                        currentBranchCode={currentBranchCode}
                        currentBranchName={currentBranchName}
                        basketItems={selectedRowsSummaryItems}
                        loading={false}
                        error=""
                        successMessage=""
                        sendingOrder={approvingBulk}
                        summaryLabel="Σύνοψη SALDOC"
                        summaryTitle="Έγκριση Ενδοαποστολής"
                        branchCardLabel="Κατάστημα Αποστολής"
                        linesLabel="Επιλεγμένες Γραμμές"
                        sendButtonLabel="Αποστολή SALDOC"
                        emptyStateLabel="Επίλεξε γραμμές από τη λίστα για να προστεθούν στο SALDOC."
                        onRemoveItem={handleRemoveSelectedLine}
                        onSendOrder={() => void handleApproveSelected()}
                        onClearSelection={clearSelection}
                    />
                )}
            </div>
        </div>
    );
}
