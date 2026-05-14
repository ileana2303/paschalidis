import RequestEndoCard from "@/components/parts/request-endo-card";
import type { EndoBranchOption } from "@/components/parts/request-endo-card";
import { ChevronDown } from "@/lib/icons/lucide";
import type { IItem } from "@/lib/interface";

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
            <div className="grid gap-3 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(228px,456px)] xl:items-start">
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

                <RequestEndoCard
                    branches={branches}
                    getRequestedQty={getRequestedQty}
                    onRequestedQtyChange={onRequestedQtyChange}
                    onAddToBasket={onAddToBasket}
                    isAdding={isAdding}
                    inBasketQtyByBranch={inBasketQtyByBranch}
                    branchesClassName="flex justify-center gap-2 overflow-x-auto pb-1"
                    branchCardClassName="w-[204px] shrink-0 rounded-lg border border-gray-200 bg-white p-3 shadow-xs dark:border-gray-700 dark:bg-gray-900/40"
                />
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
