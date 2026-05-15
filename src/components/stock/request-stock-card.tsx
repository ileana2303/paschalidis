import QuantityControl from "@/components/ui/quantity-control";
import RequestEndoCard from "@/components/endo/request-endo-card";
import type { RequestEndoCardProps } from "@/components/endo/request-endo-card";
import { GitCompareArrows, Loader2, Send } from "@/lib/icons/lucide";
import type { StockRequestStatus } from "@/lib/interface";

interface EndoRequestCardProps extends RequestEndoCardProps {
    isActive: boolean;
    canStart: boolean;
    onStart: () => void;
    onCancel: () => void;
}

interface StockRequestProps {
    mtrl: string;
    stock: number;
    quantity: number;
    onQuantityChange: (nextQuantity: number) => void;
    onSubmitRequest: () => void;
    requestStatus: StockRequestStatus | null;
    isSubmittingRequest: boolean;
    requestError: string;
    endoRequest: EndoRequestCardProps;
}

export default function StockRequest({
    stock,
    quantity,
    onQuantityChange,
    onSubmitRequest,
    requestStatus,
    isSubmittingRequest,
    requestError,
    endoRequest,
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
    const hasRequestableEndoStock = endoRequest.branches.some(
        (branch) => branch.stock > 0
    );

    if (endoRequest.isActive) {
        return (
            <RequestEndoCard
                branches={endoRequest.branches}
                getRequestedQty={endoRequest.getRequestedQty}
                onRequestedQtyChange={endoRequest.onRequestedQtyChange}
                onAddToBasket={endoRequest.onAddToBasket}
                isAdding={endoRequest.isAdding}
                inBasketQtyByBranch={endoRequest.inBasketQtyByBranch}
                pendingQtyByBranch={endoRequest.pendingQtyByBranch}
                error={endoRequest.error}
                successMessage={endoRequest.successMessage}
                onBack={endoRequest.onCancel}
            />
        );
    }

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
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-500 text-white shadow-xs transition hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-40"
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

            {endoRequest.canStart && (
                <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-800">
                    <button
                        type="button"
                        onClick={endoRequest.onStart}
                        disabled={!hasRequestableEndoStock}
                        title={
                            hasRequestableEndoStock
                                ? "Ενδοδιακίνηση"
                                : "Δεν υπάρχει διαθέσιμο απόθεμα σε άλλο κατάστημα"
                        }
                        className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 text-xs font-semibold text-brand-700 shadow-xs transition hover:border-brand-300 hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:opacity-70 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/15 dark:disabled:border-gray-800 dark:disabled:bg-gray-800/70 dark:disabled:text-gray-500"
                    >
                        <GitCompareArrows className="h-3.5 w-3.5" />
                        <span>Ενδοδιακίνηση</span>
                    </button>
                </div>
            )}
        </div>
    );
}
