"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/template components/common/PageBreadCrumb";
import { Check, Loader2, Pencil, RefreshCw, Trash2, X } from "@/app/lib/lucide";
import type {
    IStockRequestListRow,
    StockRequestUpdateAction,
} from "@/app/lib/interface";
import {
    useFetchStockRequestsMutation,
    useMassDeleteStockRequestsMutation,
    useUpdateStockRequestMutation,
} from "@/hooks/queries/useApiMutations";

function getStatusStyle(status: string) {
    const normalized = status.toUpperCase();

    if (normalized.includes("ΕΓΚΡΙΘ")) {
        return "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400";
    }

    if (normalized.includes("ΑΠΟΡΡΙ")) {
        return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400";
    }

    return "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
}

function canUpdate(status: string) {
    return status.toUpperCase().includes("ΕΚΚΡΕΜ");
}

function getStatusPriority(status: string) {
    const normalized = status.toUpperCase();

    if (normalized.includes("ΕΚΚΡΕΜ") || normalized.includes("PENDING")) return 0;
    if (normalized.includes("ΕΓΚΡΙΘ") || normalized.includes("APPROV")) return 1;
    if (normalized.includes("ΑΠΟΡΡΙ") || normalized.includes("DECLIN")) return 2;

    return 3;
}

function parseDateValue(value: string) {
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return 0;
    return timestamp;
}

