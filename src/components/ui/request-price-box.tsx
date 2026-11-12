"use client";

import { useState } from "react";
import { BadgePercent, Check, Loader2, Pencil, X } from "@/lib/icons/lucide";

export type RequestPriceStatus = "approved" | "rejected" | "pending" | null;

interface RequestPriceBoxProps {
    status: RequestPriceStatus;
    hasPriceRequest: boolean;
    requestedPrice: number | null;
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void | Promise<void>;
    submitting?: boolean;
    prominent?: boolean;
    className?: string;
}

const parsePriceInput = (value: string) => {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
};

const formatRequestedPrice = (price: number) =>
    `${price.toLocaleString("el-GR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })} €`;

export default function RequestPriceBox({
    status,
    hasPriceRequest,
    requestedPrice,
    value,
    onChange,
    onSubmit,
    submitting = false,
    prominent = false,
    className = "",
}: RequestPriceBoxProps) {
    const [isEditing, setIsEditing] = useState(false);
    const parsedValue = parsePriceInput(value);
    const submitDisabled =
        submitting || parsedValue == null || parsedValue <= 0;
    const isApproved = hasPriceRequest && status === "approved";
    const isPending = hasPriceRequest && status !== "approved" && status !== "rejected";
    const hasDisplayRequestedPrice =
        isPending && requestedPrice != null && requestedPrice > 0;

    if (isApproved) {
        return null;
    }

    const handleSubmit = async () => {
        if (submitDisabled) {
            return;
        }

        await onSubmit();
        setIsEditing(false);
    };

    const handleStartEditing = () => {
        if (hasDisplayRequestedPrice) {
            onChange(requestedPrice.toFixed(2).replace(".", ","));
        }

        setIsEditing(true);
    };

    if (!isEditing) {
        return (
            <button
                type="button"
                onClick={handleStartEditing}
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition focus-visible:outline-none focus-visible:ring-2 ${prominent
                    ? "border border-amber-200 bg-amber-50/90 text-amber-700 hover:bg-amber-100 focus-visible:ring-amber-500/30 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/15"
                    : "text-xs font-medium text-gray-400 hover:bg-gray-100 hover:text-brand-600 focus-visible:ring-brand-500/30 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-brand-400"
                    } ${className}`}
            >
                {hasPriceRequest ? (
                    <Pencil className="h-3.5 w-3.5" />
                ) : (
                    <BadgePercent className="h-3.5 w-3.5" />
                )}
                <span className={prominent ? "text-[10px] font-semibold uppercase tracking-wide" : ""}>
                    {hasPriceRequest
                        ? isPending
                            ? "Αιτούμενη τιμή"
                            : "Νέο αίτημα"
                        : "Αίτημα τιμής"}
                </span>
                {hasDisplayRequestedPrice && (
                    <span className={prominent
                        ? "text-base font-bold tabular-nums text-amber-700 dark:text-amber-300"
                        : "font-semibold tabular-nums text-gray-700 dark:text-gray-300"}
                    >
                        {formatRequestedPrice(requestedPrice)}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div className={`flex min-w-0 items-center gap-1 ${prominent
            ? "rounded-lg border border-amber-200 bg-amber-50/90 p-1 dark:border-amber-500/20 dark:bg-amber-500/10"
            : ""
            } ${className}`}>
            <input
                type="text"
                inputMode="decimal"
                autoFocus
                value={value}
                onChange={(event) => {
                    const nextValue = event.target.value;

                    if (nextValue === "" || /^\d*(?:[.,]\d{0,2})?$/.test(nextValue)) {
                        onChange(nextValue);
                    }
                }}
                onKeyDown={(event) => {
                    if (event.key === "Enter" && !submitDisabled) {
                        event.preventDefault();
                        void handleSubmit();
                    }

                    if (event.key === "Escape") {
                        setIsEditing(false);
                    }
                }}
                disabled={submitting}
                placeholder="Τιμή..."
                aria-label="Ζητούμενη τιμή"
                className={`h-7 w-20 rounded-md border bg-white px-1.5 text-xs tabular-nums text-gray-800 outline-none transition placeholder:text-gray-400 focus:ring-2 disabled:opacity-50 dark:bg-gray-900 dark:text-white ${prominent
                    ? "border-amber-200 focus:border-amber-400 focus:ring-amber-500/10 dark:border-amber-500/30"
                    : "border-gray-200 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700"
                    }`}
            />

            <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitDisabled}
                aria-label="Υποβολή τιμής"
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-40 ${prominent
                    ? "bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-500/30"
                    : "bg-brand-500 hover:bg-brand-600 focus-visible:ring-brand-500/30"
                    }`}
            >
                {submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                )}
            </button>

            <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={submitting}
                aria-label="Ακύρωση"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 disabled:opacity-40 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}
