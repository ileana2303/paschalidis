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
import toast from "react-hot-toast";
import {
    useFetchRequestedPriceRequestsMutation,
    useUpdateRequestedPriceRequestMutation,
} from "@/hooks/queries/useApiMutations";
import { useRequestListIntervalRefresh } from "@/hooks/queries/useRequestListIntervalRefresh";
import { useSessionState } from "@/hooks/useSessionState";
import { resolveBranchName } from "@/lib/auth/branches";
import { getBranchColor } from "@/lib/branch-colors";
import {
    formatPrice,
    normalizeBasketId,
    parsePositivePrice,
} from "@/lib/utils/price-requests";

type PriceRequestRowProps = {
    row: IRequestedPriceListRow;
    rowUpdating: boolean;
    rowIsEditing: boolean;
    editedPrice: string;
    priceChanged: boolean;
    editingId: string;
    onEditedPriceChange: (value: string) => void;
    onStartEdit: (row: IRequestedPriceListRow) => void;
    onCancelEdit: () => void;
    onApprove: (row: IRequestedPriceListRow) => void;
    onReject: (row: IRequestedPriceListRow) => void;
};

function PriceRequestMobileCard({
    row,
    rowUpdating,
    rowIsEditing,
    editedPrice,
    priceChanged,
    editingId,
    onEditedPriceChange,
    onStartEdit,
    onCancelEdit,
    onApprove,
    onReject,
}: PriceRequestRowProps) {
    return (
        <article
            className={[
                "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/80",
                rowIsEditing
                    ? "ring-2 ring-brand-500/25 dark:ring-brand-500/30"
                    : "",
            ].join(" ")}
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <NumberBadge value={`#${row.BASKETID}`} />
                <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getBranchColor(row.KATASTIMA)}`}
                >
                    {resolveBranchName(row.KATASTIMA)}
                </span>
            </div>

            <p className="mt-3 text-base font-semibold text-gray-900 dark:text-white">
                {row.CUSTOMER_NAME}
            </p>

            <div className="mt-4 rounded-xl bg-gray-50 px-3 py-3 dark:bg-gray-950">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {row.ITEM_CODE}
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    {row.ITEM_DESCR}
                </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-200 px-3 py-2.5 dark:border-gray-700">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Τιμή ERP
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
                        {formatPrice(row.PRICE_ERP)}
                    </p>
                </div>
                <div className="rounded-xl border border-brand-200 bg-brand-50/50 px-3 py-2.5 dark:border-brand-500/30 dark:bg-brand-500/10">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                        Ζητούμενη
                    </p>
                    {rowIsEditing ? (
                        <input
                            type="number"
                            min={0.01}
                            step="0.01"
                            autoFocus
                            disabled={rowUpdating}
                            value={editedPrice}
                            onChange={(event) => onEditedPriceChange(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    void onApprove(row);
                                }

                                if (event.key === "Escape") {
                                    onCancelEdit();
                                }
                            }}
                            className={`mt-1 w-full rounded-md border px-2 py-1.5 text-right text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${priceChanged
                                ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200 dark:border-blue-400 dark:bg-blue-500/10"
                                : "border-gray-300 dark:border-gray-700 dark:bg-gray-900"
                                }`}
                        />
                    ) : (
                        <p className="mt-1 text-sm font-semibold text-brand-700 dark:text-brand-300">
                            {formatPrice(row.PRICE_REQ)}
                        </p>
                    )}
                </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {rowIsEditing ? (
                    <>
                        <button
                            type="button"
                            onClick={() => void onApprove(row)}
                            disabled={rowUpdating || !priceChanged}
                            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-700"
                        >
                            {rowUpdating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Check className="h-4 w-4" />
                            )}
                            Αποθήκευση
                        </button>
                        <button
                            type="button"
                            onClick={onCancelEdit}
                            disabled={rowUpdating}
                            className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                        >
                            Ακύρωση
                        </button>
                    </>
                ) : (
                    <RowActionGroup
                        variant="prominent"
                        className="w-full max-w-md"
                        loading={rowUpdating}
                        disabled={Boolean(editingId)}
                        onEdit={() => onStartEdit(row)}
                        onApprove={() => void onApprove(row)}
                        onDelete={() => onReject(row)}
                        editTitle="Αλλαγή τιμής"
                        approveTitle="Έγκριση"
                        deleteTitle="Απόρριψη"
                        editAriaLabel={`Αλλαγή τιμής για αίτημα ${row.BASKETID}`}
                        approveAriaLabel={`Έγκριση αιτήματος ${row.BASKETID}`}
                        deleteAriaLabel={`Απόρριψη αιτήματος ${row.BASKETID}`}
                    />
                )}
            </div>
        </article>
    );
}

export default function PriceRequestsClient() {
    const { mutateAsync: fetchRequestedPriceRequests } =
        useFetchRequestedPriceRequestsMutation();
    const { mutateAsync: updateRequestedPriceRequest } =
        useUpdateRequestedPriceRequestMutation();

    const [rows, setRows] = useState<IRequestedPriceListRow[]>([]);
    const [loading, setLoading] = useState(true);

    const [updatingId, setUpdatingId] = useState("");
    const [editingId, setEditingId] = useState("");
    const [editedPrice, setEditedPrice] = useState("");
    const [searchTerm, setSearchTerm] = useSessionState(
        "price-requests-search",
        ""
    );

    const loadRows = useCallback(async () => {
        setLoading(true);

        try {
            const data = await fetchRequestedPriceRequests();
            setRows(
                [...(data.rows ?? [])].sort(
                    (a, b) =>
                        (normalizeBasketId(b.BASKETID) ?? 0) -
                        (normalizeBasketId(a.BASKETID) ?? 0)
                )
            );
            setEditingId("");
            setEditedPrice("");
        } catch (err) {
            setRows([]);
            toast.error(
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

    useRequestListIntervalRefresh({ refetch: loadRows });

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
    };

    const handleCancelEdit = () => {
        setEditingId("");
        setEditedPrice("");
    };

    const handleApprove = async (row: IRequestedPriceListRow) => {
        const basketId = normalizeBasketId(row.BASKETID);

        if (basketId == null) {
            toast.error("Μη έγκυρο BASKETID");
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
            toast.error("Η τιμή προς έγκριση πρέπει να είναι θετικός αριθμός.");
            return;
        }

        setUpdatingId(row.BASKETID);

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

            const message = response.message ?? "Το αίτημα εγκρίθηκε.";
            toast.success(message);
            setRows((currentRows) =>
                currentRows.filter((currentRow) => currentRow.BASKETID !== row.BASKETID)
            );
            setEditingId("");
            setEditedPrice("");
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Αποτυχία έγκρισης αιτήματος";
            toast.error(message);
        } finally {
            setUpdatingId("");
        }
    };

    const handleReject = (row: IRequestedPriceListRow) => {
        const basketId = normalizeBasketId(row.BASKETID);

        if (basketId == null) {
            toast.error("Μη έγκυρο BASKETID");
            return;
        }

        if (!window.confirm(`Απόρριψη αιτήματος τιμής ID ${row.BASKETID};`)) {
            return;
        }

        const message = "Το αίτημα αφαιρέθηκε από τον πίνακα αιτημάτων.";
        toast.success(message);
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
                <PageBreadcrumb pageTitle="Αιτήματα Τιμών" />
            </div>

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
                            placeholder="Αναζήτηση με BASKETID, πελάτη..."
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
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        <div className="flex flex-col gap-3 p-4 lg:hidden">
                            {filteredRows.map((row) => {
                                const rowUpdating = updatingId === row.BASKETID;
                                const rowIsEditing = editingId === row.BASKETID;
                                const initialRequestedPrice = String(row.PRICE_REQ ?? "").trim();
                                const priceChanged =
                                    rowIsEditing && editedPrice !== initialRequestedPrice;

                                return (
                                    <PriceRequestMobileCard
                                        key={`mobile-${row.BASKETID}`}
                                        row={row}
                                        rowUpdating={rowUpdating}
                                        rowIsEditing={rowIsEditing}
                                        editedPrice={editedPrice}
                                        priceChanged={priceChanged}
                                        editingId={editingId}
                                        onEditedPriceChange={setEditedPrice}
                                        onStartEdit={handleStartEdit}
                                        onCancelEdit={handleCancelEdit}
                                        onApprove={handleApprove}
                                        onReject={handleReject}
                                    />
                                );
                            })}
                        </div>

                        <table className="hidden w-full table-fixed divide-y divide-gray-100 text-sm lg:table dark:divide-gray-800">
                            <colgroup>
                                <col className="w-[20%]" />
                                <col className="w-[12%]" />
                                <col className="w-[22%]" />
                                <col className="w-[8%]" />
                                <col className="w-[10%]" />
                                <col className="w-[12%]" />
                                <col className="w-[16%]" />
                            </colgroup>

                            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-950">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Πελάτης</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Κωδικός</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Περιγραφή</th>
                                    <th className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Κατάστημα</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Τιμή ERP</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Ζητούμενη Τιμή</th>
                                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Ενέργειες</th>
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
                                            <td className="truncate px-4 py-3 text-sm text-gray-700 dark:text-gray-200" title={row.CUSTOMER_NAME}>{row.CUSTOMER_NAME}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{row.ITEM_CODE}</td>
                                            <td className="truncate px-4 py-3 text-sm text-gray-700 dark:text-gray-200" title={row.ITEM_DESCR}>{row.ITEM_DESCR}</td>
                                            <td className="px-2 py-3 text-center text-sm">
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getBranchColor(row.KATASTIMA)}`}
                                                >
                                                    {resolveBranchName(row.KATASTIMA)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-200">
                                                {formatPrice(row.PRICE_ERP)}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-3 text-right">
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
                                            <td className="whitespace-nowrap px-3 py-3 text-right">
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
