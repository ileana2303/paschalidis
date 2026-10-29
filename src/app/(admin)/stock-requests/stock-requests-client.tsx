"use client";

import { Fragment, useCallback, useMemo, useRef, useState } from "react";
import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import StockOrderSummary from "@/components/stock/stock-order-summary";
import {
    Check,
    ChevronDown,
    ListChevronsDownUp,
    ListChevronsUpDown,
    Loader2,
    Trash2,
} from "@/lib/icons/lucide";
import DataTable from "@/components/ui/data-table/data-table";
import { RowActionGroup } from "@/components/ui/data-table/data-table-action";
import DataTableEmptyState from "@/components/ui/data-table/data-table-empty-state";
import DataTableHeader from "@/components/ui/data-table/data-table-header";
import DataTableSearchBar from "@/components/ui/data-table/data-table-search-bar";
import DataTableSelectionCheckbox from "@/components/ui/data-table/data-table-selection-checkbox";
import NumberBadge from "@/components/ui/data-table/number-badge";
import ItemCodeBadge from "@/components/ui/item-code-badge";
import type {
    IStockRequestListRow,
    StockRequestUpdateAction,
} from "@/lib/interface";
import {
    useFetchStockRequestsMutation,
    useSubmitAnatrofOrderMutation,
    useUpdateStockRequestMutation,
} from "@/hooks/queries/useApiMutations";
import { useRequestListIntervalRefresh } from "@/hooks/queries/useRequestListIntervalRefresh";
import { useAuthStore } from "@/stores/authStore";
import { normalizeBranchCode } from "@/lib/auth/branches";
import { getBranchColor } from "@/lib/branch-colors";
import toast from "react-hot-toast";
import { useSessionState } from "@/hooks/useSessionState";
import { useLoadOnChange } from "@/hooks/useLoadOnChange";
import {
    STOCK_BRANCH_COLUMNS,
    STOCK_REQUEST_BRANCH_OPTIONS,
    canSubmitAnatrofRow,
    canUpdate,
    formatDateTime,
    getActionQty,
    getRequestedQty,
    getValidatedQty,
    isStockRequestBranchCode,
    sortStockRequestRows,
    type StockBranchCode,
} from "@/lib/utils/stock-requests";

const quantityOptions = Array.from({ length: 100 }, (_, index) => index + 1);

function getQuantityOptions(currentValue: string) {
    const currentQuantity = Number(currentValue);

    if (
        !Number.isInteger(currentQuantity) ||
        currentQuantity <= 0 ||
        quantityOptions.includes(currentQuantity)
    ) {
        return quantityOptions;
    }

    return [...quantityOptions, currentQuantity].sort((a, b) => a - b);
}

function TableSkeleton() {
    return (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 px-5 py-4">
                    <div className="col-span-1 h-12 rounded bg-gray-100 dark:bg-gray-800" />
                    <div className="col-span-2 h-12 rounded bg-gray-100 dark:bg-gray-800" />
                    <div className="col-span-2 h-12 rounded bg-gray-100 dark:bg-gray-800" />
                    <div className="col-span-3 h-12 rounded bg-gray-100 dark:bg-gray-800" />
                    <div className="col-span-1 h-12 rounded bg-gray-100 dark:bg-gray-800" />
                    <div className="col-span-1 h-12 rounded bg-gray-100 dark:bg-gray-800" />
                    <div className="col-span-2 h-12 rounded bg-gray-100 dark:bg-gray-800" />
                </div>
            ))}
        </div>
    );
}

interface StockRequestsClientProps {
    mode?: "requests" | "list";
}

