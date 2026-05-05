"use client";

import { useCallback, useEffect, useState } from "react";
import PageBreadcrumb from "@/components/template components/common/PageBreadCrumb";
import { Check, Loader2, Pencil, RefreshCw, X } from "@/lib/icons/lucide";
import type { IRequestedPriceListRow } from "@/lib/interface";
import {
    useDeleteBasketItemsMutation,
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
    const { mutateAsync: deleteBasketItems } =
        useDeleteBasketItemsMutation();

    const [rows, setRows] = useState<IRequestedPriceListRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [updatingId, setUpdatingId] = useState("");
    const [editingId, setEditingId] = useState("");
    const [editedPrice, setEditedPrice] = useState("");

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

    const handleDelete = async (row: IRequestedPriceListRow) => {
        const basketId = normalizeBasketId(row.BASKETID);

        if (basketId == null) {
            setError("Μη έγκυρο BASKETID");
            return;
        }

        if (!window.confirm(`Διαγραφή αιτήματος ID ${row.BASKETID};`)) {
            return;
        }

        setUpdatingId(row.BASKETID);
        setError("");
        setSuccessMessage("");

        try {
            const response = await deleteBasketItems({
                basketIds: [basketId],
            });

            setSuccessMessage(response.message ?? "Το αίτημα διαγράφηκε.");
            setRows((currentRows) =>
                currentRows.filter((currentRow) => currentRow.BASKETID !== row.BASKETID)
            );

            if (editingId === row.BASKETID) {
                setEditingId("");
                setEditedPrice("");
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Αποτυχία διαγραφής αιτήματος"
            );
        } finally {
            setUpdatingId("");
        }
    };

    return (
        <div className="flex h-[calc(100dvh-8rem)] flex-col overflow-hidden md:h-[calc(100dvh-9rem)]">
            <div className="shrink-0">
                <PageBreadcrumb pageTitle="Αιτήματα Τιμών" />
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

            <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 px-4 py-2 dark:border-gray-800 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">
                            Εκκρεμή Αιτήματα Τιμής
                        </p>

                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                            {rows.length}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={() => void loadRows()}
                        disabled={loading || Boolean(updatingId)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-200 dark:hover:bg-white/[0.04]"
                    >
                        {loading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        Ανανέωση
                    </button>
                </div>

                {loading ? (
                    <div className="flex min-h-0 flex-1 items-center justify-center px-5 py-16 text-sm text-gray-500 dark:text-gray-400">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Φόρτωση αιτημάτων...
                    </div>
                ) : rows.length === 0 ? (
                    <div className="flex min-h-0 flex-1 items-center justify-center px-5 py-16 text-center text-sm text-gray-500 dark:text-gray-400">
                        Δεν υπάρχουν αιτήματα τιμής προς έγκριση.
                    </div>
                ) : (
                    <div className="min-h-0 flex-1 overflow-auto">
                        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                            <thead className="bg-gray-50 dark:bg-white/[0.02]">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs text-gray-500">BASKETID</th>
                                    <th className="px-4 py-3 text-left text-xs text-gray-500">TRDR</th>
                                    <th className="px-4 py-3 text-left text-xs text-gray-500">Πελάτης</th>
                                    <th className="px-4 py-3 text-left text-xs text-gray-500">MTRL</th>
                                    <th className="px-4 py-3 text-left text-xs text-gray-500">Κωδικός</th>
                                    <th className="px-4 py-3 text-left text-xs text-gray-500">Περιγραφή</th>
                                    <th className="px-4 py-3 text-left text-xs text-gray-500">Κατάστημα</th>
                                    <th className="px-4 py-3 text-right text-xs text-gray-500">Τιμή ERP</th>
                                    <th className="px-4 py-3 text-right text-xs text-gray-500">Ζητούμενη Τιμή</th>
                                    <th className="px-4 py-3 text-right text-xs text-gray-500">Ενέργειες</th>
                                </tr>
                            </thead>

                            <tbody>
                                {rows.map((row) => {
                                    const rowUpdating = updatingId === row.BASKETID;
                                    const rowIsEditing = editingId === row.BASKETID;
                                    const initialRequestedPrice = String(row.PRICE_REQ ?? "").trim();
                                    const priceChanged = rowIsEditing && editedPrice !== initialRequestedPrice;

                                    return (
                                        <tr
                                            key={row.BASKETID}
                                            className={rowIsEditing ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                                        >
                                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{row.BASKETID}</td>
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
                                                        className={`w-28 rounded-md border px-2 py-1 text-right text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                                            priceChanged
                                                                ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200 dark:border-blue-400 dark:bg-blue-500/10"
                                                                : "border-gray-300 dark:border-gray-700 dark:bg-gray-900"
                                                        }`}
                                                    />
                                                ) : (
                                                    <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                                                        {formatPrice(row.PRICE_REQ)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {rowIsEditing ? (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleApprove(row)}
                                                            disabled={rowUpdating}
                                                            title="Έγκριση αιτήματος με την τιμή"
                                                            aria-label={`Έγκριση αιτήματος ${row.BASKETID} με τιμή`}
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
                                                            onClick={handleCancelEdit}
                                                            disabled={rowUpdating}
                                                            title="Ακύρωση επεξεργασίας"
                                                            aria-label={`Ακύρωση επεξεργασίας για αίτημα ${row.BASKETID}`}
                                                            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStartEdit(row)}
                                                            disabled={rowUpdating || Boolean(editingId)}
                                                            title="Αλλαγή τιμής"
                                                            aria-label={`Αλλαγή τιμής για αίτημα ${row.BASKETID}`}
                                                            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => void handleApprove(row)}
                                                            disabled={rowUpdating || Boolean(editingId)}
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
                                                            onClick={() => void handleDelete(row)}
                                                            disabled={rowUpdating || Boolean(editingId)}
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
        </div>
    );
}
