import QuantitySelect from "@/components/ui/quantity-select";
import { Crown, Loader2, ShoppingCart } from "@/lib/icons/lucide";
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
    onSubmitPriority: (branchCode: string) => void;
    isAdding: (branchCode: string) => boolean;
    isSubmittingPriority: (branchCode: string) => boolean;
    inBasketQtyByBranch?: Record<string, number>;
    pendingQtyByBranch?: Record<string, number>;
    error?: string;
    successMessage?: string;
    className?: string;
    branchCardClassName?: string;
    emptyMessage?: string;
    compact?: boolean;
}

/**
 * Renders every source branch so the transfer UI remains spatially stable.
 * Branches without stock stay visible but their controls are disabled.
 */
export default function RequestEndoCard({
    branches,
    getRequestedQty,
    onRequestedQtyChange,
    onAddToBasket,
    onSubmitPriority,
    isAdding,
    isSubmittingPriority,
    inBasketQtyByBranch = {},
    pendingQtyByBranch,
    error = "",
    successMessage = "",
    className = "grid gap-2",
    branchCardClassName = "rounded-lg border border-gray-200 bg-white p-2.5 shadow-xs dark:border-gray-700 dark:bg-gray-900/40",
    emptyMessage = "Δεν υπάρχει διαθέσιμο άλλο κατάστημα.",
    compact = false,
}: RequestEndoCardProps) {
    const sortedBranches = sortEndoBranches(branches);

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
                const hasStock = branch.stock > 0;
                const requestedQty = getRequestedQty(branch.code);
                const inBasketQty = inBasketQtyByBranch[branch.code] ?? 0;
                const pendingQty = pendingQtyByBranch?.[branch.code] ?? inBasketQty;
                const adding = isAdding(branch.code);
                const submittingPriority = isSubmittingPriority(branch.code);
                const disabled =
                    adding ||
                    submittingPriority ||
                    requestedQty <= 0 ||
                    requestedQty > branch.stock ||
                    !hasStock;

                return (
                    <div
                        key={branch.code}
                        className={branchCardClassName}
                    >
                        <div className={`flex min-w-0 items-baseline gap-1.5 ${hasStock ? "" : "opacity-50"}`}>
                            <span
                                className={`min-w-0 truncate rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${getBranchColor(branch.code)}`}
                                title={branch.label}
                            >
                                {branch.label}
                            </span>
                            <span className="shrink-0 text-sm font-bold tabular-nums text-gray-800 dark:text-white/90">
                                {branch.stock}
                            </span>
                        </div>

                        {!compact && (branch.location || pendingQty > 0) && (
                            <div className="mt-1 flex items-center justify-between gap-2">
                                <span className="min-w-0 truncate text-[10px] text-gray-400">
                                    {branch.location ? `Θέση ${branch.location}` : ""}
                                </span>

                                {pendingQty > 0 && (
                                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                                        Σε εκκρεμότητα: {pendingQty}
                                    </span>
                                )}
                            </div>
                        )}

                        {compact && pendingQty > 0 && (
                            <p className="mt-1 text-[8px] font-semibold text-amber-700 dark:text-amber-300">
                                Σε εκκρεμότητα: {pendingQty}
                            </p>
                        )}

                        <div className={compact ? "mt-1.5 flex min-w-0 items-center gap-1" : "mt-2 flex items-center gap-2"}>
                            <QuantitySelect
                                value={requestedQty}
                                onChange={(nextQuantity) =>
                                    onRequestedQtyChange(branch.code, nextQuantity)
                                }
                                max={Math.min(100, branch.stock)}
                                disabled={!hasStock}
                                className={compact ? "flex-1" : "w-full"}
                                placeholder="Ποσ."
                                ariaLabel={`Ποσότητα ενδοδιακίνησης από ${branch.label}`}
                            />

                            <button
                                type="button"
                                onClick={() => onAddToBasket(branch.code)}
                                disabled={disabled}
                                title={`Προσθήκη στο καλάθι ενδοδιακίνησης από ${branch.label}`}
                                aria-label={`Προσθήκη στο καλάθι ενδοδιακίνησης από ${branch.label}`}
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-600 text-white shadow-xs transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-300 disabled:opacity-100 dark:disabled:bg-gray-800 dark:disabled:text-gray-600"
                            >
                                {adding ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <ShoppingCart className="h-3.5 w-3.5" />
                                )}
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => onSubmitPriority(branch.code)}
                            disabled={disabled}
                            title={`Άμεση Priority ενδοδιακίνηση από ${branch.label}`}
                            aria-label={`Άμεση Priority ενδοδιακίνηση από ${branch.label}`}
                            className="mt-1.5 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-amber-500 px-2 text-[10px] font-bold text-white shadow-xs transition hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-300 disabled:opacity-100 dark:disabled:bg-gray-800 dark:disabled:text-gray-600"
                        >
                            {submittingPriority ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Crown className="h-3.5 w-3.5" />
                            )}
                            <span>Priority</span>
                        </button>

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
