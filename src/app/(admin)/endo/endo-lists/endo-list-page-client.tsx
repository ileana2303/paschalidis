"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import DataTable from "@/components/ui/data-table/data-table";
import DataTableEmptyState from "@/components/ui/data-table/data-table-empty-state";
import DataTableHeader from "@/components/ui/data-table/data-table-header";
import DataTableSearchBar from "@/components/ui/data-table/data-table-search-bar";
import NumberBadge from "@/components/ui/data-table/number-badge";
import QuantityControl from "@/components/ui/quantity-control";
import StatusBadge from "@/components/ui/data-table/status-badge";
import {
    Check,
    Loader2,
    Minus,
    Send,
} from "@/lib/icons/lucide";
import {
    useFetchEndoListsMutation,
    useSubmitEndoBasketOrderMutation,
    useUpdateEndoListQtyMutation,
} from "@/hooks/queries/useApiMutations";
import { normalizeBranchCode } from "@/lib/auth/branches";
import { useAuthStore } from "@/stores/authStore";
import type {
    EndoListRoutePayload,
    IEndoListRow,
} from "@/lib/interface";

type EndoListScope = Exclude<EndoListRoutePayload["scope"], "both" | undefined>;

const REQUESTED_QTY_COLUMN_KEY = "__REQUESTED_QTY";
const QTY_ACTIONS_COLUMN_KEY = "__QTY_ACTIONS";

interface EndoListPageClientProps {
    scope: EndoListScope;
}

function formatColumnLabel(key: string) {
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

    if (!normalizedSearch) {
        return rows;
    }

    return rows.filter((row) =>
        Object.values(row).some((value) =>
            String(value ?? "").toLowerCase().includes(normalizedSearch)
        )
    );
}

