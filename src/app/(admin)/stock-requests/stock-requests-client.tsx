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
    useUpdateStockRequestMutation,
} from "@/hooks/queries/useApiMutations";
import { useAuthStore } from "@/stores/authStore";
import { normalizeBranchCode } from "@/lib/auth/branches";

type StockBranchCode = "1001" | "1006" | "1007";

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

function isRequestBranchStockColumn(
    requestBranchCode: string,
    stockBranchCode: StockBranchCode
) {
    return normalizeBranchCode(requestBranchCode) === stockBranchCode;
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
    const [searchTerm, setSearchTerm] = useState("");

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
                    <DataTable className="flex min-h-0 min-w-0 flex-1 flex-col xl:flex-[1.6]">
                        <DataTableHeader
                            title="Εκκρεμή Αιτήματα Ανατροφοδοσίας"
                            description="Διαχείριση αιτημάτων, ποσοτήτων και έγκρισης ανατροφοδοσίας."
                            count={pendingRows.length}
                            countClassName="bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                            action={(
                                <DataTableSearchBar
                                    value={searchTerm}
                                    onChange={setSearchTerm}
                                    onRefresh={loadRows}
                                    isRefreshing={loading}
                                    refreshDisabled={loading || Boolean(updatingId)}
                                    placeholder="Αναζήτηση με ID, MTRL, κωδικό ή περιγραφή..."
                                />
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

                                            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                Κασομούλη
                                            </th>

                                            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                Λ.Αθηνών
                                            </th>

                                            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                Λ.Μεσογείων
                                            </th>

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

                                                    <td
                                                        className={[
                                                            "whitespace-nowrap px-5 py-4 text-right align-top tabular-nums",
                                                            isRequestBranchStockColumn(row.BRANCH, "1001")
                                                                ? "bg-brand-50/60 font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-200"
                                                                : "text-gray-700 dark:text-gray-200",
                                                        ].join(" ")}
                                                    >
                                                        {row.YP1001}
                                                    </td>

                                                    <td
                                                        className={[
                                                            "whitespace-nowrap px-5 py-4 text-right align-top tabular-nums",
                                                            isRequestBranchStockColumn(row.BRANCH, "1006")
                                                                ? "bg-brand-50/60 font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-200"
                                                                : "text-gray-700 dark:text-gray-200",
                                                        ].join(" ")}
                                                    >
                                                        {row.YP1006}
                                                    </td>

                                                    <td
                                                        className={[
                                                            "whitespace-nowrap px-5 py-4 text-right align-top tabular-nums",
                                                            isRequestBranchStockColumn(row.BRANCH, "1007")
                                                                ? "bg-brand-50/60 font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-200"
                                                                : "text-gray-700 dark:text-gray-200",
                                                        ].join(" ")}
                                                    >
                                                        {row.YP1007}
                                                    </td>

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
                                                                disabled={hasRowInEditMode}
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
