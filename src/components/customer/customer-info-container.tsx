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
                    className={`overflow-hidden border border-brand-100 bg-brand-50/70 shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-brand-500/20 dark:bg-brand-500/5
                        ${isExpanded ? "rounded-2xl" : "rounded-xl"}
                        `}
                >
                    <div className="flex items-center gap-2 px-4 py-3">
                        <button
                            type="button"
                            onClick={toggleExpanded}
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? "Απόκρυψη στοιχείων πελάτη" : "Προβολή στοιχείων πελάτη"}
                            className="group flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                            <span className="min-w-0 flex-1">
                                <span className="flex min-w-0 items-center gap-2">
                                    <span className="truncate text-sm font-semibold tracking-tight text-gray-900 dark:text-white/90 sm:text-base">
                                        {customer.NAME}
                                    </span>
                                    {customer.TRDR && (
                                        <span className="hidden max-w-40 shrink-0 truncate rounded-md bg-brand-100/80 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 xsm:inline-block">
                                            {customer.TRDR}
                                        </span>
                                    )}
                                </span>

                                <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                                    <span>
                                        ΑΦΜ <span className="font-medium tabular-nums text-gray-700 dark:text-gray-300">{customer.AFM}</span>
                                    </span>
                                    {customer.PHONE01 && (
                                        <span>
                                            Τηλ. <span className="font-medium tabular-nums text-gray-700 dark:text-gray-300">{customer.PHONE01}</span>
                                        </span>
                                    )}
                                </span>
                            </span>

                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-300 bg-white text-brand-500 shadow-sm transition-colors group-hover:border-brand-500 group-hover:bg-brand-500 group-hover:text-white dark:border-brand-500/40 dark:bg-gray-900 dark:text-brand-400 dark:group-hover:bg-brand-500">
                                <ChevronDown
                                    className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""
                                        }`}
                                />
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={onClearCustomer}
                            aria-label="Αφαίρεση επιλεγμένου πελάτη"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-300 bg-white text-red-500 shadow-sm transition-colors hover:border-red-500 hover:bg-red-500 hover:text-white dark:border-red-500/40 dark:bg-gray-900"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div
                        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out
                            ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}
                            `}
                    >
                        <div className="overflow-hidden">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-brand-100 px-4 py-3 lg:grid-cols-4 dark:border-brand-500/20">
                                <div className="min-w-0 space-y-3">
                                    <InfoItem label="TRDR" value={customer.TRDR} />
                                    <InfoItem label="Κωδικός" value={customer.CODE} />
                                </div>

                                <div className="min-w-0 space-y-3">
                                    <InfoItem label="Τιμοκατάλογος" value={customer.PRICE_TIER} />
                                    <InfoItem label="Υποκαταστήματα" value={customer.NUMBER_OF_BRANCHES} />
                                </div>

                                <div className="min-w-0 space-y-3">
                                    <InfoItem label="Email" value={customer.EMAIL} />
                                    <InfoItem label="Τηλέφωνο" value={customer.PHONE01} />
                                </div>

                                <div className="min-w-0 space-y-3">
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
                </div>
            </div>
        );
    }

    function InfoItem({
        label,
        value,
    }: {
        label: string;
        value?: string | number;
    }) {
        const displayValue = value === "" || value == null ? "-" : String(value);

        return (
            <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    {label}
                </div>
                <div
                    title={displayValue === "-" ? undefined : displayValue}
                    className="mt-0.5 truncate text-sm font-medium text-gray-800 dark:text-gray-200"
                >
                    {displayValue}
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
                Δεν έχει επιλεγεί πελάτης — Αναζήτηση πελάτη (προαιρετικό)
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
