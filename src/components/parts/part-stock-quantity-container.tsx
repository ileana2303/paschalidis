import { Loader2, Minus, Plus, Send } from "@/app/lib/lucide";
import type { StockRequestStatus } from "@/app/lib/interface";

interface PartStockQuantityContainerProps {
    mtrl: string;
    stock: number;
    quantity: number;
    onQuantityChange: (nextQuantity: number) => void;
    onSubmitRequest: () => void;
    requestStatus: StockRequestStatus | null;
    isSubmittingRequest: boolean;
    requestError: string;
}

export default function PartStockQuantityContainer({
    mtrl,
    stock,
    quantity,
    onQuantityChange,
    onSubmitRequest,
    requestStatus,
    isSubmittingRequest,
    requestError,
}: PartStockQuantityContainerProps) {
    const statusClassName =
        requestStatus === "approved"
            ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
            : requestStatus === "declined"
                ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";

    const statusLabel =
        requestStatus === "approved"
            ? "Approved"
            : requestStatus === "declined"
                ? "Declined"
                : "Pending";

    return (
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                MTRL
            </p>
            <p className="mt-0.5 text-xs font-semibold text-gray-700 dark:text-white/90">
                {mtrl}
            </p>

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
                <div className="flex items-center rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900/50">
                    <button
                        type="button"
                        onClick={() => onQuantityChange(quantity - 1)}
                        disabled={quantity <= 0}
                        aria-label="Μείωση ποσότητας αποθέματος"
                        className="flex h-9 w-9 items-center justify-center text-gray-500 transition hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
                    >
                        <Minus className="h-4 w-4" />
                    </button>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={quantity === 0 ? "" : quantity}
                        placeholder="0"
                        onChange={(e) => {
                            const nextValue = e.target.value.trim();

                            if (!nextValue) {
                                onQuantityChange(0);
                                return;
                            }

                            if (!/^\d+$/.test(nextValue)) {
                                return;
                            }

                            onQuantityChange(Number(nextValue));
                        }}
                        className="h-9 w-full border-x border-gray-200 bg-transparent px-2 text-center text-sm font-medium text-gray-800 outline-none dark:border-gray-700 dark:text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <button
                        type="button"
                        onClick={() => onQuantityChange(quantity + 1)}
                        aria-label="Αύξηση ποσότητας αποθέματος"
                        className="flex h-9 w-9 items-center justify-center text-gray-500 transition hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                </div>
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
                <span>Send Request</span>
            </button>

            {requestStatus && (
                <div className="mt-2 flex justify-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClassName}`}>
                        {statusLabel}
                    </span>
                </div>
            )}

            {requestError && (
                <p className="mt-2 text-center text-[10px] font-medium text-red-500">
                    {requestError}
                </p>
            )}
        </div>
    );
}