function sortStockRequestRows(rows: IStockRequestListRow[]) {
    return [...rows].sort((a, b) => {
        const statusRankDiff = getStatusPriority(a.STATUS) - getStatusPriority(b.STATUS);
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

type RowMode = "view" | "edit";

export default function StockRequestsClient() {
    const [rows, setRows] = useState<IStockRequestListRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
    const [updatedIds, setUpdatedIds] = useState<Set<string>>(new Set());
    const [deleting, setDeleting] = useState(false);
    const [approvingSelected, setApprovingSelected] = useState(false);
    const [rowModes, setRowModes] = useState<Record<string, RowMode>>({});

    const [editedQty, setEditedQty] = useState<Record<string, string>>({});
    const { mutateAsync: fetchStockRequests } = useFetchStockRequestsMutation();
    const { mutateAsync: updateStockRequest } = useUpdateStockRequestMutation();
    const { mutateAsync: massDeleteStockRequests } = useMassDeleteStockRequestsMutation();

    const loadRows = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const data = await fetchStockRequests({});
            setRows(sortStockRequestRows(data.rows ?? []));
            setSelectedIds(new Set());
            setEditedQty({});
            setUpdatedIds(new Set());
            setRowModes({});
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
    }, [fetchStockRequests]);

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

    const allVisibleSelected = useMemo(() => {
        if (pendingRows.length === 0) return false;
        return pendingRows.every((row) => selectedIds.has(row.BASKETID));
    }, [pendingRows, selectedIds]);
    const selectedPendingRows = useMemo(
        () => pendingRows.filter((row) => selectedIds.has(row.BASKETID)),
        [pendingRows, selectedIds]
    );
    const hasRowInEditMode = useMemo(
        () => Object.values(rowModes).some((mode) => mode === "edit"),
        [rowModes]
    );

    useEffect(() => {
        setSelectedIds((prev) => {
            const pendingIds = new Set(pendingRows.map((row) => row.BASKETID));
            let changed = false;
            const next = new Set<string>();

            prev.forEach((id) => {
                if (pendingIds.has(id)) {
                    next.add(id);
                } else {
                    changed = true;
                }
            });

            if (!changed && next.size === prev.size) {
                return prev;
            }

            return next;
        });
    }, [pendingRows]);

    const toggleRow = (basketId: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(basketId)) next.delete(basketId);
            else next.add(basketId);
            return next;
        });
    };

    const toggleAll = () => {
        setSelectedIds((prev) => {
            if (
                pendingRows.length > 0 &&
                pendingRows.every((row) => prev.has(row.BASKETID))
            ) {
                return new Set();
            }
            return new Set(pendingRows.map((row) => row.BASKETID));
        });
    };

    const handleQtyChange = (basketId: string, value: string) => {
        setEditedQty((prev) => ({
            ...prev,
            [basketId]: value,
        }));
    };

    const getRowMode = (basketId: string): RowMode => {
        return rowModes[basketId] ?? "view";
    };

    const handleStartQtyEdit = (row: IStockRequestListRow) => {
        setRowModes((prev) => ({
            ...prev,
            [row.BASKETID]: "edit",
        }));
        setEditedQty((prev) => ({
            ...prev,
            [row.BASKETID]: row.QTY,
        }));
    };

    const handleCancelQtyEdit = (row: IStockRequestListRow) => {
        const nextQtyRaw = editedQty[row.BASKETID] ?? row.QTY;
        const isDirty = String(nextQtyRaw) !== String(row.QTY);

        if (isDirty && !window.confirm("Discard changes?")) {
            return;
        }

        setEditedQty((prev) => {
            if (!(row.BASKETID in prev)) {
                return prev;
            }

            const next = { ...prev };
            delete next[row.BASKETID];
            return next;
        });

        setRowModes((prev) => ({
            ...prev,
            [row.BASKETID]: "view",
        }));
    };

    const getValidatedQty = (value: string) => {
        const parsed = Number(String(value).trim());
        if (!Number.isInteger(parsed) || parsed <= 0) {
            return null;
        }

        return String(parsed);
    };

    const handleUpdateAction = async (
        row: IStockRequestListRow,
        action: StockRequestUpdateAction,
        qty: string
    ) => {
        setUpdatingIds((prev) => new Set(prev).add(row.BASKETID));
        setError("");

        try {
            await updateStockRequest({
                action,
                basketId: Number(row.BASKETID),
                mtrl: row.MTRL,
                qty,
            });

            if (action === "UPDATE") {
                setRows((prev) =>
                    sortStockRequestRows(
                        prev.map((entry) =>
                            entry.BASKETID === row.BASKETID
                                ? { ...entry, QTY: qty }
                                : entry
                        )
                    )
                );
                setEditedQty((prev) => {
                    const next = { ...prev };
                    delete next[row.BASKETID];
                    return next;
                });
                setRowModes((prev) => ({
                    ...prev,
                    [row.BASKETID]: "view",
                }));
                setUpdatedIds((prev) => {
                    const next = new Set(prev);
                    next.add(row.BASKETID);
                    return next;
                });
            } else {
                await loadRows();
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Αποτυχία ενημέρωσης αιτήματος"
            );
        } finally {
            setUpdatingIds((prev) => {
                const next = new Set(prev);
                next.delete(row.BASKETID);
                return next;
            });
        }
    };

    const handleUpdateQty = async (row: IStockRequestListRow) => {
        const nextQtyRaw = editedQty[row.BASKETID] ?? row.QTY;
        const normalizedQty = getValidatedQty(nextQtyRaw);

        if (!normalizedQty) {
            setError("Η τελική ποσότητα πρέπει να είναι θετικός ακέραιος αριθμός.");
            return;
        }

        await handleUpdateAction(row, "UPDATE", normalizedQty);
    };

    const handleMassDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!window.confirm(`Διαγραφή ${selectedIds.size} αιτημάτων;`)) return;

        setDeleting(true);
        setError("");

        try {
            await massDeleteStockRequests({
                basketIds: Array.from(selectedIds),
            });
            await loadRows();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Αποτυχία μαζικής διαγραφής"
            );
        } finally {
            setDeleting(false);
        }
    };

    const handleApproveSelected = async () => {
        if (selectedPendingRows.length === 0) return;
        if (
            !window.confirm(
                `Έγκριση ${selectedPendingRows.length} αιτημάτων;`
            )
        ) {
            return;
        }

        const selectedPendingIds = new Set(
            selectedPendingRows.map((row) => row.BASKETID)
        );

        setApprovingSelected(true);
        setError("");
        setUpdatingIds((prev) => {
            const next = new Set(prev);
            selectedPendingIds.forEach((id) => next.add(id));
            return next;
        });

        try {
            await Promise.all(
                selectedPendingRows.map((row) =>
                    updateStockRequest({
                        action: "APPROVE",
                        basketId: Number(row.BASKETID),
                        mtrl: row.MTRL,
                        qty: row.QTY,
                    })
                )
            );

            await loadRows();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Αποτυχία μαζικής έγκρισης αιτημάτων"
            );
        } finally {
            setApprovingSelected(false);
            setUpdatingIds((prev) => {
                const next = new Set(prev);
                selectedPendingIds.forEach((id) => next.delete(id));
                return next;
            });
        }
    };

    const isQtyChanged = (row: IStockRequestListRow) => {
        const edited = editedQty[row.BASKETID];
        if (edited === undefined) return false;

        return String(edited) !== String(row.QTY);
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
    };

    return (
        <div>
            <PageBreadcrumb pageTitle="Λίστα Αιτημάτων Ανατροφοδοσίας" />

            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]">
                {error && (
                    <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center px-5 py-16 text-gray-500 dark:text-gray-400">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Φόρτωση αιτημάτων...
                    </div>
                ) : rows.length === 0 ? (
                    <div className="px-5 py-16 text-center text-sm text-gray-500 dark:text-gray-400">
                        Δεν υπάρχουν αιτήματα ανατροφοδοσίας.
                    </div>
                ) : (
                    <div className="space-y-6 p-4">
                        <section className="rounded-lg border border-amber-200 dark:border-amber-500/20">
                            <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50/70 px-4 py-2 dark:border-amber-500/20 dark:bg-amber-500/10">
                                <div className="flex items-center gap-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                                        Pending Requests
                                    </p>
                                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                                        {pendingRows.length}
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={loadRows}
                                    disabled={loading}
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
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                                        <thead className="bg-gray-50 dark:bg-white/[0.02]">
                                            <tr>
                                                <th className="px-4 py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={allVisibleSelected}
                                                        onChange={toggleAll}
                                                    />
                                                </th>
                                                <th className="px-4 py-3 text-xs text-gray-500">Κατάσταση</th>
                                                <th className="px-4 py-3 text-xs text-gray-500">Ημ/νία Αιτήματος</th>
                                                <th className="px-4 py-3 text-xs text-gray-500">ID</th>
                                                <th className="px-4 py-3 text-xs text-gray-500">MTRL</th>
                                                <th className="px-4 py-3 text-xs text-gray-500">Κωδικός</th>
                                                <th className="px-4 py-3 text-xs text-gray-500">Περιγραφή</th>
                                                <th className="px-4 py-3 text-xs text-gray-500">Κατάστημα</th>
                                                <th className="px-4 py-3 text-xs text-gray-500 text-right">Αιτούμενη Ποσότητα</th>
                                                <th className="px-4 py-3 text-xs text-gray-500 text-right">Τελική Ποσότητα</th>
                                                <th className="px-4 py-3 text-xs text-gray-500 text-right">Ενέργειες</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {pendingRows.map((row) => {
                                                const rowUpdating = updatingIds.has(row.BASKETID);
                                                const rowMode = getRowMode(row.BASKETID);
                                                const rowIsEditing = rowMode === "edit";

                                                return (
                                                    <tr
                                                        key={row.BASKETID}
                                                        className={rowIsEditing ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                                                    >
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedIds.has(row.BASKETID)}
                                                                onChange={() => toggleRow(row.BASKETID)}
                                                            />
                                                        </td>

                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusStyle(row.STATUS)}`}>
                                                                {row.STATUS}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(row.INS_DATE)}</td>
                                                        <td className="px-4 py-3">{row.BASKETID}</td>
                                                        <td className="px-4 py-3">{row.MTRL}</td>
                                                        <td className="px-4 py-3">{row.ITEM_CODE}</td>
                                                        <td className="px-4 py-3">{row.ITEM_NAME}</td>
                                                        <td className="px-4 py-3">{row.BRANCH}</td>
                                                        <td className="px-4 py-3 text-right">{row.QTY_REQUESTED}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            {rowIsEditing ? (
                                                                <input
                                                                    type="number"
                                                                    min={1}
                                                                    step={1}
                                                                    autoFocus
                                                                    disabled={rowUpdating}
                                                                    value={editedQty[row.BASKETID] ?? row.QTY}
                                                                    onChange={(e) =>
                                                                        handleQtyChange(row.BASKETID, e.target.value)
                                                                    }
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter") {
                                                                            void handleUpdateQty(row);
                                                                        }
                                                                        if (e.key === "Escape") {
                                                                            handleCancelQtyEdit(row);
                                                                        }
                                                                    }}
                                                                    className={`w-20 rounded-md border px-2 py-1 text-sm text-right transition disabled:cursor-not-allowed disabled:opacity-60
                ${isQtyChanged(row)
                                                                            ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:border-blue-400"
                                                                            : updatedIds.has(row.BASKETID)
                                                                                ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:border-blue-400"
                                                                                : "border-gray-300 dark:border-gray-700 dark:bg-gray-900"
                                                                        }
            `}
                                                                />
                                                            ) : (
                                                                <span
                                                                    className={`text-sm font-medium ${updatedIds.has(row.BASKETID)
                                                                        ? "text-blue-600 dark:text-blue-300"
                                                                        : "text-gray-800 dark:text-white/90"
                                                                        }`}
                                                                >
                                                                    {row.QTY}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            {rowIsEditing ? (
                                                                <div className="flex justify-end gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => void handleUpdateQty(row)}
                                                                        disabled={rowUpdating || !isQtyChanged(row)}
                                                                        className="rounded-md bg-blue-500 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-blue-600 disabled:opacity-40"
                                                                    >
                                                                        Save
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleCancelQtyEdit(row)}
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
                                                                        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                                                                    >
                                                                        <Pencil className="h-3.5 w-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() =>
                                                                            handleUpdateAction(row, "APPROVE", row.QTY)
                                                                        }
                                                                        disabled={rowUpdating || hasRowInEditMode}
                                                                        className="bg-green-500 text-white px-2 py-1 rounded"
                                                                    >
                                                                        {rowUpdating ? (
                                                                            <Loader2 className="animate-spin h-4 w-4" />
                                                                        ) : (
                                                                            <Check className="h-4 w-4" />
                                                                        )}
                                                                    </button>

                                                                    <button
                                                                        onClick={() =>
                                                                            handleUpdateAction(row, "DECLINE", row.QTY)
                                                                        }
                                                                        disabled={rowUpdating || hasRowInEditMode}
                                                                        className="bg-red-500 text-white px-2 py-1 rounded"
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

                        <section className="rounded-lg border border-gray-200 dark:border-gray-800">
                            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 px-4 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
                                <div className="flex items-center gap-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">
                                        DONE
                                    </p>
                                    <span className="rounded-full bg-gray-900/10 px-2 py-0.5 text-[10px] font-semibold text-gray-700 dark:bg-gray-100/10 dark:text-gray-200">
                                        Approved / Declined
                                    </span>
                                </div>
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                    {doneRows.length}
                                </span>
                            </div>

                            {doneRows.length === 0 ? (
                                <div className="px-4 py-8 text-sm text-gray-500 dark:text-gray-400">
                                    Δεν υπάρχουν ολοκληρωμένα αιτήματα.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                                        <thead className="bg-gray-50 dark:bg-white/[0.02]">
                                            <tr>
                                                <th className="px-4 py-3 text-xs text-gray-500">Κατάσταση</th>
                                                <th className="px-4 py-3 text-xs text-gray-500">ID</th>
                                                <th className="px-4 py-3 text-xs text-gray-500">MTRL</th>
                                                <th className="px-4 py-3 text-xs text-gray-500">Κωδικός</th>
                                                <th className="px-4 py-3 text-xs text-gray-500">Περιγραφή</th>
                                                <th className="px-4 py-3 text-xs text-gray-500">Κατάστημα</th>
                                                <th className="px-4 py-3 text-xs text-gray-500 text-right">Αιτούμενη Ποσότητα</th>
                                                <th className="px-4 py-3 text-xs text-gray-500 text-right">Τελική Ποσότητα</th>
                                                <th className="px-4 py-3 text-xs text-gray-500">Ημ/νία Αιτήματος</th>
                                                <th className="px-4 py-3 text-xs text-gray-500">Ημ/νία Έγκρισης</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {doneRows.map((row) => (
                                                <tr
                                                    key={row.BASKETID}
                                                    className="bg-gray-50/40 dark:bg-white/[0.01]"
                                                >
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusStyle(row.STATUS)}`}>
                                                            {row.STATUS}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">{row.BASKETID}</td>
                                                    <td className="px-4 py-3">{row.MTRL}</td>
                                                    <td className="px-4 py-3">{row.ITEM_CODE}</td>
                                                    <td className="px-4 py-3">{row.ITEM_NAME}</td>
                                                    <td className="px-4 py-3">{row.BRANCH}</td>
                                                    <td className="px-4 py-3 text-right">{row.QTY_REQUESTED}</td>
                                                    <td className="px-4 py-3 text-right">{row.QTY}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(row.INS_DATE)}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(row.APPROVED_TS)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </div>

            {selectedIds.size > 0 && !loading && (
                <div className="fixed bottom-4 left-1/2 z-30 w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2">
                    <div className="flex w-full flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg sm:flex-row sm:items-center sm:justify-between dark:border-gray-700 dark:bg-gray-900">
                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                            {selectedIds.size} επιλεγμένα αιτήματα
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={handleApproveSelected}
                                disabled={
                                    approvingSelected ||
                                    deleting ||
                                    hasRowInEditMode
                                }
                                className="inline-flex items-center gap-1 rounded-md bg-green-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-600 disabled:opacity-40"
                            >
                                {approvingSelected ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Check className="h-3.5 w-3.5" />
                                )}
                                Έγκριση
                            </button>

                            <button
                                type="button"
                                onClick={handleMassDelete}
                                disabled={
                                    deleting ||
                                    approvingSelected ||
                                    hasRowInEditMode
                                }
                                className="inline-flex items-center gap-1 rounded-md bg-red-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-40"
                            >
                                {deleting ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                )}
                                Διαγραφή
                            </button>

                            <button
                                type="button"
                                onClick={clearSelection}
                                disabled={approvingSelected || deleting}
                                className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                            >
                                <X className="h-3.5 w-3.5" />
                                Ακύρωση επιλογής
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
