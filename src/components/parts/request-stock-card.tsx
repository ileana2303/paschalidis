import QuantityControl from "@/components/ui/quantity-control";
import { Loader2, Send } from "@/lib/icons/lucide";
import type { StockRequestProps } from "@/lib/interface";

export default function StockRequest({
    mtrl,
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
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        MTRL
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-gray-700 dark:text-white/90">
                        {mtrl}
                    </p>
                </div>

                {requestStatus && (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClassName}`}>
                        {statusLabel}
                    </span>
                )}
            </div>

            <div className="mt-3 rounded-lg border border-gray-200 bg-white/80 p-2 dark:border-gray-700 dark:bg-gray-900/40">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Απόθεμα Καταστήματος
                </p>
                <p className="mt-0.5 text-xl font-bold leading-none text-gray-800 dark:text-white/90">
                    {stock}
                </p>
            </div>

            <div className="mt-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Ποσότητα Ανατροφοδοσίας
                </p>
                <QuantityControl
                    value={quantity}
                    onChange={onQuantityChange}
                    min={0}
                    displayZeroAsEmpty
                    fullWidth
                    placeholder="0"
                    decrementLabel="Μείωση ποσότητας αποθέματος"
                    incrementLabel="Αύξηση ποσότητας αποθέματος"
                />
            </div>

            <button
                type="button"
                onClick={onSubmitRequest}
                disabled={isSubmittingRequest || quantity <= 0}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
            >
                {isSubmittingRequest ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                    <Send className="h-3.5 w-3.5" />
                )}
                <span>Καταχώρηση Αιτήματος</span>
            </button>

            {requestError && (
                <p className="mt-2 text-center text-[10px] font-medium text-red-500">
                    {requestError}
                </p>
            )}
        </div>
    );
}
