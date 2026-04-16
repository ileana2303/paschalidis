"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/template components/common/PageBreadCrumb";
import {
    fetchStockRequests,
    massDeleteStockRequests,
    updateStockRequest,
} from "@/app/lib/api/items";
import { Check, Loader2, RefreshCw, Trash2, X } from "@/app/lib/lucide";
import type { IStockRequestListRow } from "@/app/lib/interface";

const BRANCHES = [
    { id: "1001", label: "Κασομούλη" },
    { id: "1006", label: "Κεντρικό" },
    { id: "1007", label: "Μεσογείων" },
] as const;

type BranchId = (typeof BRANCHES)[number]["id"];

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

export default function StockRequestsClient() {
    const [branch, setBranch] = useState<BranchId>("1001");
    const [rows, setRows] = useState<IStockRequestListRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
    const [deleting, setDeleting] = useState(false);

    const loadRows = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const data = await fetchStockRequests({ branch });
            setRows(data.rows ?? []);
            setSelectedIds(new Set());
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
    }, [branch]);

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
                qty: row.QTY,
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

    return (
        <div>
            <PageBreadcrumb pageTitle="Λίστα Αιτημάτων Ανατροφοδοσίας" />

            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]">
                <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-500 dark:text-gray-400">
                            Κατάστημα:
                        </label>
                        <select
                            value={branch}
                            onChange={(e) => setBranch(e.target.value as BranchId)}
                            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                        >
                            {BRANCHES.map((entry) => (
                                <option key={entry.id} value={entry.id}>
                                    {entry.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={loadRows}
                            disabled={loading}
                            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/5"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                            Ανανέωση
                        </button>

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
                                    <th className="px-4 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={allVisibleSelected}
                                            onChange={toggleAll}
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        ID
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        MTRL
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Κωδικός
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Περιγραφή
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Stock
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Ζήτηση
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Εισαγωγή
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Έγκριση
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
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
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusStyle(row.STATUS)}`}>
                                                    {row.STATUS}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                                {row.BASKETID}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                                {row.MTRL}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white/90">
                                                {row.ITEM_CODE}
                                            </td>
                                            <td className="max-w-[340px] px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                                <span className="block truncate" title={row.ITEM_NAME}>
                                                    {row.ITEM_NAME}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-700 dark:text-gray-300">
                                                {row.QTY}
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-gray-800 dark:text-white/90">
                                                {row.QTY_REQUESTED}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                                {row.INS_DATE}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                                {row.APPROVED_TS ?? "—"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleUpdateAction(row, "APPROVE")
                                                        }
                                                        disabled={!rowCanUpdate || rowUpdating}
                                                        className="inline-flex items-center gap-1 rounded-md bg-green-500 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-green-600 disabled:opacity-40"
                                                    >
                                                        {rowUpdating ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <Check className="h-3.5 w-3.5" />
                                                        )}
                                                        Approve
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleUpdateAction(row, "DECLINE")
                                                        }
                                                        disabled={!rowCanUpdate || rowUpdating}
                                                        className="inline-flex items-center gap-1 rounded-md bg-red-500 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-40"
                                                    >
                                                        {rowUpdating ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <X className="h-3.5 w-3.5" />
                                                        )}
                                                        Decline
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
