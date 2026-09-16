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
                    ? "flex w-[300px] max-w-full flex-nowrap items-center justify-between gap-2 rounded-lg border px-2 py-2"
                    : "flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border px-2 py-2 lg:w-auto",
                boxClassName,
            ].join(" ");
    const inputWidthClassName = "w-24";

    return (
        <div className={[
            rootClassName,
            className,
        ].join(" ")}>
            <div className="flex min-w-0 flex-wrap items-center justify-start gap-2">
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${textClassName}`}>
                    <BadgePercent className="h-3.5 w-3.5" />
                    {(displayRequestedPrice || showRequestLabel) && (
                        <span>
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

            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            void onSubmit();
                        }
                    }}
                    placeholder="Νέα τιμή..."
                    className={`h-8 ${inputWidthClassName} rounded-md border bg-white px-2 text-sm text-gray-800 outline-none focus:ring-1 dark:bg-gray-900 dark:text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${inputClassName}`}
                />

                <button
                    type="button"
                    onClick={() => void onSubmit()}
                    disabled={submitDisabled}
                    aria-label="Υποβολή αιτήματος τιμής"
                    className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${buttonClassName}`}
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
