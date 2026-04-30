"use client";

import { useState } from "react";
import { ChevronDown, Plus, X } from "@/lib/icons/lucide";
import type { ICustomerInfo } from "@/lib/interface";

interface CustomerInfoContainerProps {
    hasMounted: boolean;
    customer: ICustomerInfo | null;
    onClearCustomer: () => void;
    onOpenCustomerModal: () => void;
}

export default function CustomerInfoContainer({
    hasMounted,
    customer,
    onClearCustomer,
    onOpenCustomerModal,
}: CustomerInfoContainerProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const toggleExpanded = () => setIsExpanded((prev) => !prev);

    if (!hasMounted) {
        return null;
    }

    if (customer) {
        return (
            <div className="mb-4">
                <div
                    onClick={toggleExpanded}
                    className={`group cursor-pointer transition-all duration-300 border border-brand-300/60 bg-linear-to-b from-brand-50/30 to-brand-50/40 shadow-sm hover:shadow-md
                        ${isExpanded ? "rounded-2xl" : "rounded-xl"}
                        `}
                >
                    <div className="flex items-center gap-4 px-5 py-4">
                        <div className="flex flex-1 flex-wrap items-center gap-x-6 gap-y-1 min-w-0">
                            <span className="font-semibold text-gray-900 tracking-tight">
                                {customer.NAME}
                            </span>

                            <span className="text-gray-500 text-sm">
                                ΑΦΜ: {customer.AFM}
                            </span>

                            {customer.PHONE01 && (
                                <span className="text-gray-500 text-sm flex items-center gap-1">
                                    <span className="opacity-70">📞</span>
                                    {customer.PHONE01}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-400 bg-white text-brand-500 shadow-sm transition-all group-hover:bg-brand-500 group-hover:text-white">
                                <ChevronDown
                                    className={`h-5 w-5 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""
                                        }`}
                                />
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClearCustomer();
                                }}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-red-400 bg-white text-red-500 shadow-sm transition-all hover:bg-red-500 hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div
                        className={`grid transition-all duration-300 ease-in-out
                            ${isExpanded ? "opacity-100 max-h-[500px] p-5 pt-0" : "opacity-0 max-h-0 overflow-hidden"}
                            `}
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                            <InfoItem label="TRDR" value={customer.TRDR} />
                            <InfoItem label="Κωδικός" value={customer.CODE} />
                            <InfoItem label="Email" value={customer.EMAIL} />
                            <InfoItem label="Υποκαταστήματα" value={customer.NUMBER_OF_BRANCHES} />

                            <InfoItem
                                label="Διεύθυνση"
                                value={
                                    customer.MAIN_ADDRESS && customer.MAIN_ZIP
                                        ? `${customer.MAIN_ADDRESS}, ${customer.MAIN_ZIP}`
                                        : customer.MAIN_ADDRESS || customer.MAIN_ZIP
                                }
                            />

                            <InfoItem label="Πόλη" value={customer.MAIN_CITY} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    function InfoItem({ label, value }: { label: string; value?: string | number }) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {label}
                </div>
                <div className="mt-1 text-sm font-medium text-gray-800">
                    {value || "-"}
                </div>
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={onOpenCustomerModal}
            className="mb-4 w-full shrink-0 flex items-center gap-3 rounded-full border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-left text-sm text-gray-500 transition-colors hover:border-brand-400 hover:bg-brand-50/50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-brand-500/60 dark:hover:bg-gray-900"
        >
            <span className="flex-1">
                Δεν έχει επιλεγεί πελάτης — Αναζήτηση πελάτη (προετικό)
            </span>

            <span
                aria-hidden="true"
                className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-500 bg-white text-brand-500 shadow-sm transition-all duration-200 dark:border-brand-500 dark:bg-gray-900 dark:text-brand-400"
            >
                <Plus className="h-5 w-5" />
            </span>
        </button>
    );
}
