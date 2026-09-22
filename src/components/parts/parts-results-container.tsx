import {
    ChevronDown,
    GitCompareArrows,
    ListChevronsDownUp,
    ListChevronsUpDown,
    PanelRightClose,
    PanelRightOpen,
    Plus,
    Search,
} from "@/lib/icons/lucide";
import { getBasketItemQty } from "@/lib/utils/basket-helpers";
import type { IBasketItem, ICustomerInfo, IItem, StockRequestStatus } from "@/lib/interface";
import type { EndoBranchOption } from "@/components/endo/request-endo-card";
import PartResults from "@/components/parts/part-card";
import Checkbox from "@/components/template-components/form/input/Checkbox";
import { useMemo, useState, type RefObject, type UIEvent } from "react";

interface PartsResultsLayoutProps {
    hasCustomer: boolean;
    customer: ICustomerInfo | null;
    resultsContainerRef: RefObject<HTMLDivElement | null>;
    onResultsScroll: (event: UIEvent<HTMLDivElement>) => void;
    hasScrolledResults: boolean;
    isResultsScrollable: boolean | null;
    onOpenSearchModal: () => void;
}

interface PartsResultsStateProps {
    items: IItem[];
    loading: boolean;
    hasSearched: boolean;
    currentBranchCode: string;
    stockRequestCardsVisible: boolean;
    onToggleStockRequestCardsVisibility: () => void;
    onToggleAllExpanded: () => void;
    areAllResultsExpanded: boolean;
    expandedItems: Set<string>;
    getExpandedItemKey: (item: IItem) => string;
    toggleExpanded: (itemKey: string) => void;
}

interface PartsResultsEndoProps {
    openEndoItemKeys: Set<string>;
    getBranchOptions: (item: IItem) => EndoBranchOption[];
    getEndoRequestedQty: (mtrl: string | number, sourceBranch: string) => number;
    getEndoPendingQty: (mtrl: string | number, sourceBranch: string) => number;
    setEndoRequestedQty: (
        mtrl: string | number,
        sourceBranch: string,
        qty: number
    ) => void;
    onAddToEndoBasket: (item: IItem, sourceBranchCode: string) => Promise<void> | void;
    isAddingToEndoBasket: (
        mtrl: string | number,
        sourceBranchCode: string
    ) => boolean;
    endoBasketError: string;
    endoBasketSuccess: string;
    onToggleEndoForItem: (item: IItem) => void;
    areAllEndoSourcesOpen: boolean;
    onToggleAllEndoSources: () => void;
}

interface PartsResultsBasketProps {
    findBasketItem: (item: IItem) => IBasketItem | undefined;
    getQuantity: (itemCode: string, fallback?: number) => number;
    onQuantityChange: (itemCode: string, qty: number) => void;
    addingToBasket: Set<string>;
    getStoreStock: (item: IItem) => number;
    getStoreOrderQuantity: (mtrl: string) => number;
    stockRequestStatuses: Record<string, StockRequestStatus>;
    stockRequestErrors: Record<string, string>;
    submittingStockRequests: Set<string>;
    requestedPrices: Record<string, string>;
    submittingRequestedPrices: Set<string>;
    onRequestedPriceValueChange: (itemCode: string, value: string) => void;
    onAddToBasket: (item: IItem) => Promise<void> | void;
    onRequestPrice: (item: IItem) => Promise<void> | void;
    onStoreOrderQuantityChange: (mtrl: string, qty: number) => void;
    onSubmitStockRequest: (item: IItem) => Promise<void> | void;
    formatPrice: (price: number | string | null | undefined) => string;
}

interface PartsResultsContainerProps {
    layout: PartsResultsLayoutProps;
    results: PartsResultsStateProps;
    endo: PartsResultsEndoProps;
    basket: PartsResultsBasketProps;
}