export default function StockRequestsClient({
    mode = "requests",
}: StockRequestsClientProps) {
    const isStockList = mode === "list";
    const user = useAuthStore((state) => state.user);
    const currentBranchCode = useMemo(
        () => normalizeBranchCode(user?.mainBranch),
        [user?.mainBranch]
    );

    const { mutateAsync: fetchStockRequests } = useFetchStockRequestsMutation();
    const { mutateAsync: updateStockRequest } = useUpdateStockRequestMutation();
    const { mutateAsync: submitAnatrofOrder } = useSubmitAnatrofOrderMutation();

    const [rows, setRows] = useState<IStockRequestListRow[]>([]);
    const [loading, setLoading] = useState(true);

    const [updatingId, setUpdatingId] = useState("");
    const [submittingAnatrof, setSubmittingAnatrof] = useState(false);
    const [selectedTableBasketIds, setSelectedTableBasketIds] = useState<
        Set<string>
    >(new Set());
    const [deletingSelectedRows, setDeletingSelectedRows] = useState(false);
    const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());
    const [selectedSummaryBasketIds, setSelectedSummaryBasketIds] = useState<
        Set<string>
    >(new Set());
    const [removingSummaryBasketIds, setRemovingSummaryBasketIds] = useState<
        Set<string>
    >(new Set());
    const [removingSelectedSummaryLines, setRemovingSelectedSummaryLines] =
        useState(false);
    const [searchTerm, setSearchTerm] = useSessionState(
        isStockList ? "stock-list-search" : "stock-requests-search",
        ""
    );
    const [notes, setNotes] = useSessionState("stock-requests-notes", "");
    const rowsLoadRequestId = useRef(0);
    const [selectedBranchCode, setSelectedBranchCode] = useState<StockBranchCode>(() => {
        return isStockRequestBranchCode(currentBranchCode)
            ? currentBranchCode
            : STOCK_REQUEST_BRANCH_OPTIONS[0].code;
    });

    const selectedBranchLabel = useMemo(() => {
        const selectedBranch = STOCK_REQUEST_BRANCH_OPTIONS.find(
            (branch) => branch.code === selectedBranchCode
        );

        if (!selectedBranch) {
            return selectedBranchCode || "—";
        }

        return `${selectedBranch.label} (${selectedBranch.code})`;
    }, [selectedBranchCode]);

    const orderedStockBranchColumns = useMemo(() => {
        const selectedColumn = STOCK_BRANCH_COLUMNS.find(
            (column) => column.code === selectedBranchCode
        );

        if (!selectedColumn) {
            return STOCK_BRANCH_COLUMNS;
        }

        return [
            ...STOCK_BRANCH_COLUMNS.filter((column) => column.code !== selectedBranchCode),
            selectedColumn,
        ];
    }, [selectedBranchCode]);

    const loadRows = useCallback(async () => {
        const requestId = ++rowsLoadRequestId.current;
        setLoading(true);

        try {
            const data = await fetchStockRequests({
                branch: selectedBranchCode,
                origin: "STORE",
            });

            if (requestId !== rowsLoadRequestId.current) return;

            const nextRows = sortStockRequestRows(data.rows ?? []);
            setRows(nextRows);
            setSelectedTableBasketIds(new Set());
            setSelectedSummaryBasketIds(
                new Set(
                    nextRows
                        .filter((row) => canSubmitAnatrofRow(row.STATUS))
                        .map((row) => row.BASKETID)
                )
            );
        } catch (err) {
            if (requestId !== rowsLoadRequestId.current) return;

            setRows([]);
            setSelectedTableBasketIds(new Set());
            setSelectedSummaryBasketIds(new Set());
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Αποτυχία φόρτωσης αιτημάτων ανατροφοδοσίας"
            );
        } finally {
            if (requestId === rowsLoadRequestId.current) {
                setLoading(false);
            }
        }
    }, [fetchStockRequests, selectedBranchCode]);

    const refreshRows = async () => {
        const requestId = ++rowsLoadRequestId.current;

        try {
            const data = await fetchStockRequests({
                branch: selectedBranchCode,
                origin: "STORE",
            });

            if (requestId !== rowsLoadRequestId.current) return;

            const nextRows = sortStockRequestRows(data.rows ?? []);
            const approvedBasketIds = new Set(
                nextRows
                    .filter((row) => canSubmitAnatrofRow(row.STATUS))
                    .map((row) => row.BASKETID)
            );
            const pendingBasketIds = new Set(
                nextRows
                    .filter((row) => canUpdate(row.STATUS))
                    .map((row) => row.BASKETID)
            );

            setRows(nextRows);
            setSelectedTableBasketIds((current) =>
                new Set(
                    Array.from(current).filter((basketId) =>
                        pendingBasketIds.has(basketId)
                    )
                )
            );
            setSelectedSummaryBasketIds((current) =>
                new Set(
                    Array.from(current).filter((basketId) =>
                        approvedBasketIds.has(basketId)
                    )
                )
            );
        } catch (err) {
            if (requestId !== rowsLoadRequestId.current) return;

            toast.error(
                err instanceof Error
                    ? err.message
                    : "Αποτυχία ανανέωσης αιτημάτων ανατροφοδοσίας"
            );
        }
    };

    useLoadOnChange(loadRows);

    useRequestListIntervalRefresh({
        enabled: true,
        refetch: refreshRows,
    });

    const pendingRows = useMemo(
        () => rows.filter((row) => canUpdate(row.STATUS)),
        [rows]
    );

    const filteredPendingRows = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();

        if (!query) {
            return pendingRows;
        }

        return pendingRows.filter((row) => {
            return [
                row.BASKETID,
                row.MTRL,
                row.ITEM_CODE,
                row.ITEM_NAME,
                row.BRANCH,
                row.STATUS,
            ]
                .join(" ")
                .toLowerCase()
                .includes(query);
        });
    }, [pendingRows, searchTerm]);

    const filteredPendingBasketIds = useMemo(
        () => filteredPendingRows.map((row) => row.BASKETID),
        [filteredPendingRows]
    );
    const selectedVisibleRowCount = filteredPendingBasketIds.filter((basketId) =>
        selectedTableBasketIds.has(basketId)
    ).length;
    const allVisibleRowsSelected =
        filteredPendingBasketIds.length > 0 &&
        selectedVisibleRowCount === filteredPendingBasketIds.length;
    const someVisibleRowsSelected =
        selectedVisibleRowCount > 0 && !allVisibleRowsSelected;

    const toggleTableRowSelection = (basketId: string) => {
        setSelectedTableBasketIds((current) => {
            const next = new Set(current);

            if (next.has(basketId)) {
                next.delete(basketId);
            } else {
                next.add(basketId);
            }

            return next;
        });
    };

    const toggleAllVisibleRows = () => {
        setSelectedTableBasketIds((current) => {
            const next = new Set(current);

            if (allVisibleRowsSelected) {
                filteredPendingBasketIds.forEach((basketId) =>
                    next.delete(basketId)
                );
            } else {
                filteredPendingBasketIds.forEach((basketId) =>
                    next.add(basketId)
                );
            }

            return next;
        });
    };

    const areAllRowsExpanded =
        filteredPendingRows.length > 0 &&
        filteredPendingRows.every((row) => expandedRowIds.has(row.BASKETID));

    const toggleAllRowsExpanded = () => {
        setExpandedRowIds((currentIds) => {
            if (
                filteredPendingRows.length > 0 &&
                filteredPendingRows.every((row) => currentIds.has(row.BASKETID))
            ) {
                return new Set();
            }

            return new Set(filteredPendingRows.map((row) => row.BASKETID));
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

    const handleUpdateAction = async (
        row: IStockRequestListRow,
        action: StockRequestUpdateAction,
        qty: string
    ) => {
        setUpdatingId(row.BASKETID);

        try {
            await updateStockRequest({
                action,
                basketId: Number(row.BASKETID),
                qty,
            });

            if (action === "UPDATE") {
                setRows((currentRows) =>
                    currentRows.map((currentRow) =>
                        currentRow.BASKETID === row.BASKETID
                            ? { ...currentRow, QTY_REQUESTED: qty }
                            : currentRow
                    )
                );
                toast.success("Η ποσότητα ενημερώθηκε");
                return;
            }

            if (action === "APPROVE") {
                setRows((currentRows) =>
                    sortStockRequestRows(
                        currentRows.map((currentRow) =>
                            currentRow.BASKETID === row.BASKETID
                                ? {
                                    ...currentRow,
                                    QTY_REQUESTED: qty,
                                    STATUS: "ΕΓΚΡΙΘΗΚΕ",
                                    APPROVED_TS:
                                        currentRow.APPROVED_TS ??
                                        new Date().toISOString(),
                                }
                                : currentRow
                        )
                    )
                );
                setSelectedSummaryBasketIds((current) =>
                    new Set(current).add(row.BASKETID)
                );
                setSelectedTableBasketIds((current) => {
                    const next = new Set(current);
                    next.delete(row.BASKETID);
                    return next;
                });
                toast.success("Το αίτημα εγκρίθηκε");
                return;
            }

            await loadRows();
            toast.success("Το αίτημα διαγράφηκε");
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Αποτυχία ενημέρωσης αιτήματος"
            toast.error(message);
        } finally {
            setUpdatingId("");
        }
    };

    const handleApproveRow = async (row: IStockRequestListRow) => {
        if (isStockList) {
            return;
        }

        const qty = getActionQty(row);

        if (!qty) {
            toast.error("Η αιτούμενη ποσότητα δεν είναι έγκυρη.");
            return;
        }

        await handleUpdateAction(row, "APPROVE", qty);
    };

    const handleDeleteRow = async (row: IStockRequestListRow) => {
        if (!window.confirm(`Διαγραφή αιτήματος ID ${row.BASKETID};`)) {
            return;
        }

        await handleUpdateAction(row, "DELETE", getActionQty(row) ?? "1");
    };

    const handleDeleteSelectedRows = async () => {
        if (selectedTableBasketIds.size === 0 || deletingSelectedRows) return;

        const selectedRows = pendingRows.filter((row) =>
            selectedTableBasketIds.has(row.BASKETID)
        );

        if (selectedRows.length === 0) {
            setSelectedTableBasketIds(new Set());
            return;
        }

        if (
            !window.confirm(
                `Διαγραφή ${selectedRows.length} επιλεγμένων γραμμών;`
            )
        ) {
            return;
        }

        setDeletingSelectedRows(true);

        try {
            const results = await Promise.allSettled(
                selectedRows.map((row) =>
                    updateStockRequest({
                        action: "DELETE",
                        basketId: Number(row.BASKETID),
                        qty: getActionQty(row) ?? "1",
                    })
                )
            );
            const failedCount = results.filter(
                (result) => result.status === "rejected"
            ).length;

            await loadRows();

            if (failedCount > 0) {
                toast.error(
                    `${failedCount} ${failedCount === 1 ? "γραμμή δεν διαγράφηκε" : "γραμμές δεν διαγράφηκαν"}.`
                );
            } else {
                toast.success(
                    selectedRows.length === 1
                        ? "Η επιλεγμένη γραμμή διαγράφηκε."
                        : `Διαγράφηκαν ${selectedRows.length} επιλεγμένες γραμμές.`
                );
            }
        } finally {
            setDeletingSelectedRows(false);
        }
    };

    const approvedRows = useMemo(
        () => rows.filter((row) => canSubmitAnatrofRow(row.STATUS)),
        [rows]
    );

    const selectedApprovedRows = useMemo(
        () =>
            approvedRows.filter((row) =>
                selectedSummaryBasketIds.has(row.BASKETID)
            ),
        [approvedRows, selectedSummaryBasketIds]
    );

    const approvedRequestedQty = useMemo(
        () =>
            approvedRows.reduce((sum, row) => {
                const qty = Number(row.QTY_REQUESTED);

                return sum + (Number.isFinite(qty) ? qty : 0);
            }, 0),
        [approvedRows]
    );

    const handleToggleSummaryLine = (basketId: string) => {
        setSelectedSummaryBasketIds((current) => {
            const next = new Set(current);
            if (next.has(basketId)) {
                next.delete(basketId);
            } else {
                next.add(basketId);
            }
            return next;
        });
    };

    const handleSummaryQuantityChange = async (
        row: IStockRequestListRow,
        quantity: number
    ) => {
        const normalizedQty = getValidatedQty(String(quantity));

        if (!normalizedQty) {
            toast.error("Η αιτούμενη ποσότητα πρέπει να είναι θετικός ακέραιος αριθμός.");
            return;
        }

        await handleUpdateAction(row, "UPDATE", normalizedQty);
    };

    const handleRemoveSummaryLines = async (
        lines: IStockRequestListRow[],
        bulk = false
    ) => {
        if (lines.length === 0) return;

        const basketIds = new Set(lines.map((row) => row.BASKETID));
        setRemovingSummaryBasketIds((current) => {
            const next = new Set(current);
            basketIds.forEach((basketId) => next.add(basketId));
            return next;
        });
        if (bulk) {
            setRemovingSelectedSummaryLines(true);
        }

        try {
            const results = await Promise.allSettled(
                lines.map((row) =>
                    updateStockRequest({
                        action: "DELETE",
                        basketId: Number(row.BASKETID),
                        qty: getActionQty(row) ?? "1",
                    })
                )
            );
            const failedCount = results.filter(
                (result) => result.status === "rejected"
            ).length;

            await loadRows();

            if (failedCount > 0) {
                toast.error(
                    `${failedCount} ${failedCount === 1 ? "γραμμή δεν διαγράφηκε" : "γραμμές δεν διαγράφηκαν"}.`
                );
            } else {
                toast.success(
                    lines.length === 1
                        ? "Η γραμμή αφαιρέθηκε από τη σύνοψη."
                        : "Οι επιλεγμένες γραμμές αφαιρέθηκαν από τη σύνοψη."
                );
            }
        } finally {
            setRemovingSummaryBasketIds((current) => {
                const next = new Set(current);
                basketIds.forEach((basketId) => next.delete(basketId));
                return next;
            });
            if (bulk) {
                setRemovingSelectedSummaryLines(false);
            }
        }
    };

    const handleSubmitAnatrofOrder = useCallback(async () => {
        if (approvedRows.length === 0) {
            toast.error("Δεν υπάρχουν εγκεκριμένες γραμμές για αποστολή.");
            return;
        }

        setSubmittingAnatrof(true);

        try {
            const data = await submitAnatrofOrder({
                appUserId: user?.username,
                requestingBranch: selectedBranchCode,
                supplyingBranch: currentBranchCode,
                notes,
                items: approvedRows,
            });

            const submittedBasketIds = new Set(
                (data.basketIds?.length
                    ? data.basketIds
                    : approvedRows.map((row) => row.BASKETID)
                ).map((basketId) => String(basketId))
            );

            rowsLoadRequestId.current += 1;
            setLoading(false);
            setRows((current) =>
                current.filter(
                    (row) => !submittedBasketIds.has(String(row.BASKETID))
                )
            );
            setSelectedSummaryBasketIds((current) => {
                const next = new Set(current);
                submittedBasketIds.forEach((basketId) => next.delete(basketId));
                return next;
            });
            setNotes("");
            const message =
                String(data.message ?? "").trim() ||
                "Η ανατροφοδοσία καταχωρήθηκε επιτυχώς.";
            toast.success(message);
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Αποτυχία αποστολής ανατροφοδοσίας";
            toast.error(message);
        } finally {
            setSubmittingAnatrof(false);
        }
    }, [
        approvedRows,
        currentBranchCode,
        notes,
        selectedBranchCode,
        setNotes,
        submitAnatrofOrder,
        user,
    ]);

    return (
        <div className="flex min-h-[calc(100dvh-8rem)] min-w-0 max-w-full flex-col md:min-h-[calc(100dvh-9rem)] xl:h-[calc(100dvh-9rem)] xl:min-h-0 xl:overflow-hidden">
            <div className="shrink-0">
                <PageBreadcrumb
                    pageTitle={
                        isStockList
                            ? "Λίστα Ανατροφοδοσίας"
                            : "Λίστα Αιτημάτων Ανατροφοδοσίας"
                    }
                />
            </div>

            <div className="mt-4 flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-5 xl:flex-row xl:min-h-0">
                <DataTable
                    className={[
                        "flex h-[60dvh] min-h-[20rem] min-w-0 max-w-full shrink-0 flex-col overflow-hidden xl:h-auto xl:min-h-0 xl:max-h-full xl:flex-1 xl:shrink",
                        isStockList || loading ? "xl:basis-full" : "xl:basis-3/4",
                    ].join(" ")}
                >
                    <DataTableHeader
                        className="shrink-0"
                        title={
                            isStockList
                                ? "Εκκρεμείς Γραμμές Ανατροφοδοσίας"
                                : "Εκκρεμή Αιτήματα Ανατροφοδοσίας"
                        }
                        description={`${filteredPendingRows.length} από ${pendingRows.length} ${isStockList ? "γραμμές" : "αιτήματα"} · ${selectedBranchLabel}`}
                        action={(
                            <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:flex-wrap lg:items-center lg:justify-end">
                                <button
                                    type="button"
                                    onClick={() => void handleDeleteSelectedRows()}
                                    disabled={
                                        selectedTableBasketIds.size === 0 ||
                                        deletingSelectedRows ||
                                        loading ||
                                        Boolean(updatingId) ||
                                        submittingAnatrof
                                    }
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300 dark:border-red-500/30 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-500/10 dark:disabled:border-gray-700 dark:disabled:text-gray-600"
                                >
                                    {deletingSelectedRows ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                    Διαγραφή επιλεγμένων
                                    {selectedTableBasketIds.size > 0
                                        ? ` (${selectedTableBasketIds.size})`
                                        : ""}
                                </button>

                                <label className="flex h-10 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                                    Κατάστημα
                                    <select
                                        value={selectedBranchCode}
                                        onChange={(event) => {
                                            const nextBranchCode = normalizeBranchCode(event.target.value);

                                            if (!isStockRequestBranchCode(nextBranchCode)) {
                                                return;
                                            }

                                            setSelectedBranchCode(nextBranchCode);
                                        }}
                                        disabled={
                                            loading ||
                                            deletingSelectedRows ||
                                            Boolean(updatingId)
                                        }
                                        className="min-w-[140px] border-0 bg-transparent text-xs font-semibold text-gray-700 outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-200"
                                    >
                                        {STOCK_REQUEST_BRANCH_OPTIONS.map((branch) => (
                                            <option key={branch.code} value={branch.code}>
                                                {branch.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <DataTableSearchBar
                                    value={searchTerm}
                                    onChange={setSearchTerm}
                                    onRefresh={loadRows}
                                    isRefreshing={loading}
                                    refreshDisabled={
                                        loading ||
                                        deletingSelectedRows ||
                                        Boolean(updatingId)
                                    }
                                    placeholder="Αναζήτηση με ID, MTRL, κωδικό ή περιγραφή..."
                                />
                            </div>
                        )}
                    />

                    {loading ? (
                        <div className="min-h-0 flex-1 overflow-auto">
                            <TableSkeleton />
                        </div>
                    ) : filteredPendingRows.length === 0 ? (
                        <DataTableEmptyState
                            icon={<Check className="h-7 w-7" />}
                            title={
                                rows.length === 0
                                    ? "Δεν υπάρχουν αιτήματα ανατροφοδοσίας"
                                    : pendingRows.length === 0
                                        ? "Δεν υπάρχουν εκκρεμή αιτήματα"
                                        : "Δεν βρέθηκαν αποτελέσματα"
                            }
                            description={
                                rows.length === 0
                                    ? "Επιλέξτε άλλο κατάστημα ή ανανεώστε τη λίστα."
                                    : pendingRows.length === 0
                                        ? "Όλα τα αιτήματα ανατροφοδοσίας έχουν διεκπεραιωθεί ή δεν υπάρχουν νέα αιτήματα προς έγκριση."
                                        : "Η αναζήτηση δεν επέστρεψε γραμμές για τα εκκρεμή αιτήματα."
                            }
                            className="flex-1"
                        />
                    ) : (
                        <div className="min-h-0 min-w-0 w-full max-w-full flex-1 overflow-x-auto overflow-y-auto">
                            <table className="w-full min-w-[1280px] table-fixed divide-y divide-gray-100 text-sm dark:divide-gray-800">
                                <colgroup>
                                    <col className="w-[4%]" />
                                    <col className="w-[15%]" />
                                    <col className="w-[19%]" />
                                    <col className="w-[27%]" />
                                    <col className="w-[13%]" />
                                    <col className="w-[9%]" />
                                    <col className="w-[13%]" />
                                </colgroup>
                                <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-950">
                                    <tr>
                                        <th className="px-3 py-3 text-left">
                                            <DataTableSelectionCheckbox
                                                ariaLabel="Επιλογή όλων των ορατών γραμμών"
                                                checked={allVisibleRowsSelected}
                                                indeterminate={someVisibleRowsSelected}
                                                onCheckedChange={toggleAllVisibleRows}
                                                disabled={deletingSelectedRows}
                                            />
                                        </th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={toggleAllRowsExpanded}
                                                    disabled={filteredPendingRows.length === 0}
                                                    aria-label={areAllRowsExpanded ? "Κλείσιμο λεπτομερειών" : "Άνοιγμα λεπτομερειών"}
                                                    title={areAllRowsExpanded ? "Κλείσιμο λεπτομερειών" : "Άνοιγμα λεπτομερειών"}
                                                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-brand-500 dark:hover:text-brand-400"
                                                >
                                                    {areAllRowsExpanded ? (
                                                        <ListChevronsDownUp className="h-4 w-4" />
                                                    ) : (
                                                        <ListChevronsUpDown className="h-4 w-4" />
                                                    )}
                                                </button>
                                                <span>Κωδικός</span>
                                            </div>
                                        </th>

                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                            Είδος
                                        </th>

                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                            Διαθεσιμότητα
                                        </th>

                                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                            Δεσμεύσεις
                                        </th>

                                        <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                            Ποσότητα
                                        </th>

                                        <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                            Ενέργειες
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {filteredPendingRows.map((row) => {
                                        const rowUpdating = updatingId === row.BASKETID;
                                        const currentRequestedQty =
                                            getActionQty(row) ?? "1";
                                        const isExpanded = expandedRowIds.has(row.BASKETID);
                                        const [insDate, insTime] = formatDateTime(row.INS_DATE)
                                            .split(",")
                                            .map((part) => part.trim());

                                        return (
                                            <Fragment key={row.BASKETID}>
                                                <tr className="transition hover:bg-gray-50 dark:hover:bg-white/[0.04]">
                                                    <td className="px-3 py-3 align-middle">
                                                        <DataTableSelectionCheckbox
                                                            ariaLabel={`Επιλογή αιτήματος ${row.BASKETID}`}
                                                            checked={selectedTableBasketIds.has(
                                                                row.BASKETID
                                                            )}
                                                            onCheckedChange={() =>
                                                                toggleTableRowSelection(
                                                                    row.BASKETID
                                                                )
                                                            }
                                                            disabled={
                                                                deletingSelectedRows ||
                                                                rowUpdating
                                                            }
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 align-middle">
                                                        <div className="flex min-w-0 items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleRowExpanded(row.BASKETID)}
                                                                aria-expanded={isExpanded}
                                                                aria-controls={`stock-request-details-${row.BASKETID}`}
                                                                aria-label={isExpanded ? "Απόκρυψη λεπτομερειών" : "Εμφάνιση λεπτομερειών"}
                                                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                                                            >
                                                                <ChevronDown
                                                                    strokeWidth={2.25}
                                                                    className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                                                />
                                                            </button>
                                                            <ItemCodeBadge code={row.ITEM_CODE} />
                                                        </div>
                                                    </td>

                                                    <td className="px-5 py-4 align-middle">
                                                        <p className="break-words font-medium leading-5 text-gray-900 dark:text-white">
                                                            {row.ITEM_NAME || "—"}
                                                        </p>
                                                    </td>

                                                    <td className="px-4 py-4 align-middle">
                                                        <div className="grid grid-cols-4 gap-1.5">
                                                            {orderedStockBranchColumns.map((branchColumn) => {
                                                                const isSelectedBranch = branchColumn.code === selectedBranchCode;

                                                                return (
                                                                    <div
                                                                        key={`${row.BASKETID}-${branchColumn.code}`}
                                                                        className={[
                                                                            "min-w-0 rounded-lg px-1.5 py-1.5 text-center",
                                                                            isSelectedBranch
                                                                                ? getBranchColor(branchColumn.code)
                                                                                : "bg-gray-50 dark:bg-gray-800/70",
                                                                        ].join(" ")}
                                                                        title={`${branchColumn.stockKey} · ${branchColumn.label}`}
                                                                    >
                                                                        <p
                                                                            className={[
                                                                                "truncate text-[10px] font-medium",
                                                                                isSelectedBranch
                                                                                    ? "opacity-75"
                                                                                    : "text-gray-400 dark:text-gray-500",
                                                                            ].join(" ")}
                                                                        >
                                                                            {branchColumn.stockKey}
                                                                        </p>
                                                                        <p
                                                                            className={[
                                                                                "mt-0.5 font-semibold tabular-nums",
                                                                                isSelectedBranch
                                                                                    ? ""
                                                                                    : "text-gray-800 dark:text-gray-100",
                                                                            ].join(" ")}
                                                                        >
                                                                            {row[branchColumn.stockKey]}
                                                                        </p>
                                                                    </div>
                                                                );
                                                            })}
                                                            <div className="flex min-w-0 flex-col items-center rounded-lg bg-brand-50 px-1.5 py-1.5 text-center dark:bg-brand-500/10">
                                                                <p className="text-[10px] font-medium text-brand-500 dark:text-brand-300">
                                                                    TOTAL
                                                                </p>
                                                                <NumberBadge
                                                                    value={row.TOTAL_AVAIL}
                                                                    variant={Number(row.TOTAL_AVAIL) > 0 ? "success" : "danger"}
                                                                    className="mt-0.5 min-w-0 px-2 py-0.5"
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-3 py-4 align-middle">
                                                        <div className="grid grid-cols-2 gap-1.5">
                                                            <div className="min-w-0 rounded-lg bg-gray-50 px-1.5 py-1.5 text-center dark:bg-gray-800/70">
                                                                <p className="truncate text-[10px] font-medium text-gray-400 dark:text-gray-500">
                                                                    Σε καλάθια
                                                                </p>
                                                                <p className="mt-0.5 font-semibold tabular-nums text-gray-800 dark:text-gray-100">
                                                                    {row.QTY_IN_BASKETS}
                                                                </p>
                                                            </div>
                                                            <div className="min-w-0 rounded-lg bg-gray-50 px-1.5 py-1.5 text-center dark:bg-gray-800/70">
                                                                <p className="truncate text-[10px] font-medium text-gray-400 dark:text-gray-500">
                                                                    Σε εξέλιξη
                                                                </p>
                                                                <p className="mt-0.5 font-semibold tabular-nums text-gray-800 dark:text-gray-100">
                                                                    {row.ONGOING}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-4 text-right align-middle">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {rowUpdating && (
                                                                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-brand-500" />
                                                            )}
                                                            <select
                                                                value={currentRequestedQty}
                                                                onChange={(event) =>
                                                                    void handleUpdateAction(
                                                                        row,
                                                                        "UPDATE",
                                                                        event.target.value
                                                                    )
                                                                }
                                                                disabled={
                                                                    rowUpdating ||
                                                                    deletingSelectedRows ||
                                                                    submittingAnatrof
                                                                }
                                                                aria-label={`Ποσότητα αιτήματος ${row.BASKETID}`}
                                                                className="h-8 w-20 rounded-lg border border-gray-200 bg-white px-2 text-sm font-semibold tabular-nums text-gray-800 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-500/40 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
                                                            >
                                                                {getQuantityOptions(currentRequestedQty).map(
                                                                    (quantity) => (
                                                                        <option key={quantity} value={quantity}>
                                                                            {quantity}
                                                                        </option>
                                                                    )
                                                                )}
                                                            </select>
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-3 text-right align-middle">
                                                        <RowActionGroup
                                                            loading={rowUpdating}
                                                            disabled={
                                                                deletingSelectedRows ||
                                                                submittingAnatrof
                                                            }
                                                            onEdit={() => undefined}
                                                            onApprove={() => void handleApproveRow(row)}
                                                            onDelete={() => void handleDeleteRow(row)}
                                                            showEdit={false}
                                                            showApprove={!isStockList}
                                                            approveTitle="Έγκριση αιτήματος"
                                                            deleteTitle="Διαγραφή αιτήματος"
                                                            approveAriaLabel={`Έγκριση αιτήματος ${row.BASKETID}`}
                                                            deleteAriaLabel={`Διαγραφή αιτήματος ${row.BASKETID}`}
                                                        />
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr
                                                        id={`stock-request-details-${row.BASKETID}`}
                                                        className="bg-white dark:bg-gray-950"
                                                    >
                                                        <td colSpan={7} className="px-4 py-3">
                                                            <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:grid-cols-4">
                                                                <div>
                                                                    <div className="text-[10px] text-gray-400">ID Αιτήματος</div>
                                                                    <div className="mt-0.5 font-semibold text-gray-800 dark:text-gray-200">#{row.BASKETID}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-[10px] text-gray-400">Ημ/νία Αιτήματος</div>
                                                                    <div className="mt-0.5 whitespace-nowrap font-semibold text-gray-800 dark:text-gray-200">
                                                                        {insDate}{insTime ? ` ${insTime}` : ""}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-[10px] text-gray-400">MTRL</div>
                                                                    <div className="mt-0.5 font-semibold text-gray-800 dark:text-gray-200">{row.MTRL}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-[10px] text-gray-400">Παραγγελθέν</div>
                                                                    <div className="mt-0.5 font-semibold tabular-nums text-gray-800 dark:text-gray-200">{row.ORDERED}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </DataTable>

                {!isStockList && !loading && (
                    <StockOrderSummary
                        rows={approvedRows}
                        requestedQtyTotal={approvedRequestedQty}
                        branchLabel={selectedBranchLabel}
                        basketTitle="Εγκεκριμένα Αιτήματα Ανατροφοδοσίας"
                        showRequestDetails
                        onChangeQuantity={(row, quantity) =>
                            void handleSummaryQuantityChange(row, quantity)
                        }
                        updatingBasketIds={
                            updatingId ? new Set([updatingId]) : new Set()
                        }
                        selectedBasketIds={selectedSummaryBasketIds}
                        removingBasketIds={removingSummaryBasketIds}
                        removingSelectedLines={removingSelectedSummaryLines}
                        onToggleLineSelection={handleToggleSummaryLine}
                        onRemoveLine={(row) =>
                            void handleRemoveSummaryLines([row])
                        }
                        onRemoveSelectedLines={() =>
                            void handleRemoveSummaryLines(
                                selectedApprovedRows,
                                true
                            )
                        }
                        getRequestedQty={getRequestedQty}
                        formatDateTime={formatDateTime}
                        loading={loading}
                        onRefresh={loadRows}
                        sendingOrder={submittingAnatrof}
                        onSendOrder={() => void handleSubmitAnatrofOrder()}
                        notes={notes}
                        onNotesChange={setNotes}
                    />
                )}
            </div>
        </div>
    );
}
