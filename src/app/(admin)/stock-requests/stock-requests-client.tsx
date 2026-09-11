"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import StockOrderSummary from "@/components/stock/stock-order-summary";
import { Check, Loader2 } from "@/lib/icons/lucide";
import DataTable from "@/components/ui/data-table/data-table";
import DataTableActions, {
    RowActionGroup,
} from "@/components/ui/data-table/data-table-action";
import DataTableEmptyState from "@/components/ui/data-table/data-table-empty-state";
import DataTableHeader from "@/components/ui/data-table/data-table-header";
import DataTableSearchBar from "@/components/ui/data-table/data-table-search-bar";
import NumberBadge from "@/components/ui/data-table/number-badge";
import StatusBadge from "@/components/ui/data-table/status-badge";
import type {
    IStockRequestListRow,
    StockRequestUpdateAction,
} from "@/lib/interface";
import {
    useFetchStockRequestsMutation,
    useSubmitAnatrofOrderMutation,
    useUpdateStockRequestMutation,
} from "@/hooks/queries/useApiMutations";
import { useAuthStore } from "@/stores/authStore";
import { normalizeBranchCode } from "@/lib/auth/branches";
import toast from "react-hot-toast";
import { useSessionState } from "@/hooks/useSessionState";
import {
    STOCK_BRANCH_COLUMNS,
    STOCK_REQUEST_BRANCH_OPTIONS,
    canSubmitAnatrofRow,
    canUpdate,
    formatDateTime,
    getActionQty,
    getRequestedQty,
    getStatusStyle,
    getValidatedQty,
    isStockRequestBranchCode,
    sortStockRequestRows,
    type StockBranchCode,
} from "@/lib/utils/stock-requests";

