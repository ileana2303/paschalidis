"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/template components/common/PageBreadCrumb";
import StockOrderSummary from "@/components/stock/stock-order-summary";
import { Check, Loader2, Pencil, RefreshCw, X } from "@/lib/icons/lucide";
import type {
    IStockRequestListRow,
    StockRequestUpdateAction,
} from "@/lib/interface";
import {
    useFetchStockRequestsMutation,
    useUpdateStockRequestMutation,
} from "@/hooks/queries/useApiMutations";
import { useAuthStore } from "@/stores/authStore";

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

export default function StockRequestsClient() {
    const user = useAuthStore((state) => state.user);

    const currentBranchCode = useMemo(
        () => String(user?.s1code ?? "").trim(),
        [user?.s1code]
    );

    const { mutateAsync: fetchStockRequests } = useFetchStockRequestsMutation();
    const { mutateAsync: updateStockRequest } = useUpdateStockRequestMutation();

    const [rows, setRows] = useState<IStockRequestListRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [updatingId, setUpdatingId] = useState("");
    const [editingId, setEditingId] = useState("");
    const [editedQty, setEditedQty] = useState("");

    const loadRows = useCallback(async () => {
        setLoading(true);
        setError("");

        if (!currentBranchCode) {
            setRows([]);
            setLoading(false);
            setError("Δεν βρέθηκε ενεργό κατάστημα στο προφίλ χρήστη");
            return;
        }

        try {
            const data = await fetchStockRequests({
                branch: currentBranchCode,
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
    }, [currentBranchCode, fetchStockRequests]);

    useEffect(() => {
        loadRows();
    }, [loadRows]);

    const pendingRows = useMemo(
        () => rows.filter((row) => canUpdate(row.STATUS)),
        [rows]
    );

    const doneRows = useMemo(
        () => rows.filter((row) => !canUpdate(row.STATUS)),
        [rows]
    );

    const doneRequestedQty = useMemo(
        () =>
            doneRows.reduce((sum, row) => {
                const qty = Number(row.QTY_REQUESTED);

                return sum + (Number.isFinite(qty) ? qty : 0);
            }, 0),
        [doneRows]
    );

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
                    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-amber-200 bg-white dark:border-amber-500/20 dark:bg-white/[0.03]">
                            <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50/70 px-4 py-2 dark:border-amber-500/20 dark:bg-amber-500/10">
                                <div className="flex items-center gap-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                                        Εκκρεμή Αιτήματα Ανατροφοδοσίας
                                    </p>

                                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                                        {pendingRows.length}
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={loadRows}
                                    disabled={loading || Boolean(updatingId)}
                                    className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2 py-1 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-50 dark:border-amber-500/40 dark:bg-transparent dark:text-amber-300 dark:hover:bg-amber-500/10"
                                >
                                    {loading ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <RefreshCw className="h-3.5 w-3.5" />
                                    )}
                                    Ανανέωση
                                </button>
                            </div>

                            {pendingRows.length === 0 ? (
                                <div className="px-4 py-8 text-sm text-gray-500 dark:text-gray-400">
                                    Δεν υπάρχουν εκκρεμή αιτήματα.
                                </div>
                            ) : (
                                <div className="min-h-0 flex-1 overflow-auto">
                                    <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                                        <thead className="bg-gray-50 dark:bg-white/[0.02]">
                                            <tr>
                                                <th className="px-4 py-3 text-xs text-gray-500">
                                                    Κατάσταση
                                                </th>
                                                <th className="px-4 py-3 text-xs text-gray-500">
                                                    Ημ/νία Αιτήματος
                                                </th>
                                                <th className="px-4 py-3 text-xs text-gray-500">ID</th>
                                                <th className="px-4 py-3 text-xs text-gray-500">
                                                    MTRL
                                                </th>
                                                <th className="px-4 py-3 text-xs text-gray-500">
                                                    Κωδικός
                                                </th>
                                                <th className="px-4 py-3 text-xs text-gray-500">
                                                    Περιγραφή
                                                </th>
                                                <th className="px-4 py-3 text-xs text-gray-500">
                                                    Κατάστημα
                                                </th>
                                                <th className="px-4 py-3 text-right text-xs text-gray-500">
                                                    Αιτούμενη Ποσότητα
                                                </th>
                                                <th className="whitespace-nowrap px-4 py-3 text-right text-xs text-gray-500">
                                                    Διαθέσιμα
                                                </th>
                                                <th className="whitespace-nowrap px-4 py-3 text-right text-xs text-gray-500">
                                                    YP1001
                                                </th>
                                                <th className="whitespace-nowrap px-4 py-3 text-right text-xs text-gray-500">
                                                    YP1006
                                                </th>
                                                <th className="whitespace-nowrap px-4 py-3 text-right text-xs text-gray-500">
                                                    YP1007
                                                </th>
                                                <th className="whitespace-nowrap px-4 py-3 text-right text-xs text-gray-500">
                                                    ONGOING
                                                </th>
                                                <th className="whitespace-nowrap px-4 py-3 text-right text-xs text-gray-500">
                                                    ORDERED
                                                </th>
                                                <th className="whitespace-nowrap px-4 py-3 text-right text-xs text-gray-500">
                                                    QTY_IN_BASKETS
                                                </th>
                                                <th className="px-4 py-3 text-right text-xs text-gray-500">
                                                    Ενέργειες
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {pendingRows.map((row) => {
                                                const rowUpdating = updatingId === row.BASKETID;
                                                const rowIsEditing = editingId === row.BASKETID;
                                                const currentRequestedQty = getRequestedQty(row);
                                                const qtyChanged =
                                                    String(editedQty) !== String(currentRequestedQty);

                                                return (
                                                    <tr
                                                        key={row.BASKETID}
                                                        className={
                                                            rowIsEditing
                                                                ? "bg-blue-50 dark:bg-blue-900/20"
                                                                : ""
                                                        }
                                                    >
                                                        <td className="px-4 py-3">
                                                            <span
                                                                className={`rounded-full px-2 py-1 text-xs ${getStatusStyle(
                                                                    row.STATUS
                                                                )}`}
                                                            >
                                                                {row.STATUS}
                                                            </span>
                                                        </td>

                                                        <td className="whitespace-nowrap px-4 py-3">
                                                            {formatDateTime(row.INS_DATE)}
                                                        </td>

                                                        <td className="px-4 py-3">{row.BASKETID}</td>
                                                        <td className="px-4 py-3">{row.MTRL}</td>
                                                        <td className="px-4 py-3">{row.ITEM_CODE}</td>
                                                        <td className="px-4 py-3">{row.ITEM_NAME}</td>
                                                        <td className="px-4 py-3">{row.BRANCH}</td>

                                                        <td className="px-4 py-3 text-right">
                                                            {rowIsEditing ? (
                                                                <input
                                                                    type="number"
                                                                    min={1}
                                                                    step={1}
                                                                    autoFocus
                                                                    disabled={rowUpdating}
                                                                    value={editedQty}
                                                                    onChange={(event) =>
                                                                        setEditedQty(event.target.value)
                                                                    }
                                                                    onKeyDown={(event) => {
                                                                        if (event.key === "Enter") {
                                                                            void handleUpdateQty(row);
                                                                        }

                                                                        if (event.key === "Escape") {
                                                                            handleCancelQtyEdit();
                                                                        }
                                                                    }}
                                                                    className={`w-20 rounded-md border px-2 py-1 text-right text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${qtyChanged
                                                                            ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200 dark:border-blue-400 dark:bg-blue-500/10"
                                                                            : "border-gray-300 dark:border-gray-700 dark:bg-gray-900"
                                                                        }`}
                                                                />
                                                            ) : (
                                                                <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                                                                    {currentRequestedQty}
                                                                </span>
                                                            )}
                                                        </td>

                                                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                                                            {row.TOTAL_AVAIL}
                                                        </td>
                                                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                                                            {row.YP1001}
                                                        </td>
                                                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                                                            {row.YP1006}
                                                        </td>
                                                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                                                            {row.YP1007}
                                                        </td>
                                                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                                                            {row.ONGOING}
                                                        </td>
                                                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                                                            {row.ORDERED}
                                                        </td>
                                                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                                                            {row.QTY_IN_BASKETS}
                                                        </td>

                                                        <td className="px-4 py-3 text-right">
                                                            {rowIsEditing ? (
                                                                <div className="flex justify-end gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => void handleUpdateQty(row)}
                                                                        disabled={rowUpdating || !qtyChanged}
                                                                        className="rounded-md bg-blue-500 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-blue-600 disabled:opacity-40"
                                                                    >
                                                                        {rowUpdating ? (
                                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                        ) : (
                                                                            "Save"
                                                                        )}
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={handleCancelQtyEdit}
                                                                        disabled={rowUpdating}
                                                                        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex justify-end gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleStartQtyEdit(row)}
                                                                        disabled={rowUpdating || hasRowInEditMode}
                                                                        title="Επεξεργασία ποσότητας"
                                                                        aria-label={`Επεξεργασία ποσότητας για αίτημα ${row.BASKETID}`}
                                                                        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                                                                    >
                                                                        <Pencil className="h-3.5 w-3.5" />
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleApproveRow(row)}
                                                                        disabled={rowUpdating || hasRowInEditMode}
                                                                        title="Έγκριση αιτήματος"
                                                                        aria-label={`Έγκριση αιτήματος ${row.BASKETID}`}
                                                                        className="rounded bg-green-500 px-2 py-1 text-white disabled:opacity-40"
                                                                    >
                                                                        {rowUpdating ? (
                                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                                        ) : (
                                                                            <Check className="h-4 w-4" />
                                                                        )}
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteRow(row)}
                                                                        disabled={rowUpdating || hasRowInEditMode}
                                                                        title="Διαγραφή αιτήματος"
                                                                        aria-label={`Διαγραφή αιτήματος ${row.BASKETID}`}
                                                                        className="rounded bg-red-500 px-2 py-1 text-white disabled:opacity-40"
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        <StockOrderSummary
                            rows={doneRows}
                            requestedQtyTotal={doneRequestedQty}
                            branchLabel={currentBranchCode || "—"}
                            getStatusStyle={getStatusStyle}
                            getRequestedQty={getRequestedQty}
                            formatDateTime={formatDateTime}
                        />
                </div>
            )}
        </div>
    );
}
