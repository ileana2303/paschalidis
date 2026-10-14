"use client";

import { useCallback, useState } from "react";
import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import DataTable from "@/components/ui/data-table/data-table";
import DataTableEmptyState from "@/components/ui/data-table/data-table-empty-state";
import DataTableHeader from "@/components/ui/data-table/data-table-header";
import DataTableSearchBar from "@/components/ui/data-table/data-table-search-bar";
import { useSearchSuppliersMutation } from "@/hooks/queries/useApiMutations";
import { useSessionState } from "@/hooks/useSessionState";
import type { ISupplierRow } from "@/lib/interface";
import { AlertCircle, Loader2, Truck } from "@/lib/icons/lucide";

type SuppliersListSessionResults = {
    rows: ISupplierRow[];
    hasSearched: boolean;
};

const EMPTY_SUPPLIERS_RESULTS: SuppliersListSessionResults = {
    rows: [],
    hasSearched: false,
};

export default function SuppliersListClient() {
    const { mutateAsync: searchSuppliers, isPending } =
        useSearchSuppliersMutation();
    const [searchTerm, setSearchTerm] = useSessionState(
        "suppliers-list-search",
        ""
    );
    const [results, setResults] = useSessionState(
        "suppliers-list-results",
        EMPTY_SUPPLIERS_RESULTS
    );
    const { rows, hasSearched } = results;
    const [error, setError] = useState("");
    const handleSearch = useCallback(async () => {
        const trimmedSearch = searchTerm.trim();

        if (!trimmedSearch) {
            return;
        }

        setError("");

        try {
            const data = await searchSuppliers(trimmedSearch);
            setResults({
                rows: data.rows ?? [],
                hasSearched: true,
            });
        } catch (searchError) {
            setResults({ rows: [], hasSearched: true });
            setError(
                searchError instanceof Error
                    ? searchError.message
                    : "Αποτυχία αναζήτησης προμηθευτών."
            );
        }
    }, [searchSuppliers, searchTerm, setResults]);

    const handleClearSearch = useCallback(() => {
        setSearchTerm("");
        setResults(EMPTY_SUPPLIERS_RESULTS);
        setError("");
    }, [setResults, setSearchTerm]);

    const totalCount = rows.length;

    return (
        <div className="flex min-h-[calc(100dvh-8rem)] min-w-0 max-w-full flex-col md:min-h-[calc(100dvh-9rem)] xl:h-[calc(100dvh-9rem)] xl:min-h-0 xl:overflow-hidden">
            <div className="shrink-0">
                <PageBreadcrumb pageTitle="Λίστα Προμηθευτών" />
            </div>

            <DataTable className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
                <DataTableHeader
                    className="shrink-0"
                    title="Αναζήτηση Προμηθευτών"
                    description={
                        hasSearched
                            ? `${totalCount} αποτελέσματα`
                            : "Αναζητήστε με όνομα, κωδικό ή ΑΦΜ"
                    }
                    action={(
                        <DataTableSearchBar
                            value={searchTerm}
                            onChange={setSearchTerm}
                            onSubmit={() => void handleSearch()}
                            onRefresh={() => void handleSearch()}
                            isRefreshing={isPending}
                            refreshDisabled={isPending || !searchTerm.trim()}
                            placeholder="Π.χ. ΑΦΜ, κωδικός..."
                            onClear={handleClearSearch}
                        />
                    )}
                />

                {error ? (
                    <div className="mx-5 mb-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                        <p>{error}</p>
                    </div>
                ) : null}

                {isPending ? (
                    <div className="flex min-h-0 flex-1 items-center justify-center py-16 text-gray-500 dark:text-gray-400">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin text-brand-500" />
                        Αναζήτηση προμηθευτών...
                    </div>
                ) : !hasSearched ? (
                    <DataTableEmptyState
                        className="min-h-0 flex-1"
                        icon={<Truck className="h-7 w-7" />}
                        title="Αναζήτηση προμηθευτών"
                        description="Πληκτρολογήστε όρο αναζήτησης και πατήστε Enter ή το κουμπί αναζήτησης."
                    />
                ) : rows.length === 0 ? (
                    <DataTableEmptyState
                        className="min-h-0 flex-1"
                        icon={<Truck className="h-7 w-7" />}
                        title="Δεν βρέθηκαν προμηθευτές"
                        description="Δοκιμάστε διαφορετικό όρο αναζήτησης."
                    />
                ) : (
                    <div className="min-h-0 flex-1 overflow-auto">
                        <table className="w-full min-w-[480px] divide-y divide-gray-100 text-sm dark:divide-gray-800">
                            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-950">
                                <tr>
                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        NAME
                                    </th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        AFM
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {rows.map((row, index) => (
                                    <tr
                                        key={`${row.TRDR}-${index}`}
                                        className="transition hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                                    >
                                        <td className="px-5 py-3 align-middle text-gray-800 dark:text-gray-100">
                                            {row.NAME || "—"}
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3 align-middle tabular-nums text-gray-600 dark:text-gray-300">
                                            {row.AFM || "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </DataTable>
        </div>
    );
}
