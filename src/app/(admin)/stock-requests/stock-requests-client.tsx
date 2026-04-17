"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/template components/common/PageBreadCrumb";
import {
    fetchStockRequests,
    massDeleteStockRequests,
    updateStockRequest,
} from "@/app/lib/api/items";
import { Check, Loader2, Trash2, X } from "@/app/lib/lucide";
import type { IStockRequestListRow } from "@/app/lib/interface";

const DEFAULT_BRANCH = "1001";

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

export default function StockRequestsClient() {
    const [rows, setRows] = useState<IStockRequestListRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
    const [deleting, setDeleting] = useState(false);

    const [editedQty, setEditedQty] = useState<Record<string, string>>({});

    const loadRows = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const data = await fetchStockRequests({ branch: DEFAULT_BRANCH });
            setRows(sortStockRequestRows(data.rows ?? []));
            setSelectedIds(new Set());
            setEditedQty({});
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
    }, []);

    useEffect(() => {
        loadRows();
    }, [loadRows]);

    const allVisibleSelected = useMemo(() => {
        if (rows.length === 0) return false;
        return rows.every((row) => selectedIds.has(row.BASKETID));
    }, [rows, selectedIds]);

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
            if (rows.length > 0 && rows.every((row) => prev.has(row.BASKETID))) {
                return new Set();
            }
            return new Set(rows.map((row) => row.BASKETID));
        });
    };

    const handleQtyChange = (basketId: string, value: string) => {
        setEditedQty((prev) => ({
            ...prev,
            [basketId]: value,
        }));
    };

    const handleUpdateAction = async (
        row: IStockRequestListRow,
        action: "APPROVE" | "DECLINE"
    ) => {
        setUpdatingIds((prev) => new Set(prev).add(row.BASKETID));
        setError("");

        try {
            await updateStockRequest({
                action,
                basketId: Number(row.BASKETID),
                mtrl: row.MTRL,
                qty: editedQty[row.BASKETID] ?? row.QTY_REQUESTED,
            });

            await loadRows();
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

    const handleMassDelete = async () => {
        if (selectedIds.size === 0) return;

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

    const isQtyChanged = (row: IStockRequestListRow) => {
        const edited = editedQty[row.BASKETID];
        if (edited === undefined) return false;

        return String(edited) !== String(row.QTY_REQUESTED);
    };

    return (
        <div>
            <PageBreadcrumb pageTitle="Λίστα Αιτημάτων Ανατροφοδοσίας" />

            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]">
                <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
            
                    <button
                        type="button"
                        onClick={handleMassDelete}
                        disabled={deleting || selectedIds.size === 0}
                        className="flex items-center gap-2 rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-40"
                    >
                        {deleting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Διαγραφή Επιλεγμένων ({selectedIds.size})
                    </button>
                </div>

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
                                    <th className="px-4 py-3 text-xs text-gray-500">ID</th>
                                    <th className="px-4 py-3 text-xs text-gray-500">MTRL</th>
                                    <th className="px-4 py-3 text-xs text-gray-500">Κωδικός</th>
                                    <th className="px-4 py-3 text-xs text-gray-500">Περιγραφή</th>
                                    <th className="px-4 py-3 text-xs text-gray-500">Κατάστημα</th>
                                    <th className="px-4 py-3 text-xs text-gray-500 text-right">Απόθεμα</th>
                                    <th className="px-4 py-3 text-xs text-gray-500 text-right">Αιτούμενη Ποσότητα</th>
                                    <th className="px-4 py-3 text-xs text-gray-500 text-right">Εγκεκριμένη Ποσότητα</th>
                                    <th className="px-4 py-3 text-xs text-gray-500">Ημ/νία Αιτήματος</th>
                                    <th className="px-4 py-3 text-xs text-gray-500">Ημ/νία Έγκρισης</th>
                                    <th className="px-4 py-3 text-xs text-gray-500 text-right">Ενέργειες</th>
                                </tr>
                            </thead>

                            <tbody>
                                {rows.map((row) => {
                                    const rowUpdating = updatingIds.has(row.BASKETID);
                                    const rowCanUpdate = canUpdate(row.STATUS);

                                    return (
                                        <tr key={row.BASKETID}>
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

                                            <td className="px-4 py-3">{row.BASKETID}</td>
                                            <td className="px-4 py-3">{row.MTRL}</td>
                                            <td className="px-4 py-3">{row.ITEM_CODE}</td>
                                            <td className="px-4 py-3">{row.ITEM_NAME}</td>
                                            <td className="px-4 py-3">{row.BRANCH}</td>
                                            <td className="px-4 py-3 text-right">{row.QTY}</td>
                                            <td className="px-4 py-3 text-right">{row.QTY_REQUESTED}</td>
                                            <td className="px-4 py-3 text-right">
                                                <input
                                                    type="number"
                                                    value={editedQty[row.BASKETID] ?? row.QTY_REQUESTED}
                                                    onChange={(e) =>
                                                        handleQtyChange(row.BASKETID, e.target.value)
                                                    }
                                                    className={`w-20 rounded-md border px-2 py-1 text-sm text-right transition
                ${isQtyChanged(row)
                                                            ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:border-blue-400"
                                                            : "border-gray-300 dark:border-gray-700 dark:bg-gray-900"
                                                        }
            `}
                                                />

                                                {isQtyChanged(row) && (
                                                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(row.INS_DATE)}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(row.APPROVED_TS)}</td>

                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() =>
                                                            handleUpdateAction(row, "APPROVE")
                                                        }
                                                        disabled={!rowCanUpdate || rowUpdating}
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
                                                            handleUpdateAction(row, "DECLINE")
                                                        }
                                                        disabled={!rowCanUpdate || rowUpdating}
                                                        className="bg-red-500 text-white px-2 py-1 rounded"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
