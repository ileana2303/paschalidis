"use client";

import { BadgePercent, Loader2, Send } from "@/lib/icons/lucide";

export type RequestPriceStatus = "approved" | "rejected" | "pending" | null;

interface RequestPriceBoxProps {
    status: RequestPriceStatus;
    hasPriceRequest: boolean;
    hasRequestedPrice?: boolean;
    showRequestedPrice?: boolean;
    showRequestLabel?: boolean;
    requestedPrice: number | null;
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void | Promise<void>;
    submitting?: boolean;
    formatPrice: (price: number | null) => string;
    chrome?: "default" | "plain";
    stableWidth?: boolean;
    className?: string;
}

const parsePriceInput = (value: string) => {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
};

export default function RequestPriceBox({
    status,
    hasPriceRequest,
    hasRequestedPrice,
    showRequestedPrice = true,
    showRequestLabel = true,
    requestedPrice,
    value,
    onChange,
    onSubmit,
    submitting = false,
    formatPrice,
    chrome = "default",
    stableWidth = false,
    className = "",
}: RequestPriceBoxProps) {
    const shouldShowRequestedPrice =
        hasRequestedPrice ?? (hasPriceRequest && requestedPrice != null && requestedPrice > 0);
    const displayRequestedPrice = showRequestedPrice && shouldShowRequestedPrice;
    const requestTone = shouldShowRequestedPrice
        ? status === "approved"
            ? "approved"
            : status === "rejected"
                ? "rejected"
                : "pending"
        : "empty";
    const parsedValue = parsePriceInput(value);
    const submitDisabled = submitting || parsedValue == null || parsedValue <= 0;
    const boxClassName = requestTone === "approved"
        ? "border-green-200 bg-green-50 dark:border-green-500/20 dark:bg-green-500/10"
        : requestTone === "rejected"
            ? "border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10"
            : requestTone === "pending"
            ? "border-amber-200 bg-amber-50/90 dark:border-amber-500/20 dark:bg-amber-500/10"
            : "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]";
    const textClassName = requestTone === "approved"
        ? "text-green-700 dark:text-green-400"
        : requestTone === "rejected"
            ? "text-red-700 dark:text-red-400"
            : "text-amber-700 dark:text-amber-300";
    const inputClassName = requestTone === "approved"
        ? "border-green-200 focus:border-green-500 focus:ring-green-500 dark:border-green-500/30"
        : requestTone === "rejected"
            ? "border-red-200 focus:border-red-500 focus:ring-red-500 dark:border-red-500/30"
            : "border-amber-200 focus:border-amber-500 focus:ring-amber-500 dark:border-amber-500/30";
    const buttonClassName = requestTone === "approved"
        ? "bg-green-600 hover:bg-green-700"
        : requestTone === "rejected"
            ? "bg-red-500 hover:bg-red-600"
            : "bg-amber-500 hover:bg-amber-600";
    const rootClassName =
        chrome === "plain"
            ? "flex w-full flex-wrap items-center justify-between gap-2"
            : [
                stableWidth
                    ? "flex h-9 w-[300px] max-w-full flex-nowrap items-center gap-1.5 rounded-lg border py-1 pl-2 pr-1"
                    : "flex min-h-9 w-full flex-wrap items-center justify-between gap-1.5 rounded-lg border p-1.5 lg:w-auto",
                boxClassName,
            ].join(" ");
    const inputWidthClassName = stableWidth ? "w-[4.75rem]" : "w-24";

    return (
        <div className={[
            rootClassName,
            className,
        ].join(" ")}>
            <div className="flex min-w-0 items-center justify-start gap-1.5 whitespace-nowrap">
                <div className={`flex min-w-0 items-center gap-1.5 text-xs font-semibold ${textClassName}`}>
                    <BadgePercent className="h-3.5 w-3.5 shrink-0" />
                    {(displayRequestedPrice || showRequestLabel) && (
                        <span className="truncate">
                            {displayRequestedPrice ? "Ζητ. τιμή" : "Αίτημα τιμής"}
                        </span>
                    )}
                </div>

                {displayRequestedPrice && requestedPrice != null && requestedPrice > 0 && (
                    <span className={`text-xs font-medium ${textClassName}`}>
                        {formatPrice(requestedPrice)}
                    </span>
                )}
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-1">
                <div className="relative">
                    <input
                        type="text"
                        inputMode="decimal"
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
                                void onSubmit();
                            }
                        }}
                        disabled={submitting}
                        aria-label="Νέα ζητούμενη τιμή"
                        placeholder="Τιμή"
                        className={`h-7 ${inputWidthClassName} rounded-md border bg-white py-1 pl-2 pr-5 text-right text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:ring-1 disabled:cursor-wait disabled:opacity-60 dark:bg-gray-900 dark:text-white ${inputClassName}`}
                    />
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs font-medium text-gray-400"
                    >
                        €
                    </span>
                </div>

                <button
                    type="button"
                    onClick={() => void onSubmit()}
                    disabled={submitDisabled}
                    aria-label="Υποβολή αιτήματος τιμής"
                    title={submitDisabled && !submitting ? "Συμπληρώστε έγκυρη τιμή" : "Αποστολή αιτήματος"}
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40 ${buttonClassName}`}
                >
                    {submitting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Send className="h-3.5 w-3.5" />
                    )}
                </button>
            </div>
        </div>
    );
}
