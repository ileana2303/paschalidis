import QuantityControl from "@/components/ui/quantity-control";
import { ChevronLeft, Loader2, ShoppingCart } from "@/lib/icons/lucide";

export type EndoBranchOption = {
    code: string;
    label: string;
    stock: number;
    location: string;
    isCurrent: boolean;
};

export interface RequestEndoCardProps {
    branches: EndoBranchOption[];
    getRequestedQty: (branchCode: string) => number;
    onRequestedQtyChange: (branchCode: string, nextQuantity: number) => void;
    onAddToBasket: (branchCode: string) => void;
    isAdding: (branchCode: string) => boolean;
    inBasketQtyByBranch?: Record<string, number>;
    error?: string;
    successMessage?: string;
    onBack?: () => void;
    className?: string;
    branchesClassName?: string;
    branchCardClassName?: string;
    emptyMessage?: string;
}

export default function RequestEndoCard({
    branches,
    getRequestedQty,
    onRequestedQtyChange,
    onAddToBasket,
    isAdding,
    inBasketQtyByBranch = {},
    error = "",
    successMessage = "",
    onBack,
    className = "rounded-xl border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-white/[0.02]",
    branchesClassName = "grid gap-2",
    branchCardClassName = "rounded-lg border border-gray-200 bg-white p-3 shadow-xs dark:border-gray-700 dark:bg-gray-900/40",
    emptyMessage = "Δεν υπάρχει διαθέσιμο άλλο κατάστημα.",
}: RequestEndoCardProps) {
    return (
        <div className={className}>
            <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Ενδοδιακίνηση
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Ζήτηση από διαθέσιμα αποθέματα άλλων καταστημάτων
                    </p>
                </div>

                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        title="Επιστροφή στην ανατροφοδοσία"
                        aria-label="Επιστροφή στην ανατροφοδοσία"
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-xs transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                        <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>

            {branches.length > 0 ? (
                <div className={branchesClassName}>
                    {branches.map((branch) => {
                        const requestedQty = getRequestedQty(branch.code);
                        const inBasketQty = inBasketQtyByBranch[branch.code] ?? 0;
                        const disabled =
                            branch.isCurrent ||
                            isAdding(branch.code) ||
                            requestedQty <= 0 ||
                            requestedQty > branch.stock ||
                            branch.stock <= 0;

                        return (
                            <div
                                key={branch.code}
                                className={branchCardClassName}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="min-w-0 truncate rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                                        {branch.label}
                                    </span>

                                    {branch.isCurrent && (
                                        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                            Το κατάστημά μου
                                        </span>
                                    )}
                                </div>

                                <div className="mt-2 flex items-end justify-between gap-2">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wide text-gray-400">
                                            Διαθέσιμο
                                        </p>
                                        <p className="text-lg font-semibold tabular-nums text-gray-800 dark:text-white/90">
                                            {branch.stock}
                                        </p>
                                    </div>

                                    <p className="min-w-0 text-right text-[10px] text-gray-400">
                                        {branch.location || "-"}
                                    </p>
                                </div>

                                {!branch.isCurrent && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <QuantityControl
                                            value={requestedQty}
                                            onChange={(nextQuantity) =>
                                                onRequestedQtyChange(branch.code, nextQuantity)
                                            }
                                            min={0}
                                            max={branch.stock}
                                            displayZeroAsEmpty
                                            fullWidth
                                            size="sm"
                                            placeholder="0"
                                            decrementLabel="Μείωση ποσότητας ενδοδιακίνησης"
                                            incrementLabel="Αύξηση ποσότητας ενδοδιακίνησης"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => onAddToBasket(branch.code)}
                                            disabled={disabled}
                                            title="Προσθήκη στο καλάθι ενδοδιακίνησης"
                                            aria-label="Προσθήκη στο καλάθι ενδοδιακίνησης"
                                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-600 shadow-xs transition hover:border-brand-300 hover:bg-brand-100 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/15"
                                        >
                                            {isAdding(branch.code) ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <ShoppingCart className="h-3.5 w-3.5" />
                                            )}
                                        </button>
                                    </div>
                                )}

                                {inBasketQty > 0 && (
                                    <p className="mt-2 text-[10px] font-medium text-green-600 dark:text-green-400">
                                        Στο καλάθι: {inBasketQty} τεμ.
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
                    {emptyMessage}
                </p>
            )}

            {error && (
                <p className="mt-2 text-[10px] font-medium text-red-500">
                    {error}
                </p>
            )}

            {successMessage && (
                <p className="mt-2 text-[10px] font-medium text-green-600 dark:text-green-400">
                    {successMessage}
                </p>
            )}
        </div>
    );
}
