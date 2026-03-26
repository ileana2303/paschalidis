"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useState } from "react";
import { searchCustomers } from "@/app/lib/api/customers";

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

            <div className="min-h-screen rounded-2xl border bg-white px-5 py-7">
                <div className="mx-auto max-w-[630px] text-center">

                    <h3 className="mb-4 font-semibold text-theme-xl">
                        Αναζήτηση Πελάτη
                    </h3>

                    {/* Search */}
                    <div className="mt-6 flex gap-2">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            className="flex-1 px-4 py-3 border rounded-xl"
                            placeholder="Όνομα, ΑΦΜ, email..."
                        />

                        <button
                            onClick={handleSearch}
                            className="px-5 py-3 bg-brand-500 text-white rounded-xl"
                        >
                            {loading ? "..." : "Αναζήτηση"}
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