export default function PartsResultsContainer({
    layout,
    results,
    endo,
    basket,
}: PartsResultsContainerProps) {
    const {
        hasCustomer,
        customer,
        resultsContainerRef,
        onResultsScroll,
        hasScrolledResults,
        isResultsScrollable,
        onOpenSearchModal,
    } = layout;

    const {
        items,
        loading,
        hasSearched,
        currentBranchCode,
        stockRequestCardsVisible,
        onToggleStockRequestCardsVisibility,
        onToggleAllExpanded,
        areAllResultsExpanded,
        expandedItems,
        getExpandedItemKey,
        toggleExpanded,
    } = results;

    const {
        openEndoItemKeys,
        getBranchOptions: getEndoBranchOptions,
        getEndoRequestedQty,
        getEndoPendingQty,
        setEndoRequestedQty,
        onAddToEndoBasket,
        isAddingToEndoBasket,
        endoBasketError,
        endoBasketSuccess,
        onToggleEndoForItem,
        areAllEndoSourcesOpen,
        onToggleAllEndoSources,
    } = endo;

    const {
        findBasketItem,
        getQuantity,
        onQuantityChange,
        addingToBasket,
        getStoreStock,
        getStoreOrderQuantity,
        stockRequestStatuses,
        stockRequestErrors,
        submittingStockRequests,
        requestedPrices,
        submittingRequestedPrices,
        onRequestedPriceValueChange,
        onAddToBasket,
        onRequestPrice,
        onStoreOrderQuantityChange,
        onSubmitStockRequest,
        formatPrice,
    } = basket;

    const [textFilter, setTextFilter] = useState("");
    const [statusFilterSelection, setStatusFilterSelection] = useState<Set<string> | null>(null);

    const availableStatusLabels = useMemo(() => {
        const labels = new Set<string>();

        for (const item of items) {
            const label = String(item.STATUS_LABEL ?? "").trim();

            if (label) {
                labels.add(label);
            }
        }

        return Array.from(labels).sort((a, b) => a.localeCompare(b, "el"));
    }, [items]);

    const availableStatusLabelsKey = availableStatusLabels.join("\0");
    const [syncedStatusLabelsKey, setSyncedStatusLabelsKey] = useState(availableStatusLabelsKey);

    if (syncedStatusLabelsKey !== availableStatusLabelsKey) {
        setSyncedStatusLabelsKey(availableStatusLabelsKey);
        setStatusFilterSelection(null);
    }

    const selectedStatusLabels = useMemo(
        () => statusFilterSelection ?? new Set(availableStatusLabels),
        [statusFilterSelection, availableStatusLabels],
    );

    const normalizedTextFilter = textFilter.trim().toLowerCase();
    const isStatusFilterActive =
        statusFilterSelection !== null &&
        statusFilterSelection.size < availableStatusLabels.length;

    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            const statusLabel = String(item.STATUS_LABEL ?? "").trim();

            if (
                isStatusFilterActive &&
                statusLabel &&
                !selectedStatusLabels.has(statusLabel)
            ) {
                return false;
            }

            if (!normalizedTextFilter) {
                return true;
            }

            const itemCode = String(item.ITEM_CODE ?? "").toLowerCase();
            const itemDescr = String(item.ITEM_DESCR ?? "").toLowerCase();
            const manufacturerDescr = String(item.MNF_DESCR ?? "").toLowerCase();

            return (
                itemCode.includes(normalizedTextFilter) ||
                itemDescr.includes(normalizedTextFilter) ||
                manufacturerDescr.includes(normalizedTextFilter)
            );
        });
    }, [items, isStatusFilterActive, normalizedTextFilter, selectedStatusLabels]);

    const hasActiveFilters = normalizedTextFilter.length > 0 || isStatusFilterActive;

    const toggleStatusLabel = (statusLabel: string) => {
        setStatusFilterSelection((prev) => {
            const current = prev ?? new Set(availableStatusLabels);
            const next = new Set(current);

            if (next.has(statusLabel)) {
                next.delete(statusLabel);
            } else {
                next.add(statusLabel);
            }

            return next;
        });
    };

    return (
        <div className="relative min-h-0 flex-1">
            <div
                ref={resultsContainerRef}
                className="h-full overflow-y-auto overscroll-contain"
                onScroll={onResultsScroll}
            >
                <div className="px-5 pb-2 xl:px-10 xl:pb-2">
                    <div className="mx-auto w-full max-w-[820px] text-left xl:max-w-[1120px] 2xl:max-w-[1360px]">

                        {items.length > 0 && (
                            <div className="sticky top-0 z-10 mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-gray-100 bg-white py-2 backdrop-blur dark:border-gray-800 dark:bg-[#0f172a]/95">
                                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                                    <p className="truncate text-sm text-gray-500">
                                        {hasActiveFilters
                                            ? `Βρέθηκαν ${filteredItems.length} αποτελέσματα`
                                            : `Βρέθηκαν ${items.length} αποτελέσματα`}
                                    </p>

                                    <button
                                        type="button"
                                        onClick={onToggleAllExpanded}
                                        aria-label={areAllResultsExpanded ? "Κλείσιμο λεπτομερειών" : "Άνοιγμα λεπτομερειών"}
                                        title={areAllResultsExpanded ? "Κλείσιμο λεπτομερειών" : "Άνοιγμα λεπτομερειών"}
                                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:border-brand-500 dark:hover:text-brand-400"
                                    >
                                        {areAllResultsExpanded ? (
                                            <ListChevronsDownUp className="h-4 w-4" />
                                        ) : (
                                            <ListChevronsUpDown className="h-4 w-4" />
                                        )}
                                    </button>

                                    <div className="relative min-w-0 max-w-[220px] flex-1 sm:max-w-[280px]">
                                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            value={textFilter}
                                            onChange={(event) => setTextFilter(event.target.value)}
                                            placeholder="Κωδικός, περιγραφή, κατασκευαστής..."
                                            aria-label="Φιλτράρισμα ανταλλακτικών"
                                            className="h-8 w-full rounded-lg border border-gray-200 bg-white pl-8 pr-2.5 text-xs text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-200"
                                        />
                                    </div>

                                    {availableStatusLabels.length > 0 && (
                                        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 [&_label]:gap-2 [&_span]:text-xs">
                                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                                Κατάσταση
                                            </span>
                                            {availableStatusLabels.map((statusLabel) => (
                                                <Checkbox
                                                    key={statusLabel}
                                                    id={`status-filter-${statusLabel}`}
                                                    label={statusLabel}
                                                    checked={selectedStatusLabels.has(statusLabel)}
                                                    onChange={() => toggleStatusLabel(statusLabel)}
                                                    className="h-4 w-4"
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                    {stockRequestCardsVisible && (
                                        <button
                                            type="button"
                                            onClick={onToggleAllEndoSources}
                                            aria-expanded={areAllEndoSourcesOpen}
                                            aria-label={
                                                areAllEndoSourcesOpen
                                                    ? "Κλείσιμο όλων των πηγών ενδοδιακίνησης"
                                                    : "Άνοιγμα όλων των πηγών ενδοδιακίνησης"
                                            }
                                            title={
                                                areAllEndoSourcesOpen
                                                    ? "Κλείσιμο όλων των πηγών ενδοδιακίνησης"
                                                    : "Άνοιγμα όλων των πηγών ενδοδιακίνησης"
                                            }
                                            className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
                                                areAllEndoSourcesOpen
                                                    ? "bg-brand-500 text-white hover:bg-brand-600"
                                                    : "border border-gray-200 bg-white text-gray-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:border-brand-500 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
                                            }`}
                                        >
                                            <GitCompareArrows className="h-3.5 w-3.5" />
                                            <span className="hidden sm:inline">Πηγές</span>
                                            <ChevronDown
                                                className={`h-3.5 w-3.5 transition-transform duration-200 ${areAllEndoSourcesOpen ? "rotate-180" : ""}`}
                                            />
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={onToggleStockRequestCardsVisibility}
                                        aria-pressed={stockRequestCardsVisible}
                                        aria-label={
                                            stockRequestCardsVisible
                                                ? "Απόκρυψη καρτών ανατροφοδοσίας"
                                                : "Προβολή καρτών ανατροφοδοσίας"
                                        }
                                        title={
                                            stockRequestCardsVisible
                                                ? "Απόκρυψη καρτών ανατροφοδοσίας"
                                                : "Προβολή καρτών ανατροφοδοσίας"
                                        }
                                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
                                            stockRequestCardsVisible
                                                ? "bg-brand-500 text-white hover:bg-brand-600"
                                                : "border border-gray-200 bg-white text-gray-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:border-brand-500 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
                                        }`}
                                    >
                                        {stockRequestCardsVisible ? (
                                            <PanelRightClose className="h-3.5 w-3.5" />
                                        ) : (
                                            <PanelRightOpen className="h-3.5 w-3.5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            {filteredItems.map((item) => {
                                const mtrlKey = String(item.MTRL);
                                const expandedItemKey = getExpandedItemKey(item);
                                const isExpanded = expandedItems.has(expandedItemKey);
                                const isEndoOpen =
                                    stockRequestCardsVisible && openEndoItemKeys.has(expandedItemKey);
                                const basketItem = findBasketItem(item);
                                const qty = getQuantity(
                                    item.ITEM_CODE,
                                    basketItem ? Math.max(1, getBasketItemQty(basketItem)) : 1
                                );
                                const isAdding = addingToBasket.has(item.ITEM_CODE);
                                const isInBasket = basketItem != null;
                                const storeStock = getStoreStock(item);
                                const storeOrderQty = getStoreOrderQuantity(mtrlKey);
                                const stockRequestStatus = stockRequestStatuses[mtrlKey] ?? null;
                                const stockRequestError = stockRequestErrors[mtrlKey] ?? "";
                                const isSubmittingStockRequest = submittingStockRequests.has(mtrlKey);
                                const requestedPriceValue = requestedPrices[item.ITEM_CODE] ?? "";
                                const isSubmittingRequestPrice = submittingRequestedPrices.has(item.ITEM_CODE);
                                const endoBranches = getEndoBranchOptions(item);
                                const pendingEndoQtyByBranch =
                                    endoBranches.reduce<Record<string, number>>((acc, branch) => {
                                        const pendingQty = getEndoPendingQty(item.MTRL, branch.code);

                                        if (pendingQty > 0) {
                                            acc[branch.code] = pendingQty;
                                        }

                                        return acc;
                                    }, {});

                                return (
                                    <PartResults
                                        key={`${item.ITEM_CODE}-${mtrlKey}`}
                                        item={item}
                                        isExpanded={isExpanded}
                                        qty={qty}
                                        isAdding={isAdding}
                                        isInBasket={isInBasket}
                                        basketItem={basketItem}
                                        hasCustomer={hasCustomer}
                                        customer={customer}
                                        currentBranchCode={currentBranchCode}
                                        storeStock={storeStock}
                                        storeOrderQty={storeOrderQty}
                                        stockRequestStatus={stockRequestStatus}
                                        stockRequestError={stockRequestError}
                                        isSubmittingStockRequest={isSubmittingStockRequest}
                                        showStockRequestCard={stockRequestCardsVisible}
                                        requestedPriceValue={requestedPriceValue}
                                        isSubmittingRequestPrice={isSubmittingRequestPrice}
                                        onToggleExpanded={() => toggleExpanded(expandedItemKey)}
                                        onQuantityChange={(nextQty) =>
                                            onQuantityChange(item.ITEM_CODE, nextQty)
                                        }
                                        onAddToBasket={() => onAddToBasket(item)}
                                        onRequestedPriceValueChange={(value) =>
                                            onRequestedPriceValueChange(item.ITEM_CODE, value)
                                        }
                                        onRequestPrice={() => onRequestPrice(item)}
                                        onStoreOrderQuantityChange={(nextQuantity) =>
                                            onStoreOrderQuantityChange(mtrlKey, nextQuantity)
                                        }
                                        onSubmitStockRequest={() => onSubmitStockRequest(item)}
                                        formatPrice={formatPrice}
                                        endoRequest={{
                                            isOpen: isEndoOpen,
                                            canStart: hasCustomer,
                                            branches: endoBranches,
                                            error: isEndoOpen ? endoBasketError : "",
                                            successMessage: isEndoOpen ? endoBasketSuccess : "",
                                            pendingQtyByBranch: pendingEndoQtyByBranch,
                                            getRequestedQty: (branchCode) =>
                                                getEndoRequestedQty(item.MTRL, branchCode),
                                            onRequestedQtyChange: (branchCode, nextQty) =>
                                                setEndoRequestedQty(item.MTRL, branchCode, nextQty),
                                            onToggle: () => onToggleEndoForItem(item),
                                            onAddToBasket: (branchCode) =>
                                                onAddToEndoBasket(item, branchCode),
                                            isAdding: (branchCode) =>
                                                isAddingToEndoBasket(item.MTRL, branchCode),
                                        }}
                                    />
                                );
                            })}
                        </div>

                        {hasSearched && !loading && items.length === 0 && (
                            <p className="mt-6 text-center text-sm text-gray-400">
                                Δεν βρέθηκαν ανταλλακτικά
                            </p>
                        )}

                        {hasSearched && !loading && items.length > 0 && filteredItems.length === 0 && (
                            <p className="mt-6 text-center text-sm text-gray-400">
                                Δεν βρέθηκαν ανταλλακτικά με τα επιλεγμένα φίλτρα
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {items.length > 0 && (hasScrolledResults || isResultsScrollable === false) && (
                <button
                    type="button"
                    onClick={onOpenSearchModal}
                    aria-label="Νέα αναζήτηση ανταλλακτικού"
                    className="absolute bottom-6 right-6 z-20 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-brand-500 bg-brand-500 text-white shadow-lg transition-all duration-200 hover:bg-brand-600 dark:border-brand-500 dark:bg-brand-500 dark:text-white dark:hover:bg-brand-600"
                >
                    <Plus className="h-5 w-5" />
                </button>
            )}
        </div>
    );
}
