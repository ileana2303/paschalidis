"use client";

import PageBreadcrumb from "@/components/template components/common/PageBreadCrumb";
import { useEffect, useRef, useState } from "react";
import { ICustomerInfo } from "@/app/lib/interface";
import { useCustomerStore } from "@/stores/customerStore";
import { useCustomerSearchStore } from "@/stores/customerSearchStore";
import { useRouter } from "next/navigation";
import SearchBar from "@/components/search/search-bar";
import { useSearchCustomersMutation } from "@/hooks/queries/useApiMutations";

export default function SearchCustomerClient() {
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const search = useCustomerSearchStore((state) => state.search);
    const customers = useCustomerSearchStore((state) => state.customers);
    const hasSearched = useCustomerSearchStore((state) => state.hasSearched);
    const setSearchValue = useCustomerSearchStore((state) => state.setSearch);
    const setCustomerResults = useCustomerSearchStore((state) => state.setCustomers);
    const setSearchAttempted = useCustomerSearchStore((state) => state.setHasSearched);
    const clearSearchState = useCustomerSearchStore((state) => state.clearSearchState);
    const setCustomer = useCustomerStore((state) => state.setCustomer);
    const router = useRouter();
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchCustomersMutation = useSearchCustomersMutation();

    useEffect(() => {
        clearSearchState();
        searchInputRef.current?.focus();
    }, [clearSearchState]);

    const handleSearch = async () => {
        const trimmedSearch = search.trim();

        if (!trimmedSearch) return;

        setErrorMessage("");
        setSearchValue(trimmedSearch);
        setSearchAttempted(true);
        setLoading(true);

        try {
            const data = await searchCustomersMutation.mutateAsync(trimmedSearch);

            if (data.success) {
                setCustomerResults(data.rows);
            } else {
                setCustomerResults([]);
            }
        } catch (error) {
            setCustomerResults([]);
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Η αναζήτηση πελατών δεν είναι διαθέσιμη προσωρινά"
            );
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <PageBreadcrumb pageTitle="Αναζήτηση Πελάτη" />

            <div className="max-h-[calc(100dvh-14rem)] overflow-y-auto overscroll-contain rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] lg:max-h-[calc(100dvh-10.5rem)]">
                <div className="sticky top-0 z-10 bg-white px-5 py-7 dark:bg-[#0f172a] xl:px-10 xl:py-12">
                    <div className="mx-auto w-full max-w-[820px] text-center xl:max-w-[1120px] 2xl:max-w-[1360px]">
                        <h3 className="mb-4 text-theme-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl">
                            Βρείτε τον πελάτη στη λίστα των καταχωρημένων πελατών
                        </h3>

                        <SearchBar
                            inputRef={searchInputRef}
                            value={search}
                            onChange={setSearchValue}
                            onSearch={handleSearch}
                            onClear={clearSearchState}
                            placeholder="Όνομα, ΑΦΜ, email..."
                            loading={loading}
                            containerClassName="mt-6"
                        />
                    </div>
                </div>

                <div className="px-5 pb-7 xl:px-10 xl:pb-12">
                    <div className="mx-auto mt-6 w-full max-w-[820px] space-y-3 text-left xl:max-w-[1120px] 2xl:max-w-[1360px]">
                        {errorMessage && (
                            <p className="mb-3 text-sm text-error-600">
                                {errorMessage}
                            </p>
                        )}

                        {customers.length > 0 && (
                            <p className="mb-3 text-sm text-gray-500">
                                Βρέθηκαν {customers.length} πελάτες
                            </p>
                        )}

                        {customers.map((c: ICustomerInfo) => (
                            <div
                                key={c.TRDR}
                                onClick={() => {
                                    setCustomer(c);

                                    router.push(`/search-parts?trdr=${c.TRDR}`);
                                }}
                                className="rounded-xl border p-4 bg-white cursor-pointer hover:bg-brand-100 hover:border-2 hover:border-brand-500 transition"
                            >
                                <p className="font-semibold">{c.NAME}</p>
                                <p className="text-sm text-gray-500">{c.AFM}</p>
                                <p className="text-xs">
                                    {c.MAIN_ADDRESS} - {c.MAIN_CITY}
                                </p>
                            </div>
                        ))}

                        {hasSearched && !loading && customers.length === 0 && (
                            <p className="mt-6 text-center text-sm text-gray-400">
                                Δεν βρέθηκαν πελάτες
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
