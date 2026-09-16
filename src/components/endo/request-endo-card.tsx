import QuantityControl from "@/components/ui/quantity-control";
import { Loader2, ShoppingCart } from "@/lib/icons/lucide";
import { getBranchColor } from "@/lib/branch-colors";
import { sortEndoBranches } from "@/lib/utils/endo";

export type EndoBranchOption = {
    code: string;
    label: string;
    stock: number;
    location: string;
};

export interface RequestEndoCardProps {
    branches: EndoBranchOption[];
    getRequestedQty: (branchCode: string) => number;
    onRequestedQtyChange: (branchCode: string, nextQuantity: number) => void;
    onAddToBasket: (branchCode: string) => void;
    isAdding: (branchCode: string) => boolean;
    inBasketQtyByBranch?: Record<string, number>;
    pendingQtyByBranch?: Record<string, number>;
    error?: string;
    successMessage?: string;
    className?: string;
    branchCardClassName?: string;
    emptyMessage?: string;
}

/**
 * Renders one source row per branch that can actually cover the request.
 * The panel around it owns the heading and the disclosure, so this only
 * draws the rows themselves.
 */
export default function RequestEndoCard({
    branches,
    getRequestedQty,
    onRequestedQtyChange,
    onAddToBasket,
    isAdding,
    inBasketQtyByBranch = {},
    pendingQtyByBranch,
    error = "",
    successMessage = "",
    className = "grid gap-2",
    branchCardClassName = "rounded-lg border border-gray-200 bg-white p-2.5 shadow-xs dark:border-gray-700 dark:bg-gray-900/40",
    emptyMessage = "Δεν υπάρχει διαθέσιμο άλλο κατάστημα.",
}: RequestEndoCardProps) {
    const sortedBranches = sortEndoBranches(
        branches.filter((branch) => branch.stock > 0)
    );

    if (sortedBranches.length === 0) {
        return (
            <p className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
                {emptyMessage}
            </p>
        );
    }

    return (
        <div className={className}>
            {sortedBranches.map((branch) => {
                const requestedQty = getRequestedQty(branch.code);
                const inBasketQty = inBasketQtyByBranch[branch.code] ?? 0;
                const pendingQty = pendingQtyByBranch?.[branch.code] ?? inBasketQty;
                const disabled =
                    isAdding(branch.code) ||
                    requestedQty <= 0 ||
                    requestedQty > branch.stock ||
                    branch.stock <= 0;

                return (
                    <div key={branch.code} className={branchCardClassName}>
                        <div className="flex items-center justify-between gap-2">
                            <span
                                className={`min-w-0 truncate rounded-full px-2 py-0.5 text-[11px] font-semibold ${getBranchColor(branch.code)}`}
                            >
                                {branch.label}
                            </span>

                            <span className="shrink-0 text-[10px] text-gray-400">
                                <span className="text-sm font-semibold tabular-nums text-gray-800 dark:text-white/90">
                                    {branch.stock}
                                </span>{" "}
                                τεμ.
                            </span>
                        </div>

                        {(branch.location || pendingQty > 0) && (
                            <div className="mt-1 flex items-center justify-between gap-2">
                                <span className="min-w-0 truncate text-[10px] text-gray-400">
                                    {branch.location ? `Θέση ${branch.location}` : ""}
                                </span>

                                {pendingQty > 0 && (
                                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                                        Pending: {pendingQty}
                                    </span>
                                )}
                            </div>
                        )}

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
                                title={`Προσθήκη στο καλάθι ενδοδιακίνησης από ${branch.label}`}
                                aria-label={`Προσθήκη στο καλάθι ενδοδιακίνησης από ${branch.label}`}
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-500 text-white shadow-xs transition hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {isAdding(branch.code) ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <ShoppingCart className="h-3.5 w-3.5" />
                                )}
                            </button>
                        </div>

                        {inBasketQty > 0 && pendingQty <= 0 && (
                            <p className="mt-1.5 text-[10px] font-medium text-green-600 dark:text-green-400">
                                Στο καλάθι: {inBasketQty} τεμ.
                            </p>
                        )}
                    </div>
                );
            })}

            {error && (
                <p className="text-[10px] font-medium text-red-500">{error}</p>
            )}

            {successMessage && (
                <p className="text-[10px] font-medium text-green-600 dark:text-green-400">
                    {successMessage}
                </p>
            )}
        </div>
    );
}
