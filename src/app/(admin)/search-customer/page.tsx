"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useState } from "react";
import { searchCustomers } from "@/app/lib/api/customers";
import { Search, X } from "@/app/lib/lucide";
import { ICustomerInfo } from "@/app/lib/interface";
import { useCustomerStore } from "@/stores/customerStore";
import { useRouter } from "next/navigation";

export default function SearchCustomer() {
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState<ICustomerInfo[]>([]);

    const setCustomer = useCustomerStore((state) => state.setCustomer);
    const router = useRouter();

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

            <div className="max-h-[calc(100dvh-14rem)] overflow-y-auto overscroll-contain rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] lg:max-h-[calc(100dvh-10.5rem)]">
                <div className="sticky top-0 z-10 bg-white px-5 py-7 dark:bg-[#0f172a] xl:px-10 xl:py-12">
                    <div className="mx-auto w-full max-w-[820px] text-center xl:max-w-[1120px] 2xl:max-w-[1360px]">
                        <h3 className="mb-4 text-theme-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl">
                            Βρείτε τον πελάτη στη λίστα των καταχωρημένων πελατών
                        </h3>

                        <div className="mt-6 flex items-center gap-2">
                            <div className="relative min-w-0 flex-1">
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                    className={`w-full rounded-xl border bg-white px-4 py-3 pr-11 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-900 dark:text-white ${search.trim()
                                        ? "border-brand-500 ring-2 ring-brand-500"
                                        : "border-gray-300 dark:border-gray-700"
                                        }`}
                                    placeholder="Όνομα, ΑΦΜ, email..."
                                />

                                {search.trim() && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch("")}
                                        aria-label="Καθαρισμός αναζήτησης"
                                        className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

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
                    </div>
                </div>

                <div className="px-5 pb-7 xl:px-10 xl:pb-12">
                    <div className="mx-auto mt-6 w-full max-w-[820px] space-y-3 text-left xl:max-w-[1120px] 2xl:max-w-[1360px]">
                        {customers.map((c: ICustomerInfo) => (
                            <div
                                key={c.TRDR}
                                onClick={() => {
                                    setCustomer(c);

                                    router.push("/search-parts");
                                }}
                                className="rounded-xl border p-4 cursor-pointer hover:bg-brand-100 transition"
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
