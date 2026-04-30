import { ChevronDown, Loader2, Minus, Plus, ShoppingCart } from "@/lib/icons/lucide";
import type { IItem } from "@/lib/interface";

export type EndoBranchOption = {
    code: string;
    label: string;
    stock: number;
    location: string;
    isCurrent: boolean;
};

interface EndoPartResultsProps {
    item: IItem;
    isExpanded: boolean;
    onToggleExpanded: () => void;
    branches: EndoBranchOption[];
    getRequestedQty: (branchCode: string) => number;
    onRequestedQtyChange: (branchCode: string, nextQuantity: number) => void;
    onAddToBasket: (branchCode: string) => void;
    isAdding: (branchCode: string) => boolean;
    inBasketQtyByBranch: Record<string, number>;
}

function clampQuantity(value: number, max: number) {
    if (!Number.isFinite(value)) return 0;
    if (value < 0) return 0;
    if (value > max) return max;
    return Math.floor(value);
}

export default function EndoPartResults({
    item,
    isExpanded,
    onToggleExpanded,
    branches,
    getRequestedQty,
    onRequestedQtyChange,
    onAddToBasket,
    isAdding,
    inBasketQtyByBranch,
}: EndoPartResultsProps) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white transition hover:border-brand-500 hover:bg-brand-100/40 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="p-4">
                <button
                    type="button"
                    onClick={onToggleExpanded}
                    className="flex w-full items-start gap-3 text-left"
                >
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-brand-600 dark:text-brand-400">
                                {item.ITEM_CODE}
                            </p>
                            <span
                                className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight ${item.STATUS_NOW === "1"
                                    ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                                    : item.STATUS_NOW === "0"
                                        ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400"
                                    }`}
                            >
                                {item.STATUS_LABEL}
                            </span>
                            <span className="inline-flex shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                {item.STATUS_MOBILE || "—"}
                            </span>
                        </div>
                        <p className="mt-0.5 text-sm font-medium text-gray-800 dark:text-white/90">
                            {item.MNF_DESCR}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">{item.ITEM_DESCR}</p>
                    </div>

                    <ChevronDown
                        className={`mt-1 h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                    />
                </button>

                <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-white/[0.02]">
                    <div className="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Απόθεμα ανά κατάστημα
                    </div>
                    <p className="mb-3 text-[11px] text-gray-500 dark:text-gray-400">
                        Ζήτηση από διαθέσιμα αποθέματα άλλων καταστημάτων
                    </p>

                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {branches.map((branch) => {
                            const requestedQty = getRequestedQty(branch.code);
                            const inBasketQty = inBasketQtyByBranch[branch.code] ?? 0;
                            const isDisabledSource = branch.isCurrent;

                            return (
                                <div
                                    key={branch.code}
                                    className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/40"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                                            {branch.label}
                                        </span>
                                        {branch.isCurrent && (
                                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                                Το κατάστημά μου
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-2 flex items-end justify-between gap-2">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wide text-gray-400">
                                                Διαθέσιμο
                                            </p>
                                            <p className="text-lg font-semibold text-gray-800 dark:text-white/90">
                                                {branch.stock}
                                            </p>
                                        </div>
                                        <p className="text-right text-[10px] text-gray-400">
                                            {branch.location || "-"}
                                        </p>
                                    </div>

                                    {!isDisabledSource && (
                                        <>
                                            <div className="mt-2 flex items-center rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900/50">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onRequestedQtyChange(
                                                            branch.code,
                                                            clampQuantity(requestedQty - 1, branch.stock)
                                                        )
                                                    }
                                                    disabled={requestedQty <= 0}
                                                    className="flex h-8 w-8 items-center justify-center text-gray-500 transition hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
                                                >
                                                    <Minus className="h-3.5 w-3.5" />
                                                </button>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={requestedQty === 0 ? "" : requestedQty}
                                                    placeholder="0"
                                                    onChange={(event) => {
                                                        const next = event.target.value.trim();
                                                        if (!next) {
                                                            onRequestedQtyChange(branch.code, 0);
                                                            return;
                                                        }
                                                        if (!/^\d+$/.test(next)) {
                                                            return;
                                                        }
                                                        onRequestedQtyChange(
                                                            branch.code,
                                                            clampQuantity(Number(next), branch.stock)
                                                        );
                                                    }}
                                                    className="h-8 w-full border-x border-gray-200 bg-transparent px-2 text-center text-xs font-medium text-gray-800 outline-none dark:border-gray-700 dark:text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onRequestedQtyChange(
                                                            branch.code,
                                                            clampQuantity(requestedQty + 1, branch.stock)
                                                        )
                                                    }
                                                    disabled={branch.stock <= requestedQty}
                                                    className="flex h-8 w-8 items-center justify-center text-gray-500 transition hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                </button>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => onAddToBasket(branch.code)}
                                                disabled={
                                                    isAdding(branch.code) ||
                                                    requestedQty <= 0 ||
                                                    requestedQty > branch.stock ||
                                                    branch.stock <= 0
                                                }
                                                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
                                            >
                                                {isAdding(branch.code) ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <ShoppingCart className="h-3.5 w-3.5" />
                                                )}
                                                <span>Προσθήκη</span>
                                            </button>
                                        </>
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
                </div>
            </div>

            <div
                className={`overflow-hidden transition-all duration-200 ${isExpanded ? "max-h-[620px] opacity-100" : "max-h-0 opacity-0"}`}
            >
                <div className="border-t border-gray-100 px-4 py-4 text-sm dark:border-gray-800">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
                            <div className="text-[10px] text-gray-400">Σύνολο</div>
                            <div className="font-semibold tabular-nums">{item.TOTAL_AVAIL}</div>
                        </div>

                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
                            <div className="text-[10px] text-gray-400">Καθαρή Διαθ.</div>
                            <div className="font-semibold tabular-nums text-green-600 dark:text-green-400">
                                {item.NET_QTY_AVAILABLE}
                            </div>
                        </div>

                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
                            <div className="text-[10px] text-gray-400">Σε εξέλιξη</div>
                            <div className="font-semibold tabular-nums">{item.ONGOING}</div>
                        </div>

                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
                            <div className="text-[10px] text-gray-400">SoOrdered</div>
                            <div className="font-semibold tabular-nums">{item.SoOrdered}</div>
                        </div>

                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
                            <div className="text-[10px] text-gray-400">SoReserved</div>
                            <div className="font-semibold tabular-nums">{item.SoReserved}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