export default function StockRequestsClient() {
    const user = useAuthStore((state) => state.user);

    const currentBranchCode = useMemo(
        () => normalizeBranchCode(user?.s1code),
        [user?.s1code]
    );

    const { mutateAsync: fetchStockRequests } = useFetchStockRequestsMutation();
    const { mutateAsync: updateStockRequest } = useUpdateStockRequestMutation();
    const { mutateAsync: submitAnatrofOrder } = useSubmitAnatrofOrderMutation();

    const [rows, setRows] = useState<IStockRequestListRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [updatingId, setUpdatingId] = useState("");
    const [submittingAnatrof, setSubmittingAnatrof] = useState(false);
    const [editingId, setEditingId] = useState("");
    const [editedQty, setEditedQty] = useState("");
    const [searchTerm, setSearchTerm] = useSessionState(
        "stock-requests-search",
        ""
    );
    const [selectedBranchCode, setSelectedBranchCode] = useState<StockBranchCode | "">("");

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
        if (!selectedBranchCode) {
            return STOCK_BRANCH_COLUMNS;
        }

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

    useEffect(() => {
        if (selectedBranchCode) {
            return;
        }

        const normalizedCurrentBranch = normalizeBranchCode(currentBranchCode);

        if (isStockRequestBranchCode(normalizedCurrentBranch)) {
            setSelectedBranchCode(normalizedCurrentBranch);
            return;
        }

        setSelectedBranchCode(STOCK_REQUEST_BRANCH_OPTIONS[0].code);
    }, [currentBranchCode, selectedBranchCode]);

    const loadRows = useCallback(async () => {
        if (!selectedBranchCode) {
            return;
        }

        setLoading(true);
        setError("");
        setSuccessMessage("");

        try {
            const data = await fetchStockRequests({
                branch: selectedBranchCode,
            });

            setRows(sortStockRequestRows(data.rows ?? []));
            setEditingId("");
            setEditedQty("");
        } catch (err) {
            setRows([]);
            setError(
                err instanceof Error
                    ? err.message
                    : "Αποτυχία φόρτωσης αιτημάτων ανατροφοδοσίας"
            );
        } finally {
            setLoading(false);
        }
    }, [fetchStockRequests, selectedBranchCode]);

    useEffect(() => {
        if (!selectedBranchCode) {
            return;
        }

        void loadRows();
    }, [loadRows, selectedBranchCode]);

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

    const hasRowInEditMode = Boolean(editingId);

    const handleStartQtyEdit = (row: IStockRequestListRow) => {
        setEditingId(row.BASKETID);
        setEditedQty(getRequestedQty(row));
    };

    const handleCancelQtyEdit = () => {
        setEditingId("");
        setEditedQty("");
    };

    const handleUpdateAction = async (
        row: IStockRequestListRow,
        action: StockRequestUpdateAction,
        qty: string
    ) => {
        setUpdatingId(row.BASKETID);
        setError("");
        setSuccessMessage("");

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
                setEditingId("");
                setEditedQty("");
                const message = "Η ποσότητα ενημερώθηκε";
                setSuccessMessage(message);
                toast.success(message);
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
                setEditingId("");
                setEditedQty("");
                const message = "Το αίτημα εγκρίθηκε";
                setSuccessMessage(message);
                toast.success(message);
                return;
            }

            await loadRows();
            toast.success("Το αίτημα διαγράφηκε");
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Αποτυχία ενημέρωσης αιτήματος"
            setError(message);
            toast.error(message);
        } finally {
            setUpdatingId("");
        }
    };

    const handleUpdateQty = async (row: IStockRequestListRow) => {
        const normalizedQty = getValidatedQty(editedQty);

        if (!normalizedQty) {
            setError("Η αιτούμενη ποσότητα πρέπει να είναι θετικός ακέραιος αριθμός.");
            return;
        }

        await handleUpdateAction(row, "UPDATE", normalizedQty);
    };

    const handleApproveRow = async (row: IStockRequestListRow) => {
        const qty = getActionQty(row);

        if (!qty) {
            setError("Η αιτούμενη ποσότητα δεν είναι έγκυρη.");
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

    const approvedRows = useMemo(
        () => rows.filter((row) => canSubmitAnatrofRow(row.STATUS)),
        [rows]
    );

    const approvedRequestedQty = useMemo(
        () =>
            approvedRows.reduce((sum, row) => {
                const qty = Number(row.QTY_REQUESTED);

                return sum + (Number.isFinite(qty) ? qty : 0);
            }, 0),
        [approvedRows]
    );

    const handleSubmitAnatrofOrder = useCallback(async () => {
        if (approvedRows.length === 0) {
            setError("Δεν υπάρχουν εγκεκριμένες γραμμές για αποστολή.");
            return;
        }

        setSubmittingAnatrof(true);
        setError("");
        setSuccessMessage("");

        try {
            const data = await submitAnatrofOrder({
                appUserId: user?.uid,
                branch: currentBranchCode,
                branchSec: Number(currentBranchCode),
                whouseSec: Number(currentBranchCode),
                items: approvedRows,
            });

            await loadRows();
            const message =
                String(data.message ?? "").trim() ||
                "Η ανατροφοδοσία καταχωρήθηκε επιτυχώς.";
            setSuccessMessage(message);
            toast.success(message);
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Αποτυχία αποστολής ανατροφοδοσίας";
            setError(message);
            toast.error(message);
        } finally {
            setSubmittingAnatrof(false);
        }
    }, [
        approvedRows,
        currentBranchCode,
        loadRows,
        submitAnatrofOrder,
        user?.uid,
    ]);

    return (
        <div className="flex h-[calc(100dvh-8rem)] flex-col overflow-hidden md:h-[calc(100dvh-9rem)]">
            <div className="shrink-0">
                <PageBreadcrumb pageTitle="Λίστα Αιτημάτων Ανατροφοδοσίας" />
            </div>

            {error && (
                <div className="mb-4 shrink-0 rounded-lg border border-red-100 bg-red-50 px-5 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="mb-4 shrink-0 rounded-lg border border-green-100 bg-green-50 px-5 py-3 text-sm text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400">
                    {successMessage}
                </div>
            )}

            {loading ? (
                <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-gray-200 bg-white px-5 py-16 text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Φόρτωση αιτημάτων...
                </div>
            ) : rows.length === 0 ? (
                <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-gray-200 bg-white px-5 py-16 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
                    Δεν υπάρχουν αιτήματα ανατροφοδοσίας.
                </div>
            ) : (
                <div className="flex min-h-0 flex-1 flex-col gap-5 xl:flex-row">
                    <DataTable className="flex min-h-0 min-w-0 flex-1 flex-col xl:flex-[2]">
                        <DataTableHeader
                            title="Εκκρεμή Αιτήματα Ανατροφοδοσίας"
                            description={`Διαχείριση αιτημάτων, ποσοτήτων και έγκρισης ανατροφοδοσίας. Κατάστημα: ${selectedBranchLabel}`}
                            count={pendingRows.length}
                            countClassName="bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                            action={(
                                <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
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
                                            disabled={loading || Boolean(updatingId)}
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
                                        refreshDisabled={loading || Boolean(updatingId)}
                                        placeholder="Αναζήτηση με ID, MTRL, κωδικό ή περιγραφή..."
                                    />
                                </div>
                            )}
                        />

                        {filteredPendingRows.length === 0 ? (
                            <DataTableEmptyState
                                icon={<Check className="h-7 w-7" />}
                                title={
                                    pendingRows.length === 0
                                        ? "Δεν υπάρχουν εκκρεμή αιτήματα"
                                        : "Δεν βρέθηκαν αποτελέσματα"
                                }
                                description={
                                    pendingRows.length === 0
                                        ? "Όλα τα αιτήματα ανατροφοδοσίας έχουν διεκπεραιωθεί ή δεν υπάρχουν νέα αιτήματα προς έγκριση."
                                        : "Η αναζήτηση δεν επέστρεψε γραμμές για τα εκκρεμή αιτήματα."
                                }
                                className="flex-1"
                            />
                        ) : (
                            <div className="min-h-0 flex-1 overflow-auto">
                                <table className="min-w-[1320px] w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                                    <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-950">
                                        <tr>
                                            <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                ID
                                            </th>

                                            <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                Ημ/νία Αιτήματος
                                            </th>

                                            <th className="min-w-[280px] px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                Είδος
                                            </th>

                                            <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                ΠΡΟΣ
                                            </th>

                                            <th className="whitespace-nowrap px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                Διαθέσιμα
                                            </th>

                                            {orderedStockBranchColumns.map((branchColumn) => (
                                                <th
                                                    key={branchColumn.code}
                                                    className={[
                                                        "whitespace-nowrap px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide",
                                                        branchColumn.code === selectedBranchCode
                                                            ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200"
                                                            : "text-gray-500 dark:text-gray-400",
                                                    ].join(" ")}
                                                >
                                                    {branchColumn.label}
                                                </th>
                                            ))}

                                            <th className="whitespace-nowrap px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                Αιτούμενη Ποσότητα
                                            </th>

                                            <th className="whitespace-nowrap px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                Ενέργειες
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {filteredPendingRows.map((row) => {
                                            const rowUpdating = updatingId === row.BASKETID;
                                            const rowIsEditing = editingId === row.BASKETID;
                                            const currentRequestedQty = getRequestedQty(row);
                                            const qtyChanged = String(editedQty) !== String(currentRequestedQty);

                                            return (
                                                <tr
                                                    key={row.BASKETID}
                                                    className={[
                                                        "transition hover:bg-gray-50 dark:hover:bg-white/[0.04]",
                                                        rowIsEditing
                                                            ? "bg-brand-50/70 ring-1 ring-inset ring-brand-200 dark:bg-brand-500/10 dark:ring-brand-500/20"
                                                            : "",
                                                    ].join(" ")}
                                                >


                                                    <td className="whitespace-nowrap px-5 py-4 align-top">
                                                        <span className="inline-flex rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                            #{row.BASKETID}
                                                        </span>
                                                    </td>

                                                    <td className="whitespace-nowrap px-5 py-4 align-top text-xs text-gray-600 dark:text-gray-300">
                                                        {formatDateTime(row.INS_DATE)}
                                                    </td>

                                                    <td className="min-w-[280px] px-5 py-4 align-top">
                                                        <div className="pr-4">
                                                            <p className="wrap-break-word font-medium leading-5 text-gray-900 dark:text-white">
                                                                {row.ITEM_NAME}
                                                            </p>

                                                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                                                <span>
                                                                    Κωδικός:{" "}
                                                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                                                        {row.ITEM_CODE}
                                                                    </span>
                                                                </span>

                                                                <span>
                                                                    MTRL:{" "}
                                                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                                                        {row.MTRL}
                                                                    </span>
                                                                </span>

                                                                <span>
                                                                    Σε εξέλιξη:{" "}
                                                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                                                        {row.ONGOING}
                                                                    </span>
                                                                </span>

                                                                <span>
                                                                    Παραγγελθέν:{" "}
                                                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                                                        {row.ORDERED}
                                                                    </span>
                                                                </span>

                                                                <span>
                                                                    Σε καλάθι:{" "}
                                                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                                                        {row.QTY_IN_BASKETS}
                                                                    </span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="whitespace-nowrap px-5 py-4 align-top text-gray-700 dark:text-gray-200">
                                                        {row.BRANCH}
                                                    </td>

                                                    <td className="px-5 py-4 text-right align-top tabular-nums">
                                                        <NumberBadge
                                                            value={row.TOTAL_AVAIL}
                                                            variant={Number(row.TOTAL_AVAIL) > 0 ? "success" : "danger"}
                                                        />
                                                    </td>

                                                    {orderedStockBranchColumns.map((branchColumn) => (
                                                        <td
                                                            key={`${row.BASKETID}-${branchColumn.code}`}
                                                            className={[
                                                                "whitespace-nowrap px-5 py-4 text-right align-top tabular-nums",
                                                                branchColumn.code === selectedBranchCode
                                                                    ? "bg-brand-50/60 font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-200"
                                                                    : "text-gray-700 dark:text-gray-200",
                                                            ].join(" ")}
                                                        >
                                                            {row[branchColumn.stockKey]}
                                                        </td>
                                                    ))}

                                                    <td className="px-5 py-4 text-right align-top">
                                                        {rowIsEditing ? (
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                step={1}
                                                                autoFocus
                                                                disabled={rowUpdating}
                                                                value={editedQty}
                                                                onChange={(event) => setEditedQty(event.target.value)}
                                                                onKeyDown={(event) => {
                                                                    if (event.key === "Enter") {
                                                                        void handleUpdateQty(row);
                                                                    }

                                                                    if (event.key === "Escape") {
                                                                        handleCancelQtyEdit();
                                                                    }
                                                                }}
                                                                className={[
                                                                    "h-9 w-20 rounded-xl border px-2 text-right text-sm font-semibold tabular-nums outline-none transition disabled:cursor-not-allowed disabled:opacity-60",
                                                                    qtyChanged
                                                                        ? "border-brand-500 bg-brand-50 text-gray-900 ring-2 ring-brand-500/20 dark:border-brand-400 dark:bg-brand-500/10 dark:text-white"
                                                                        : "border-gray-300 bg-white text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white",
                                                                ].join(" ")}
                                                            />
                                                        ) : (
                                                            <NumberBadge
                                                                value={currentRequestedQty}
                                                                variant="brand"
                                                            />
                                                        )}
                                                    </td>

                                                    <td className="px-5 py-4 text-right align-top">
                                                        {rowIsEditing ? (
                                                            <DataTableActions>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => void handleUpdateQty(row)}
                                                                    disabled={rowUpdating || !qtyChanged}
                                                                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
                                                                >
                                                                    {rowUpdating ? (
                                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                    ) : (
                                                                        <Check className="h-3.5 w-3.5" />
                                                                    )}
                                                                    Save
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={handleCancelQtyEdit}
                                                                    disabled={rowUpdating}
                                                                    className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </DataTableActions>
                                                        ) : (
                                                            <RowActionGroup
                                                                loading={rowUpdating}
                                                                disabled={hasRowInEditMode || submittingAnatrof}
                                                                onEdit={() => handleStartQtyEdit(row)}
                                                                onApprove={() => void handleApproveRow(row)}
                                                                onDelete={() => void handleDeleteRow(row)}
                                                                editTitle="Επεξεργασία ποσότητας"
                                                                approveTitle="Έγκριση αιτήματος"
                                                                deleteTitle="Διαγραφή αιτήματος"
                                                                editAriaLabel={`Επεξεργασία ποσότητας για αίτημα ${row.BASKETID}`}
                                                                approveAriaLabel={`Έγκριση αιτήματος ${row.BASKETID}`}
                                                                deleteAriaLabel={`Διαγραφή αιτήματος ${row.BASKETID}`}
                                                            />
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </DataTable>

                    <StockOrderSummary
                        rows={approvedRows}
                        requestedQtyTotal={approvedRequestedQty}
                        branchLabel={selectedBranchLabel}
                        getStatusStyle={getStatusStyle}
                        getRequestedQty={getRequestedQty}
                        formatDateTime={formatDateTime}
                        loading={loading}
                        onRefresh={loadRows}
                        sendingOrder={submittingAnatrof}
                        onSendOrder={() => void handleSubmitAnatrofOrder()}
                    />
                </div>
            )}
        </div>
    );
}
