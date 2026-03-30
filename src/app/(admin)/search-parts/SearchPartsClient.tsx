"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useState } from "react";
import { searchItems } from "@/app/lib/api/items";
import { Search, X } from "@/app/lib/lucide";
import { useCustomerStore } from "@/stores/customerStore";

type Item = {
    MTRL: string;
    ITEM_CODE: string;
    ITEM_DESCR: string;
    STATUS_LABEL: string;
    PRICE_MESSAGE: string;
};

export default function SearchPartsClient() {
    const [search, setSearch] = useState("");
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const customer = useCustomerStore((state) => state.customer);

    const handleSearch = async () => {
        if (!search) return;

        setHasSearched(true);
        setLoading(true);

        try {
            const data = await searchItems(search);

            if (data.success) {
                setItems(data.rows);
            } else {
                setItems([]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <PageBreadcrumb pageTitle="Αναζήτηση Ανταλλακτικών" />

            {customer && (
                <div className="mb-4 flex items-center gap-8 rounded-full border-2 border-brand-500 bg-brand-50 p-4 text-sm text-gray-700">
                    <span className="font-semibold text-gray-800">
                        {customer.NAME}
                    </span>

                    <span className="text-gray-500">
                        ΑΦΜ: {customer.AFM}
                    </span>

                    {customer.PHONE01 && (
                        <span className="text-gray-500">
                            📞 {customer.PHONE01}
                        </span>
                    )}
                </div>
            )}

            <div className="max-h-[calc(100dvh-14rem)] overflow-y-auto overscroll-contain rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] lg:max-h-[calc(100dvh-10.5rem)]">
                <div className="sticky top-0 z-10 bg-white px-5 py-7 dark:bg-[#0f172a] xl:px-10 xl:py-12">
                    <div className="mx-auto w-full max-w-[820px] text-center xl:max-w-[1120px] 2xl:max-w-[1360px]">
                        <h3 className="mb-4 text-theme-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl">
                            Βρείτε το ανταλλακτικό που ψάχνετε
                        </h3>

                        <div className="mt-6 flex items-center gap-2">
                            <div className="relative min-w-0 flex-1">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                    placeholder="Κωδικός ανταλλακτικού, όνομα, περιγραφή..."
                                    className={`w-full rounded-full border bg-white px-4 py-3 pr-11 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:bg-brand-50 dark:bg-gray-900 dark:text-white ${search.trim()
                                        ? "border-brand-500 ring-2 ring-brand-500"
                                        : "border-gray-300 dark:border-gray-700"
                                        }`}
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
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 font-medium text-white shadow-sm transition-all duration-200 hover:bg-brand-600 hover:shadow-md sm:h-auto sm:w-auto sm:gap-2 sm:px-5 sm:py-3"
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
                    <div className="mx-auto mt-8 w-full max-w-[820px] text-left xl:max-w-[1120px] 2xl:max-w-[1360px]">
                        {items.length > 0 && (
                            <p className="mb-3 text-sm text-gray-500">
                                Βρέθηκαν {items.length} αποτελέσματα
                            </p>
                        )}

                        <div className="space-y-3">
                            {items.map((item) => (
                                <div
                                    key={item.MTRL}
                                    className="rounded-xl border p-4 transition hover:bg-gray-50"
                                >
                                    <p className="font-semibold text-gray-800">
                                        {item.ITEM_CODE}
                                    </p>

                                    <p className="text-sm text-gray-500">
                                        {item.ITEM_DESCR}
                                    </p>

                                    <p className="mt-1 text-xs">
                                        {item.STATUS_LABEL}
                                    </p>

                                    <p className="text-xs text-gray-400">
                                        {item.PRICE_MESSAGE}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {hasSearched && !loading && items.length === 0 && (
                            <p className="mt-6 text-center text-sm text-gray-400">
                                Δεν βρέθηκαν ανταλλακτικά
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
