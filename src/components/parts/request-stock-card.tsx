import QuantityControl from "@/components/ui/quantity-control";
import { Loader2, Send } from "@/lib/icons/lucide";
import type { StockRequestProps } from "@/lib/interface";

export default function StockRequest({
    stock,
    quantity,
    onQuantityChange,
    onSubmitRequest,
    requestStatus,
    isSubmittingRequest,
    requestError,
}: StockRequestProps) {
    const statusClassName =
        requestStatus === "approved"
            ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
            : requestStatus === "deleted"
                ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";

    const statusLabel =
        requestStatus === "approved"
            ? "Approved"
            : requestStatus === "deleted"
                ? "Deleted"
                : "Pending";

    return (
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
            {requestStatus && (
                <div className="mb-3 flex justify-end">
                    <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClassName}`}
                    >
                        {statusLabel}
                    </span>
                </div>
            )}

            <div className="rounded-lg border border-gray-200 bg-white/80 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900/40">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Απόθεμα Καταστήματος
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums leading-none text-gray-800 dark:text-white/90">
                    {stock}
                </p>
            </div>

            <div className="mt-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Αίτημα Ανατροφοδοσίας
                </p>

                <div className="flex items-center gap-2">
                    <QuantityControl
                        value={quantity}
                        onChange={onQuantityChange}
                        min={0}
                        displayZeroAsEmpty
                        fullWidth
                        size="sm"
                        placeholder="0"
                    />

                    <button
                        type="button"
                        onClick={onSubmitRequest}
                        disabled={isSubmittingRequest || quantity <= 0}
                        title="Καταχώρηση αιτήματος"
                        aria-label="Καταχώρηση αιτήματος"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-600 shadow-xs transition hover:border-brand-300 hover:bg-brand-100 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/15"
                    >
                        {isSubmittingRequest ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Send className="h-3.5 w-3.5" />
                        )}
                    </button>
                </div>
            </div>

            {requestError && (
                <p className="mt-2 text-[10px] font-medium text-red-500">
                    {requestError}
                </p>
            )}
        </div>
    );
}