function parseQtyValue(value: unknown) {
    const parsed = Number(String(value ?? "").trim().replace(",", "."));

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
    return String(row.BASKETID || row.ID || `${row.MTRL ?? "row"}-${index}`);
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

function renderCell(key: string, value: unknown) {
    if (value == null || value === "") {
        return "—";
    }

    const displayValue = String(value);

    if (/DATE|TS|TIME/i.test(key)) {
        return formatDateTime(displayValue);
    }

    if (/STATUS/i.test(key)) {
        return <StatusBadge status={displayValue} />;
    }

    return displayValue;
}

export default function EndoListPageClient({ scope }: EndoListPageClientProps) {
    const [rows, setRows] = useState<IEndoListRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [warning, setWarning] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [search, setSearch] = useState("");

    const [editedQtyByRow, setEditedQtyByRow] = useState<Record<string, string>>({});
    const [requestedQtyByRow, setRequestedQtyByRow] = useState<Record<string, number>>({});
    const [finalQtyByRow, setFinalQtyByRow] = useState<Record<string, number>>({});

    const [savingRowKeys, setSavingRowKeys] = useState<Set<string>>(new Set());
    const [submittingRowKeys, setSubmittingRowKeys] = useState<Set<string>>(new Set());

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

    const listConfig = useMemo(
        () =>
            scope === "requested"
                ? {
                    pageTitle: "Αιτήματα Ενδοδιακίνησης",
                    title: "Λίστα εκκρεμών αιτημάτων ενδοδιακίνησης καταστήματος",
                    subtitle: "ENDO_LIST_ESO",
                }
                : {
                    pageTitle: "Διαχείριση Ενδοδιακίνησης",
                    title: "Διαχείριση αιτημάτων ενδοδιακίνησης προς άλλα καταστήματα",
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
        setSubmittingRowKeys(new Set());

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

            const nextRequestedQtyByRow: Record<string, number> = {};
            const nextFinalQtyByRow: Record<string, number> = {};

            nextRows.forEach((row, index) => {
                const rowKey = getRowKey(row, index);
                const requestedQty = getRequestedQtyFromRow(row);

                nextRequestedQtyByRow[rowKey] = requestedQty;
                nextFinalQtyByRow[rowKey] = requestedQty;
            });

            setRows(nextRows);
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
            REQUESTED_QTY_COLUMN_KEY,
            QTY_ACTIONS_COLUMN_KEY,
        ];
    }, [columns, isReceivedScope]);

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

    const setEditedQuantity = useCallback((rowKey: string, nextQuantity: number) => {
        const normalizedQty = Number.isFinite(nextQuantity)
            ? Math.max(0, Math.floor(nextQuantity))
            : 0;

        setEditedQtyByRow((prev) => ({
            ...prev,
            [rowKey]: String(normalizedQty),
        }));
    }, []);

    const resetEditedQuantity = useCallback((rowKey: string) => {
        setEditedQtyByRow((prev) => {
            const next = { ...prev };
            delete next[rowKey];
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

                resetEditedQuantity(rowKey);

                setFinalQtyByRow((prev) => ({
                    ...prev,
                    [rowKey]: nextQty,
                }));

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
        [
            currentBranchCode,
            getResolvedQty,
            resetEditedQuantity,
            updateEndoListQty,
            user?.uid,
        ]
    );

    const handleSubmitRow = useCallback(
        async (rowKey: string, row: IEndoListRow) => {
            const basketId = String(row.BASKETID ?? row.ID ?? "").trim();

            const qty =
                finalQtyByRow[rowKey] ??
                requestedQtyByRow[rowKey] ??
                getRequestedQtyFromRow(row);

            if (!basketId) {
                setError("Δεν βρέθηκε BASKETID για τη γραμμή");
                return;
            }

            if (!canApproveRowWithQty(row, qty)) {
                setError("Μη έγκυρα στοιχεία γραμμής για αποστολή SALDOC");
                return;
            }

            setError("");
            setSuccessMessage("");
            setSubmittingRowKeys((prev) => new Set(prev).add(rowKey));

            try {
                const data = await submitEndoBasketOrder({
                    appUserId: user?.uid,
                    items: [
                        {
                            basketIds: [basketId],
                            mtrl: parsePositiveValue(row.MTRL),
                            qty,
                            branch: parsePositiveValue(row.TO_BRANCH),
                            toBranch: parsePositiveValue(row.BRANCH),
                            itemCode: String(row.ITEM_CODE ?? "").trim() || undefined,
                            itemDescr: String(row.ITEM_DESCR ?? "").trim() || undefined,
                        },
                    ],
                });

                await loadRows();

                setSuccessMessage(
                    String(data.message ?? "").trim() ||
                    "Η ενδοδιακίνηση καταχωρήθηκε επιτυχώς"
                );
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Αποτυχία αποστολής SALDOC"
                );
            } finally {
                setSubmittingRowKeys((prev) => {
                    const next = new Set(prev);
                    next.delete(rowKey);
                    return next;
                });
            }
        },
        [
            finalQtyByRow,
            loadRows,
            requestedQtyByRow,
            submitEndoBasketOrder,
            user?.uid,
        ]
    );

    return (
        <div>
            <PageBreadcrumb pageTitle={listConfig.pageTitle} />

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

            <div className="grid gap-4">
                <DataTable>
                    <DataTableHeader
                        title={listConfig.title}
                        description={listConfig.subtitle}
                        count={rows.length}
                        action={
                            <DataTableSearchBar
                                value={search}
                                onChange={setSearch}
                                onRefresh={loadRows}
                                isRefreshing={loading}
                                refreshDisabled={loading}
                                placeholder="Αναζήτηση..."
                            />
                        }
                    />

                    {loading ? (
                        <div className="flex items-center justify-center px-5 py-20 text-gray-500 dark:text-gray-400">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Φόρτωση λίστας...
                        </div>
                    ) : rows.length === 0 ? (
                        <DataTableEmptyState
                            icon={<Check className="h-7 w-7" />}
                            title="Δεν υπάρχουν εγγραφές"
                            description="Δεν υπάρχουν διαθέσιμες γραμμές ενδοδιακίνησης για το επιλεγμένο scope."
                        />
                    ) : filteredRows.length === 0 ? (
                        <DataTableEmptyState
                            icon={<Minus className="h-7 w-7" />}
                            title="Δεν βρέθηκαν αποτελέσματα"
                            description="Η αναζήτηση δεν επέστρεψε γραμμές για τα φίλτρα που δώσατε."
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                                <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-950">
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
                                        const canEditQty =
                                            isReceivedScope && hasQtyUpdateFields(row);

                                        const requestedQty =
                                            requestedQtyByRow[rowKey] ??
                                            getRequestedQtyFromRow(row);

                                        return (
                                            <tr
                                                key={rowKey}
                                                className="transition hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                                            >
                                                {tableColumns.map((column) => {
                                                    if (
                                                        isReceivedScope &&
                                                        column === REQUESTED_QTY_COLUMN_KEY
                                                    ) {
                                                        return (
                                                            <td
                                                                key={`${rowKey}-${column}`}
                                                                className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-200"
                                                            >
                                                                <NumberBadge
                                                                    value={requestedQty}
                                                                    variant="brand"
                                                                    className="min-w-[64px]"
                                                                />
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
                                                        const rowSubmitting =
                                                            submittingRowKeys.has(rowKey);
                                                        const resolvedQty = getResolvedQty(rowKey, row);
                                                        const qtyChanged = isQtyChanged(rowKey, row);
                                                        const canApproveWithResolvedQty =
                                                            canApproveRowWithQty(row, resolvedQty);
                                                        const rowBusy = rowSaving || rowSubmitting;

                                                        return (
                                                            <td
                                                                key={`${rowKey}-${column}`}
                                                                className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-200"
                                                            >
                                                                <div className="flex items-center gap-1">
                                                                    <QuantityControl
                                                                        value={resolvedQty}
                                                                        onChange={(nextQty) => setEditedQuantity(rowKey, nextQty)}
                                                                        min={0}
                                                                        size="sm"
                                                                        placeholder="0"
                                                                        displayZeroAsEmpty
                                                                        disabled={rowBusy}
                                                                        className={
                                                                            qtyChanged
                                                                                ? "border-brand-300 ring-1 ring-brand-200 dark:border-brand-500/50 dark:ring-brand-500/20"
                                                                                : ""
                                                                        }
                                                                    />

                                                                    <button
                                                                        type="button"
                                                                        title="Ενημέρωση ποσότητας"
                                                                        aria-label="Ενημέρωση ποσότητας"
                                                                        onClick={() => void handleQtyUpdate(rowKey, row)}
                                                                        disabled={rowBusy || !qtyChanged}
                                                                        className="ml-1 inline-flex h-8 items-center justify-center gap-1 rounded-md bg-brand-500 px-2 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
                                                                    >
                                                                        {rowSaving ? (
                                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                        ) : (
                                                                            <Check className="h-3.5 w-3.5" />
                                                                        )}
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        title="Αποστολή SALDOC"
                                                                        aria-label="Αποστολή SALDOC"
                                                                        onClick={() =>
                                                                            void handleSubmitRow(rowKey, row)
                                                                        }
                                                                        disabled={
                                                                            rowBusy ||
                                                                            qtyChanged ||
                                                                            !canApproveWithResolvedQty
                                                                        }
                                                                        className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-green-600 px-2 text-xs font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
                                                                    >
                                                                        {rowSubmitting ? (
                                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                        ) : (
                                                                            <Send className="h-3.5 w-3.5" />
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
                </DataTable>
            </div>
        </div>
    );
}