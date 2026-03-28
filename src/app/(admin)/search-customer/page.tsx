"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useState } from "react";
import { searchCustomers } from "@/app/lib/api/customers";
import { Search } from "@/lib/lucide";

export default function SearchCustomer() {
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState<any[]>([]);

    const handleSearch = async () => {
        if (!search) return;

        setLoading(true);

        try {
            const data = await searchCustomers(search);

            if (data.success) {
                setCustomers(data.rows);
            } else {
                setCustomers([]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <PageBreadcrumb pageTitle="Αναζήτηση Πελάτη" />

            <div className="max-h-[calc(100dvh-14rem)] overflow-y-auto overscroll-contain rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] lg:max-h-[calc(100dvh-10.5rem)] xl:px-10 xl:py-12">
                <div className="mx-auto w-full max-w-[820px] text-center xl:max-w-[1120px] 2xl:max-w-[1360px]">

                    <h3 className="mb-4 text-theme-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl">
                        Βρείτε τον πελάτη στη λίστα των καταχωρημένων πελατών
                    </h3>

                    {/* Search */}
                    <div className="mt-6 flex items-center gap-2">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            className="w-full min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            placeholder="Όνομα, ΑΦΜ, email..."
                        />

                        <button
                            onClick={handleSearch}
                            aria-label="Αναζήτηση"
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white sm:h-auto sm:w-auto sm:gap-2 sm:px-5 sm:py-3"
                        >
                            {loading ? (
                                <span
                                    aria-hidden="true"
                                    className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                                />
                            ) : (
                                <>
                                    <Search className="h-5 w-5" />
                                    <span className="hidden sm:inline">Αναζήτηση</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Results */}
                    <div className="mt-6 text-left space-y-3">
                        {customers.map((c) => (
                            <div
                                key={c.TRDR}
                                className="p-4 border rounded-xl cursor-pointer hover:bg-gray-50"
                            >
                                <p className="font-semibold">{c.NAME}</p>
                                <p className="text-sm text-gray-500">{c.AFM}</p>
                                <p className="text-xs">
                                    {c.MAIN_ADDRESS} - {c.MAIN_CITY}
                                </p>
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </div>
    );
}
