import QuantitySelect from "@/components/ui/quantity-select";
import RequestEndoCard from "@/components/endo/request-endo-card";
import type { RequestEndoCardProps } from "@/components/endo/request-endo-card";
import {
    Loader2,
    Send,
} from "@/lib/icons/lucide";
import { getBranchColor } from "@/lib/branch-colors";
import type { StockRequestStatus } from "@/lib/interface";

type EndoRequestCardProps = RequestEndoCardProps;

interface StockRequestProps {
    mtrl: string;
    branchCode: string;
    branchLabel: string;
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
    branchCode,
    branchLabel,
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
            ? "Εγκρίθηκε"
            : requestStatus === "deleted"
                ? "Διαγράφηκε"
                : "Εκκρεμεί";

    const hasRequestableEndoStock = endoRequest.branches.some(
        (branch) => branch.stock > 0
    );

    return (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-stretch gap-2">
            <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-amber-200 border-t-4 border-t-amber-500 bg-white shadow-sm dark:border-amber-500/30 dark:border-t-amber-400 dark:bg-white/[0.03]">
                <div className="border-b border-amber-100 bg-amber-50/80 px-2 py-2 text-center dark:border-amber-500/20 dark:bg-amber-500/10">
                    <h3 className="text-[9px] font-bold uppercase tracking-[0.04em] text-amber-900 dark:text-amber-200">
                        Ανατροφοδοσία
                    </h3>
                </div>

                <div className="flex flex-1 flex-col p-2">
                    <div className="rounded-md border border-amber-100 bg-amber-50/60 p-1 dark:border-amber-500/20 dark:bg-amber-500/[0.08]">
                        <div className="flex min-w-0 items-baseline gap-1.5">
                            <span
                                className={`min-w-0 truncate rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${getBranchColor(branchCode)}`}
                                title={branchLabel}
                            >
                                {branchLabel}
                            </span>
                            <span className="shrink-0 text-sm font-bold tabular-nums text-gray-800 dark:text-white/90">
                                {stock}
                            </span>
                        </div>

                        {requestStatus && (
                            <span
                                className={`mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${statusClassName}`}
                            >
                                {statusLabel}
                            </span>
                        )}

                        <div className="mt-1.5 flex min-w-0 items-center gap-1">
                            <QuantitySelect
                                value={quantity}
                                onChange={onQuantityChange}
                                className="flex-1"
                                placeholder="Ποσ."
                                ariaLabel="Ποσότητα αιτήματος ανατροφοδοσίας"
                            />

                            <button
                                type="button"
                                onClick={onSubmitRequest}
                                disabled={isSubmittingRequest || quantity <= 0}
                                title="Καταχώρηση αιτήματος ανατροφοδοσίας"
                                aria-label="Καταχώρηση αιτήματος ανατροφοδοσίας"
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-500 text-white shadow-xs transition hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-300 disabled:opacity-100 dark:disabled:bg-gray-800 dark:disabled:text-gray-600"
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
                        <p className="mt-1.5 break-words text-[8px] font-medium leading-3 text-red-500">
                            {requestError}
                        </p>
                    )}
                </div>
            </section>

            <section
                className={`flex min-w-0 flex-col overflow-hidden rounded-xl border border-t-4 shadow-sm ${hasRequestableEndoStock
                    ? "border-violet-200 border-t-violet-500 bg-white dark:border-violet-500/30 dark:border-t-violet-400 dark:bg-white/[0.03]"
                    : "border-gray-100 border-t-gray-200 bg-white dark:border-gray-800 dark:border-t-gray-700 dark:bg-white/[0.01]"
                    }`}
            >
                <div
                    className={`border-b px-2 py-2 text-center ${hasRequestableEndoStock
                        ? "border-violet-100 bg-violet-50/80 dark:border-violet-500/20 dark:bg-violet-500/10"
                        : "border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-white/[0.02]"
                        }`}
                >
                    <h3
                        className={`text-[9px] font-bold uppercase tracking-[0.04em] ${hasRequestableEndoStock
                            ? "text-violet-900 dark:text-violet-200"
                            : "text-gray-400 dark:text-gray-500"
                            }`}
                    >
                        Ενδοδιακίνηση
                    </h3>
                </div>

                <div className="flex flex-1 flex-col p-2">
                    {hasRequestableEndoStock ? (
                        <RequestEndoCard
                            branches={endoRequest.branches}
                            getRequestedQty={endoRequest.getRequestedQty}
                            onRequestedQtyChange={endoRequest.onRequestedQtyChange}
                            onAddToBasket={endoRequest.onAddToBasket}
                            isAdding={endoRequest.isAdding}
                            inBasketQtyByBranch={endoRequest.inBasketQtyByBranch}
                            pendingQtyByBranch={endoRequest.pendingQtyByBranch}
                            className="grid gap-1.5 min-[1800px]:grid-cols-2"
                            branchCardClassName="rounded-md border border-violet-100 bg-violet-50/60 p-1 dark:border-violet-500/20 dark:bg-violet-500/[0.08]"
                            compact
                        />
                    ) : (
                        <p className="flex flex-1 items-center rounded-md border border-dashed border-gray-200 bg-gray-50/60 px-2 py-2 text-[9px] font-medium leading-3 text-gray-400 dark:border-gray-700 dark:bg-white/[0.02] dark:text-gray-500">
                            Δεν υπάρχει διαθέσιμο απόθεμα σε άλλο κατάστημα για ενδοδιακίνηση.
                        </p>
                    )}
                </div>
            </section>
        </div>
    );
}
