import QuantityControl from "@/components/ui/quantity-control";
import RequestEndoCard from "@/components/endo/request-endo-card";
import type { RequestEndoCardProps } from "@/components/endo/request-endo-card";
import { getBranchDotColor } from "@/lib/branch-colors";
import {
    ChevronDown,
    GitCompareArrows,
    Loader2,
    Send,
    Warehouse,
} from "@/lib/icons/lucide";
import type { StockRequestStatus } from "@/lib/interface";

interface EndoRequestCardProps extends RequestEndoCardProps {
    isOpen: boolean;
    canStart: boolean;
    onToggle: () => void;
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

    // Only branches that can actually cover the request are offered as a source.
    const availableEndoBranches = endoRequest.branches.filter(
        (branch) => branch.stock > 0
    );
    const hasRequestableEndoStock = availableEndoBranches.length > 0;
    const isEndoOpen = endoRequest.isOpen && hasRequestableEndoStock;

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-xs dark:border-gray-800 dark:bg-white/[0.02]">
            <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Πηγή εφοδιασμού
                </p>

                {requestStatus && (
                    <span
                        className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClassName}`}
                    >
                        {statusLabel}
                    </span>
                )}
            </div>

            <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50/70 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Στο κατάστημά μου
                </p>
                <p
                    className={`mt-0.5 text-2xl font-bold tabular-nums leading-none ${stock > 0
                        ? "text-gray-800 dark:text-white/90"
                        : "text-amber-600 dark:text-amber-400"
                        }`}
                >
                    {stock}
                </p>
            </div>

            <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50/70 p-2.5 dark:border-gray-700 dark:bg-gray-900/40">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                        <Warehouse className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        <span className="truncate">Ανατροφοδοσία</span>
                    </span>
                    <span className="shrink-0 text-[10px] text-gray-400">
                        κεντρική αποθήκη
                    </span>
                </div>

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
                        title="Καταχώρηση αιτήματος ανατροφοδοσίας"
                        aria-label="Καταχώρηση αιτήματος ανατροφοδοσίας"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-500 text-white shadow-xs transition hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {isSubmittingRequest ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Send className="h-3.5 w-3.5" />
                        )}
                    </button>
                </div>

                {requestError && (
                    <p className="mt-1.5 text-[10px] font-medium text-red-500">
                        {requestError}
                    </p>
                )}
            </div>

            {hasRequestableEndoStock && endoRequest.canStart ? (
                <button
                    type="button"
                    onClick={endoRequest.onToggle}
                    aria-expanded={isEndoOpen}
                    title={
                        isEndoOpen
                            ? "Απόκρυψη καταστημάτων"
                            : "Προβολή διαθέσιμων καταστημάτων"
                    }
                    className={`mt-2 inline-flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px] font-semibold text-brand-700 shadow-xs transition hover:border-brand-300 hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:text-brand-300 dark:hover:bg-brand-500/15 ${isEndoOpen
                        ? "border-brand-200 bg-brand-50 dark:border-brand-500/30 dark:bg-brand-500/10"
                        : "border-dashed border-brand-200 bg-brand-50/60 dark:border-brand-500/30 dark:bg-brand-500/[0.07]"
                        }`}
                >
                    <GitCompareArrows className="h-3.5 w-3.5 shrink-0" />

                    <span className="min-w-0 truncate text-left">
                        Διαθέσιμο σε {availableEndoBranches.length}{" "}
                        {availableEndoBranches.length === 1
                            ? "κατάστημα"
                            : "καταστήματα"}
                    </span>

                    <span className="ml-auto flex shrink-0 items-center gap-1">
                        {availableEndoBranches.map((branch) => (
                            <span
                                key={branch.code}
                                className={`h-1.5 w-1.5 rounded-full ${getBranchDotColor(branch.code)}`}
                            />
                        ))}
                    </span>

                    <ChevronDown
                        className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${isEndoOpen ? "rotate-180" : ""}`}
                    />
                </button>
            ) : (
                <p className="mt-2 flex items-center gap-2 rounded-lg border border-gray-100 px-2.5 py-2 text-[11px] font-medium text-gray-400 dark:border-gray-800 dark:text-gray-500">
                    <GitCompareArrows className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 truncate">
                        Χωρίς απόθεμα σε άλλο κατάστημα
                    </span>
                </p>
            )}

            {isEndoOpen && (
                <div className="mt-2">
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
                    />
                </div>
            )}
        </div>
    );
}
