"use client";

import { useState } from "react";
import { ChevronDown, Plus, X } from "@/lib/icons/lucide";
import type { ICustomerInfo } from "@/lib/interface";
import CustomerGroupBadge from "@/components/customer/customer-group-badge";


// Shown first (with Greek labels) in the expanded details, so skip them in the raw dump.
const PINNED_INFO_KEYS = new Set(["AFM", "CODE"]);

interface CustomerInfoContainerProps {
    hasMounted: boolean;
    customer: ICustomerInfo | null;
    onClearCustomer?: () => void;
    onOpenCustomerModal?: () => void;
    className?: string;
}

export default function CustomerInfoContainer({
    hasMounted,
    customer,
    onClearCustomer,
    onOpenCustomerModal,
    className = "",
}: CustomerInfoContainerProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const toggleExpanded = () => setIsExpanded((prev) => !prev);

    if (!hasMounted) {
        return null;
    }

    if (customer) {
        return (
            <div className={className}>
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
                                <span className="block truncate text-sm font-semibold tracking-tight text-gray-900 dark:text-white/90 sm:text-base">
                                    {customer.NAME}
                                </span>

                                <span className="mt-1 flex min-w-0">
                                    <CustomerGroupBadge customer={customer} />
                                </span>
                            </span>

                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-300 bg-white text-brand-500 shadow-sm transition-colors group-hover:border-brand-500 group-hover:bg-brand-500 group-hover:text-white dark:border-brand-500/40 dark:bg-gray-900 dark:text-brand-400 dark:group-hover:bg-brand-500">
                                <ChevronDown
                                    className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""
                                        }`}
                                />
                            </span>
                        </button>

                        {onClearCustomer && (
                            <button
                                type="button"
                                onClick={onClearCustomer}
                                aria-label="Αφαίρεση επιλεγμένου πελάτη"
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-300 bg-white text-red-500 shadow-sm transition-colors hover:border-red-500 hover:bg-red-500 hover:text-white dark:border-red-500/40 dark:bg-gray-900"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <div
                        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out
                            ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}
                            `}
                    >
                        <div className="overflow-hidden">
                            <div className="grid grid-cols-1 gap-x-4 gap-y-3 border-t border-brand-100 px-4 py-3 sm:grid-cols-2 dark:border-brand-500/20">
                                <InfoItem label="ΑΦΜ" value={customer.AFM} />
                                <InfoItem label="Κωδικός" value={customer.CODE} />
                                {Object.entries(customer)
                                    .filter(([key]) => !PINNED_INFO_KEYS.has(key))
                                    .map(([key, value]) => (
                                        <InfoItem key={key} label={key} value={value} />
                                    ))}
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
        value?: unknown;
    }) {
        const displayValue = value === "" || value == null
            ? "-"
            : typeof value === "object"
                ? JSON.stringify(value)
                : String(value);

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
            disabled={!onOpenCustomerModal}
            className={`flex w-full shrink-0 items-center gap-3 rounded-full border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-left text-sm text-gray-500 transition-colors hover:border-brand-400 hover:bg-brand-50/50 disabled:cursor-default dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-brand-500/60 dark:hover:bg-gray-900 ${className}`}
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
