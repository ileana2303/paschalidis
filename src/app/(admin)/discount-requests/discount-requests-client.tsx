"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import { Check, Loader2 } from "@/lib/icons/lucide";
import DataTable from "@/components/ui/data-table/data-table";
import DataTableActions, {
    RowActionGroup,
} from "@/components/ui/data-table/data-table-action";
import DataTableEmptyState from "@/components/ui/data-table/data-table-empty-state";
import DataTableHeader from "@/components/ui/data-table/data-table-header";
import DataTableSearchBar from "@/components/ui/data-table/data-table-search-bar";
import NumberBadge from "@/components/ui/data-table/number-badge";
import type { IRequestedPriceListRow } from "@/lib/interface";
import {
    useFetchRequestedPriceRequestsMutation,
    useUpdateRequestedPriceRequestMutation,
} from "@/hooks/queries/useApiMutations";

function parsePositivePrice(value: unknown): number | null {
    const raw = String(value ?? "").trim();

    if (!raw) {
        return null;
    }

    const parsed = Number(raw.replace(",", "."));

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

function formatPrice(value: unknown) {
    const parsed = parsePositivePrice(value);

    if (parsed == null) {
        const fallback = String(value ?? "").trim();

        return fallback || "—";
    }

    return `${parsed.toFixed(2)} €`;
}

function normalizeBasketId(value: unknown) {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

export default function DiscountRequestsClient() {
    const { mutateAsync: fetchRequestedPriceRequests } =
        useFetchRequestedPriceRequestsMutation();
    const { mutateAsync: updateRequestedPriceRequest } =
        useUpdateRequestedPriceRequestMutation();

    const [rows, setRows] = useState<IRequestedPriceListRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [updatingId, setUpdatingId] = useState("");
    const [editingId, setEditingId] = useState("");
    const [editedPrice, setEditedPrice] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const loadRows = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const data = await fetchRequestedPriceRequests();
            setRows(data.rows ?? []);
            setEditingId("");
            setEditedPrice("");
        } catch (err) {
            setRows([]);
            setError(
                err instanceof Error
                    ? err.message
                    : "Αποτυχία φόρτωσης αιτημάτων τιμής"
            );
        } finally {
            setLoading(false);
        }
    }, [fetchRequestedPriceRequests]);

    useEffect(() => {
        void loadRows();
    }, [loadRows]);

    const filteredRows = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();

        if (!query) {
            return rows;
        }

        return rows.filter((row) =>
            [
                row.BASKETID,
                row.TRDR,
                row.CUSTOMER_NAME,
                row.MTRL,
                row.ITEM_CODE,
                row.ITEM_DESCR,
                row.KATASTIMA,
                row.PRICE_ERP,
                row.PRICE_REQ,
            ]
                .join(" ")
                .toLowerCase()
                .includes(query)
        );
    }, [rows, searchTerm]);

    const handleStartEdit = (row: IRequestedPriceListRow) => {
        setEditingId(row.BASKETID);
        setEditedPrice(String(row.PRICE_REQ ?? "").trim());
        setSuccessMessage("");
        setError("");
    };

    const handleCancelEdit = () => {
        setEditingId("");
        setEditedPrice("");
    };

    const handleApprove = async (row: IRequestedPriceListRow) => {
        const basketId = normalizeBasketId(row.BASKETID);

        if (basketId == null) {
            setError("Μη έγκυρο BASKETID");
            return;
        }

        const rowIsEditing = editingId === row.BASKETID;
        const baseRequestedPrice = parsePositivePrice(row.PRICE_REQ);
        const nextRequestedPrice = parsePositivePrice(editedPrice);
        const priceChanged =
            rowIsEditing &&
            nextRequestedPrice != null &&
            nextRequestedPrice !== baseRequestedPrice;

        if (rowIsEditing && nextRequestedPrice == null) {
            setError("Η τιμή προς έγκριση πρέπει να είναι θετικός αριθμός.");
            return;
        }

        setUpdatingId(row.BASKETID);
        setError("");
        setSuccessMessage("");

        try {
            const response = priceChanged
                ? await updateRequestedPriceRequest({
                    action: "APPROVE_WITH_PRICE",
                    basketId,
                    paschaPrice: nextRequestedPrice ?? undefined,
                })
                : await updateRequestedPriceRequest({
                    action: "APPROVE",
                    basketId,
                });

            setSuccessMessage(response.message ?? "Το αίτημα εγκρίθηκε.");
            setRows((currentRows) =>
                currentRows.filter((currentRow) => currentRow.BASKETID !== row.BASKETID)
            );
            setEditingId("");
            setEditedPrice("");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Αποτυχία έγκρισης αιτήματος"
            );
        } finally {
            setUpdatingId("");
        }
    };

    const handleReject = (row: IRequestedPriceListRow) => {
        const basketId = normalizeBasketId(row.BASKETID);

        if (basketId == null) {
            setError("Μη έγκυρο BASKETID");
            return;
        }

        if (!window.confirm(`Απόρριψη αιτήματος τιμής ID ${row.BASKETID};`)) {
            return;
        }

        setError("");
        setSuccessMessage("");

        setSuccessMessage("Το αίτημα αφαιρέθηκε από τον πίνακα αιτημάτων.");
        setRows((currentRows) =>
            currentRows.filter((currentRow) => currentRow.BASKETID !== row.BASKETID)
        );

        if (editingId === row.BASKETID) {
            setEditingId("");
            setEditedPrice("");
        }
    };

    return (
        <div className="flex h-[calc(100dvh-8rem)] flex-col overflow-hidden md:h-[calc(100dvh-9rem)]">
            <div className="shrink-0">
                <PageBreadcrumb pageTitle="Αιτήματα Έκπτωσης" />
            </div>

            {error && (
                <div className="mb-4 shrink-0 rounded-lg border border-red-100 bg-red-50 px-5 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                    {error}
                </div>
            )}

            {!error && successMessage && (
                <div className="mb-4 shrink-0 rounded-lg border border-green-100 bg-green-50 px-5 py-3 text-sm text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400">
                    {successMessage}
                </div>
            )}

            <DataTable className="flex min-h-0 min-w-0 flex-1 flex-col">
                <DataTableHeader
                    title="Εκκρεμή Αιτήματα:"
                    description="Έγκριση ή απόρριψη αιτημάτων τιμής πελατών."
                    count={rows.length}
                    action={(
                        <DataTableSearchBar
                            value={searchTerm}
                            onChange={setSearchTerm}
                            onRefresh={() => void loadRows()}
                            isRefreshing={loading}
                            refreshDisabled={loading || Boolean(updatingId)}
                            placeholder="Αναζήτηση με BASKETID, MTRL, πελάτη..."
                        />
                    )}
                />

                {loading ? (
                    <div className="flex min-h-0 flex-1 items-center justify-center px-5 py-16 text-sm text-gray-500 dark:text-gray-400">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Φόρτωση αιτημάτων...
                    </div>
                ) : rows.length === 0 ? (
                    <DataTableEmptyState
                        icon={<Check className="h-7 w-7" />}
                        title="Δεν υπάρχουν αιτήματα τιμής"
                        description="Δεν υπάρχουν αιτήματα τιμής προς έγκριση."
                        className="flex-1"
                    />
                ) : filteredRows.length === 0 ? (
                    <DataTableEmptyState
                        icon={<Check className="h-7 w-7" />}
                        title="Δεν βρέθηκαν αποτελέσματα"
                        description="Η αναζήτηση δεν επέστρεψε γραμμές."
                        className="flex-1"
                    />
                ) : (
                    <div className="min-h-0 flex-1 overflow-auto">
                        <table className="w-full table-fixed divide-y divide-gray-100 text-sm dark:divide-gray-800">
                            <colgroup>
                                <col className="w-[9%]" />
                                <col className="w-[8%]" />
                                <col className="w-[14%]" />
                                <col className="w-[8%]" />
                                <col className="w-[11%]" />
                                <col className="w-[19%]" />
                                <col className="w-[9%]" />
                                <col className="w-[8%]" />
                                <col className="w-[8%]" />
                                <col className="w-[10%]" />
                            </colgroup>

                            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-950">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">BASKETID</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">TRDR</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Πελάτης</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">MTRL</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Κωδικός</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Περιγραφή</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Κατάστημα</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Τιμή ERP</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Ζητούμενη Τιμή</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Ενέργειες</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {filteredRows.map((row) => {
                                    const rowUpdating = updatingId === row.BASKETID;
                                    const rowIsEditing = editingId === row.BASKETID;
                                    const initialRequestedPrice = String(row.PRICE_REQ ?? "").trim();
                                    const priceChanged = rowIsEditing && editedPrice !== initialRequestedPrice;

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
                                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                                                <NumberBadge value={`#${row.BASKETID}`} />
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{row.TRDR}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{row.CUSTOMER_NAME}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{row.MTRL}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{row.ITEM_CODE}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{row.ITEM_DESCR}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{row.KATASTIMA}</td>
                                            <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-200">
                                                {formatPrice(row.PRICE_ERP)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {rowIsEditing ? (
                                                    <input
                                                        type="number"
                                                        min={0.01}
                                                        step="0.01"
                                                        autoFocus
                                                        disabled={rowUpdating}
                                                        value={editedPrice}
                                                        onChange={(event) => setEditedPrice(event.target.value)}
                                                        onKeyDown={(event) => {
                                                            if (event.key === "Enter") {
                                                                void handleApprove(row);
                                                            }

                                                            if (event.key === "Escape") {
                                                                handleCancelEdit();
                                                            }
                                                        }}
                                                        className={`w-28 rounded-md border px-2 py-1 text-right text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${priceChanged
                                                            ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200 dark:border-blue-400 dark:bg-blue-500/10"
                                                            : "border-gray-300 dark:border-gray-700 dark:bg-gray-900"
                                                            }`}
                                                    />
                                                ) : (
                                                    <NumberBadge
                                                        value={formatPrice(row.PRICE_REQ)}
                                                        variant="brand"
                                                        className="min-w-[84px]"
                                                    />
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {rowIsEditing ? (
                                                    <DataTableActions>
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleApprove(row)}
                                                            disabled={rowUpdating || !priceChanged}
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
                                                            onClick={handleCancelEdit}
                                                            disabled={rowUpdating}
                                                            className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </DataTableActions>
                                                ) : (
                                                    <RowActionGroup
                                                        loading={rowUpdating}
                                                        disabled={Boolean(editingId)}
                                                        onEdit={() => handleStartEdit(row)}
                                                        onApprove={() => void handleApprove(row)}
                                                        onDelete={() => handleReject(row)}
                                                        editTitle="Αλλαγή τιμής"
                                                        approveTitle="Έγκριση αιτήματος"
                                                        deleteTitle="Απόρριψη αιτήματος"
                                                        editAriaLabel={`Αλλαγή τιμής για αίτημα ${row.BASKETID}`}
                                                        approveAriaLabel={`Έγκριση αιτήματος ${row.BASKETID}`}
                                                        deleteAriaLabel={`Απόρριψη αιτήματος ${row.BASKETID}`}
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
        </div>
    );
}
