"use client";

import { useState } from "react";
import { ChevronDown, Plus, X } from "@/app/lib/lucide";
import type { ICustomerInfo } from "@/app/lib/interface";

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
            <div className="mb-4 shrink-0">
                <div
                    onClick={toggleExpanded}
                    className={`border-1 border-brand-500 bg-brand-50 p-4 text-sm text-gray-700 cursor-pointer ${isExpanded ? "rounded-2xl" : "rounded-full"}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-4 sm:gap-8">
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

                        <div
                            aria-hidden="true"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-500 bg-white text-brand-500 shadow-sm transition-all duration-200 hover:bg-brand-500 hover:text-white dark:border-brand-500 dark:bg-gray-900 dark:text-brand-400 dark:hover:bg-brand-500 dark:hover:text-white"
                        >
                            <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                        </div>

                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onClearCustomer();
                            }}
                            aria-label="Αφαίρεση επιλογής πελάτη"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-error-500 bg-white text-error-500 shadow-sm transition-all duration-200 hover:bg-error-500 hover:text-white dark:border-error-500 dark:bg-gray-900 dark:text-error-400 dark:hover:bg-error-500 dark:hover:text-white"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {isExpanded && (
                        <div className="mt-4 grid grid-flow-col auto-cols-[minmax(180px,1fr)] gap-3 overflow-x-auto rounded-xl border border-brand-200 bg-white/80 p-4 dark:border-brand-500/30 dark:bg-gray-900/70">
                            <div className="min-w-0">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                                    TRDR
                                </div>
                                <div className="mt-1 break-words text-sm font-medium text-gray-700 dark:text-gray-200">
                                    {customer.TRDR || "-"}
                                </div>
                            </div>

                            <div className="min-w-0">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                                    Κωδικός
                                </div>
                                <div className="mt-1 break-words text-sm font-medium text-gray-700 dark:text-gray-200">
                                    {customer.CODE || "-"}
                                </div>
                            </div>

                            <div className="min-w-0">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                                    Email
                                </div>
                                <div className="mt-1 break-words text-sm font-medium text-gray-700 dark:text-gray-200">
                                    {customer.EMAIL || "-"}
                                </div>
                            </div>

                            <div className="min-w-0">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                                    Υποκαταστήματα
                                </div>
                                <div className="mt-1 break-words text-sm font-medium text-gray-700 dark:text-gray-200">
                                    {customer.NUMBER_OF_BRANCHES || "-"}
                                </div>
                            </div>

                            <div className="min-w-0">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                                    Διεύθυνση / Τ.Κ.
                                </div>
                                <div className="mt-1 break-words text-sm font-medium text-gray-700 dark:text-gray-200">
                                    {customer.MAIN_ADDRESS && customer.MAIN_ZIP
                                        ? `${customer.MAIN_ADDRESS}, ${customer.MAIN_ZIP}`
                                        : customer.MAIN_ADDRESS || customer.MAIN_ZIP || "-"}
                                </div>
                            </div>

                            <div className="min-w-0">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                                    Πόλη
                                </div>
                                <div className="mt-1 break-words text-sm font-medium text-gray-700 dark:text-gray-200">
                                    {customer.MAIN_CITY || "-"}
                                </div>

                            </div>


                        </div>
                    )}
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
                Δεν έχει επιλεγεί πελάτης — Αναζήτηση ανταλλακτικών χωρίς πελάτη
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
