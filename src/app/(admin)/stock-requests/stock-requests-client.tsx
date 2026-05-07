"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/template components/common/PageBreadCrumb";
import StockOrderSummary from "@/components/stock/stock-order-summary";
import { Check, Loader2 } from "@/lib/icons/lucide";
import DataTable from "@/components/ui/data-table/DataTable";
import DataTableActions, {
    RowActionGroup,
} from "@/components/ui/data-table/DataTableActions";
import DataTableEmptyState from "@/components/ui/data-table/DataTableEmptyState";
import DataTableHeader from "@/components/ui/data-table/DataTableHeader";
import DataTableSearchBar from "@/components/ui/data-table/DataTableSearchBar";
import NumberBadge from "@/components/ui/data-table/NumberBadge";
import StatusBadge from "@/components/ui/data-table/StatusBadge";
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

type StockBranchCode = "1001" | "1006" | "1007";
type StockBranchStockKey = "YP1001" | "YP1006" | "YP1007";

const STOCK_REQUEST_BRANCH_OPTIONS: Array<{ code: StockBranchCode; label: string }> = [
    { code: "1001", label: "Κασομούλη" },
    { code: "1006", label: "Λ. Αθηνών" },
    { code: "1007", label: "Λ. Μεσογείων" },
];
const STOCK_BRANCH_COLUMNS: Array<{
    code: StockBranchCode;
    label: string;
    stockKey: StockBranchStockKey;
}> = [
    { code: "1001", label: "Κασομούλη", stockKey: "YP1001" },
    { code: "1006", label: "Λ.Αθηνών", stockKey: "YP1006" },
    { code: "1007", label: "Λ.Μεσογείων", stockKey: "YP1007" },
];

function getStatusStyle(status: string) {
    const normalized = status.toUpperCase();

    if (normalized.includes("ΕΓΚΡΙΘ")) {
        return "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400";
    }

    if (
        normalized.includes("ΔΙΑΓΡ") ||
        normalized.includes("DELETE") ||
        normalized.includes("ΑΠΟΡΡΙ")
    ) {
        return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400";
    }

    return "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
}

function canUpdate(status: string) {
    return status.toUpperCase().includes("ΕΚΚΡΕΜ");
}

function canSubmitAnatrofRow(status: string) {
    const normalized = status.toUpperCase();

    return normalized.includes("ΕΓΚΡΙΘ") || normalized.includes("APPROV");
}

function getStatusPriority(status: string) {
    const normalized = status.toUpperCase();

    if (normalized.includes("ΕΚΚΡΕΜ") || normalized.includes("PENDING")) {
        return 0;
    }

    if (normalized.includes("ΕΓΚΡΙΘ") || normalized.includes("APPROV")) {
        return 1;
    }

    if (
        normalized.includes("ΔΙΑΓΡ") ||
        normalized.includes("DELETE") ||
        normalized.includes("ΑΠΟΡΡΙ")
    ) {
        return 2;
    }

    return 3;
}

function parseDateValue(value: string) {
    const timestamp = new Date(value).getTime();

    return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortStockRequestRows(rows: IStockRequestListRow[]) {
    return [...rows].sort((a, b) => {
        const statusRankDiff =
            getStatusPriority(a.STATUS) - getStatusPriority(b.STATUS);

        if (statusRankDiff !== 0) return statusRankDiff;

        const statusNameDiff = a.STATUS.localeCompare(b.STATUS, "el-GR");

        if (statusNameDiff !== 0) return statusNameDiff;

        return parseDateValue(b.INS_DATE) - parseDateValue(a.INS_DATE);
    });
}

function formatDateTime(value?: string) {
    if (!value) return "—";

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) return value;

    return parsed.toLocaleString("el-GR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getValidatedQty(value: string) {
    const parsed = Number(String(value).trim());

    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }

    return String(parsed);
}

function getRequestedQty(row: IStockRequestListRow) {
    return String(row.QTY_REQUESTED ?? "").trim() || "—";
}

function getActionQty(row: IStockRequestListRow) {
    return getValidatedQty(getRequestedQty(row));
}

function isStockRequestBranchCode(value: string): value is StockBranchCode {
    return STOCK_REQUEST_BRANCH_OPTIONS.some((branch) => branch.code === value);
}

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
    const [searchTerm, setSearchTerm] = useState("");
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
                setSuccessMessage("Η ποσότητα ενημερώθηκε");
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
                setSuccessMessage("Το αίτημα εγκρίθηκε");
                return;
            }

            await loadRows();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Αποτυχία ενημέρωσης αιτήματος"
            );
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
                branch: selectedBranchCode,
                items: approvedRows,
            });

            await loadRows();
            setSuccessMessage(
                String(data.message ?? "").trim() ||
                    "Η ανατροφοδοσία καταχωρήθηκε επιτυχώς."
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Αποτυχία αποστολής ανατροφοδοσίας"
            );
        } finally {
            setSubmittingAnatrof(false);
        }
    }, [
        approvedRows,
        loadRows,
        selectedBranchCode,
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
                    <DataTable className="flex min-h-0 min-w-0 flex-1 flex-col xl:flex-[1.6]">
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
                            <div className="min-h-0 flex-1 overflow-y-auto">
                                <table className="w-full table-fixed divide-y divide-gray-100 text-sm dark:divide-gray-800">
                                    <colgroup>
                                        <col className="w-[8%]" />
                                        <col className="w-[10%]" />
                                        <col className="w-[7%]" />
                                        <col className="w-[27%]" />
                                        <col className="w-[8%]" />
                                        <col className="w-[7%]" />
                                        <col className="w-[6%]" />
                                        <col className="w-[6%]" />
                                        <col className="w-[6%]" />
                                        <col className="w-[8%]" />
                                        <col className="w-[7%]" />
                                    </colgroup>

                                    <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-950">
                                        <tr>
                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                Κατάσταση
                                            </th>

                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                Ημ/νία Αιτήματος
                                            </th>

                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                ID
                                            </th>

                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                Είδος
                                            </th>

                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                ΠΡΟΣ
                                            </th>

                                            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                Διαθέσιμα
                                            </th>

                                            {orderedStockBranchColumns.map((branchColumn) => (
                                                <th
                                                    key={branchColumn.code}
                                                    className={[
                                                        "px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide",
                                                        branchColumn.code === selectedBranchCode
                                                            ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200"
                                                            : "text-gray-500 dark:text-gray-400",
                                                    ].join(" ")}
                                                >
                                                    {branchColumn.label}
                                                </th>
                                            ))}

                                            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                Αιτούμενη Ποσότητα
                                            </th>

                                            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
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
                                                    <td className="px-5 py-4 align-top">
                                                        <StatusBadge status={row.STATUS} />
                                                    </td>

                                                    <td className="whitespace-nowrap px-5 py-4 align-top text-xs text-gray-600 dark:text-gray-300">
                                                        {formatDateTime(row.INS_DATE)}
                                                    </td>

                                                    <td className="whitespace-nowrap px-5 py-4 align-top">
                                                        <span className="inline-flex rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                            #{row.BASKETID}
                                                        </span>
                                                    </td>

                                                    <td className="px-5 py-4 align-top">
                                                        <div className="pr-4">
                                                            <p className="break-words font-medium leading-5 text-gray-900 dark:text-white">
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
                        sendingOrder={submittingAnatrof}
                        onSendOrder={() => void handleSubmitAnatrofOrder()}
                    />
                </div>
            )}
        </div>
    );
}
