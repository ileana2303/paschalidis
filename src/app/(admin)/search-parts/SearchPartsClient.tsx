"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useState } from "react";
import { searchItems } from "@/app/lib/api/items";

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

    const handleSearch = async () => {
        if (!search) return;

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

            <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
                <div className="mx-auto w-full max-w-[630px] text-center">
                    <h3 className="mb-4 text-theme-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl">
                        Βρείτε το ανταλλακτικό που ψάχνετε
                    </h3>

                    <div className="mt-6 flex items-center gap-2">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            placeholder="Κωδικός ανταλλακτικού, όνομα, περιγραφή..."
                            className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />

                        <button
                            onClick={handleSearch}
                            className="rounded-xl bg-brand-500 px-5 py-3 font-medium text-white shadow-sm transition-all duration-200 hover:bg-brand-600 hover:shadow-md"
                        >
                            {loading ? "..." : "Αναζήτηση"}
                        </button>
                    </div>

                    <div className="mt-8 text-left">
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

                        {!loading && items.length === 0 && (
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
