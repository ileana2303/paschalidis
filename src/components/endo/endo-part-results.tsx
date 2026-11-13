import RequestEndoCard, {
    type EndoBranchOption,
} from "@/components/endo/request-endo-card";
import {
    ArrowDown,
    ChevronDown,
    ShoppingCart,
    Warehouse,
} from "@/lib/icons/lucide";
import type { IItem } from "@/lib/interface";

function getStatusBadgeClassName(statusNow: string) {
    if (statusNow === "1") {
        return "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400";
    }

    if (statusNow === "0") {
        return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400";
    }

    return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400";
}

interface EndoPartResultsProps {
    item: IItem;
    currentBranchName: string;
    currentBranchStock: number | null;
    isExpanded: boolean;
    onToggleExpanded: () => void;
    branches: EndoBranchOption[];
    getRequestedQty: (branchCode: string) => number;
    onRequestedQtyChange: (branchCode: string, nextQuantity: number) => void;
    onAddToBasket: (branchCode: string) => void;
    onSubmitPriority: (branchCode: string) => void;
    isAdding: (branchCode: string) => boolean;
    isSubmittingPriority: (branchCode: string) => boolean;
    inBasketQtyByBranch: Record<string, number>;
}

export default function EndoPartResults({
    item,
    currentBranchName,
    currentBranchStock,
    isExpanded,
    onToggleExpanded,
    branches,
    getRequestedQty,
    onRequestedQtyChange,
    onAddToBasket,
    onSubmitPriority,
    isAdding,
    isSubmittingPriority,
    inBasketQtyByBranch,
}: EndoPartResultsProps) {
    const detailsId = `endo-part-details-${item.MTRL}`;
    const totalInBasket = branches.reduce(
        (total, branch) => total + (inBasketQtyByBranch[branch.code] ?? 0),
        0
    );
    const manufacturer = String(item.MNF_DESCR ?? "").trim();
    const description = String(item.ITEM_DESCR ?? "").trim();
    const statusMobile = String(item.STATUS_MOBILE ?? "").trim();

    return (
        <div
            className={`overflow-hidden rounded-xl border bg-white shadow-theme-xs transition dark:bg-white/[0.03] ${totalInBasket > 0
                ? "border-green-400 dark:border-green-600"
                : "border-gray-200 hover:border-brand-300 dark:border-gray-800 dark:hover:border-brand-500/40"
                }`}
        >
            <button
                type="button"
                onClick={onToggleExpanded}
                aria-expanded={isExpanded}
                aria-controls={detailsId}
                className={`group flex w-full items-center gap-2 border-b px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/40 ${isExpanded
                    ? "border-brand-200 bg-brand-50/70 dark:border-brand-500/30 dark:bg-brand-500/10"
                    : "border-gray-100 bg-gray-50/80 hover:bg-brand-50/60 dark:border-gray-800 dark:bg-white/[0.02] dark:hover:bg-brand-500/5"
                    }`}
            >
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                            {item.ITEM_CODE}
                        </span>

                        {(description || manufacturer) && (
                            <span className="min-w-0 text-sm text-gray-700 dark:text-gray-200">
                                {description}
                                {description && manufacturer ? ", " : ""}
                                {manufacturer && (
                                    <span className="font-medium text-gray-800 dark:text-white/90">
                                        {manufacturer}
                                    </span>
                                )}
                            </span>
                        )}

                        <span
                            className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight ${getStatusBadgeClassName(item.STATUS_NOW)}`}
                        >
                            {item.STATUS_LABEL}
                        </span>

                        {statusMobile && (
                            <span className="inline-flex shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                {statusMobile}
                            </span>
                        )}

                        {totalInBasket > 0 && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold leading-tight text-green-700 dark:bg-green-500/10 dark:text-green-400">
                                <ShoppingCart className="h-3 w-3" />
                                Στο καλάθι: {totalInBasket} τεμ.
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex shrink-0 items-center">
                    <span className="grid h-7 w-7 place-items-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-theme-xs transition group-hover:border-brand-300 group-hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:group-hover:border-brand-500 dark:group-hover:text-brand-400">
                        <ChevronDown
                            className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                        />
                    </span>
                </div>
            </button>

            <div className="grid gap-3 p-4 xl:grid-cols-[minmax(200px,240px)_minmax(0,1fr)]">
                <div className="flex h-full flex-col rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        <Warehouse className="h-3.5 w-3.5" />
                        Παραλαβή στο
                    </div>

                    <p className="mt-2 truncate text-sm font-semibold text-gray-800 dark:text-white/90">
                        {currentBranchName}
                    </p>

                    {currentBranchStock != null ? (
                        <div className="mt-2 flex items-baseline gap-1.5">
                            <span
                                className={`text-2xl font-semibold leading-none tabular-nums ${currentBranchStock > 0
                                    ? "text-gray-800 dark:text-white/90"
                                    : "text-red-600 dark:text-red-400"
                                    }`}
                            >
                                {currentBranchStock}
                            </span>
                            <span className="text-[10px] uppercase tracking-wide text-gray-400">
                                τεμ. στο κατάστημα
                            </span>
                        </div>
                    ) : (
                        <p className="mt-2 text-xs text-gray-400">
                            Μη διαθέσιμο απόθεμα
                        </p>
                    )}

                    <div className="mt-auto hidden items-center gap-1.5 pt-3 text-[10px] font-medium text-gray-400 xl:flex">
                        <ArrowDown className="h-3.5 w-3.5" />
                        Ζητήστε τεμάχια από τα καταστήματα δίπλα
                    </div>
                </div>

                <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-violet-200 border-t-3 border-t-violet-500 bg-white shadow-sm dark:border-violet-500/30 dark:border-t-violet-400 dark:bg-white/[0.03]">
                    <div className="border-b border-violet-100 bg-violet-50/80 px-3 py-2 text-center dark:border-violet-500/20 dark:bg-violet-500/10">
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.06em] text-violet-900 dark:text-violet-200">
                            ΕΝΔΟΔΙΑΚΙΝΗΣΗ
                        </h3>
                    </div>

                    <div className="p-3">
                        <RequestEndoCard
                            branches={branches}
                            getRequestedQty={getRequestedQty}
                            onRequestedQtyChange={onRequestedQtyChange}
                            onAddToBasket={onAddToBasket}
                            onSubmitPriority={onSubmitPriority}
                            isAdding={isAdding}
                            isSubmittingPriority={isSubmittingPriority}
                            inBasketQtyByBranch={inBasketQtyByBranch}
                            className="grid gap-2 sm:grid-cols-2"
                            branchCardClassName="rounded-md border border-violet-100 bg-violet-50/60 p-2 dark:border-violet-500/20 dark:bg-violet-500/[0.08]"
                            emptyMessage="Δεν υπάρχει άλλο κατάστημα για ενδοδιακίνηση."
                            compact
                        />
                    </div>
                </div>
            </div>

            <div
                id={detailsId}
                className={`grid transition-all duration-200 ease-out ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
            >
                <div className="overflow-hidden">
                    <div className="border-t border-gray-100 px-4 py-4 dark:border-gray-800">
                        <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                            Κατάσταση αποθέματος
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
                                <div className="text-[10px] text-gray-400">Σύνολο</div>
                                <div className="text-sm font-semibold tabular-nums text-gray-800 dark:text-white/90">
                                    {item.TOTAL_AVAIL}
                                </div>
                            </div>

                            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
                                <div className="text-[10px] text-gray-400">Καθαρή Διαθ.</div>
                                <div className="text-sm font-semibold tabular-nums text-green-600 dark:text-green-400">
                                    {item.NET_QTY_AVAILABLE}
                                </div>
                            </div>

                            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
                                <div className="text-[10px] text-gray-400">Σε εξέλιξη</div>
                                <div className="text-sm font-semibold tabular-nums text-gray-800 dark:text-white/90">
                                    {item.ONGOING}
                                </div>
                            </div>

                            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
                                <div className="text-[10px] text-gray-400">Παραγγελθέντα</div>
                                <div className="text-sm font-semibold tabular-nums text-gray-800 dark:text-white/90">
                                    {item.SoOrdered}
                                </div>
                            </div>

                            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
                                <div className="text-[10px] text-gray-400">Δεσμευμένα</div>
                                <div className="text-sm font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                                    {item.SoReserved}
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                            <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                Κωδικοί
                            </div>

                            <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-3">
                                <div className="flex justify-between gap-2">
                                    <span className="text-gray-400">Κωδ. 2</span>
                                    <span className="truncate font-medium text-gray-800 dark:text-white">
                                        {item.ITEM_CODE2 || "—"}
                                    </span>
                                </div>

                                <div className="flex justify-between gap-2">
                                    <span className="text-gray-400">Όμοιος</span>
                                    <span className="truncate font-medium text-gray-800 dark:text-white">
                                        {item.ITEM_OMOIO || "—"}
                                    </span>
                                </div>

                                <div className="flex justify-between gap-2">
                                    <span className="text-gray-400">CODE1_0</span>
                                    <span className="truncate font-medium text-gray-800 dark:text-white">
                                        {item.CODE1_0 || "—"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
