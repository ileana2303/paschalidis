import {
    ChevronLeft,
    GitCompareArrows,
    ListChevronsDownUp,
    ListChevronsUpDown,
    Plus,
} from "@/lib/icons/lucide";
import { getBasketItemQty } from "@/lib/utils/basket-helpers";
import type { IBasketItem, IItem, StockRequestStatus } from "@/lib/interface";
import EndoPartResults from "@/components/endo/endo-part-results";
import type { EndoBranchOption } from "@/components/endo/endo-part-results";
import PartResults from "@/components/parts/part-card";
import type { RefObject, UIEvent } from "react";

type EndoBasketPreviewItem = {
    mtrl: number;
    fromBranch: string;
    qty: number;
};

interface PartsResultsLayoutProps {
    hasCustomer: boolean;
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
    isEndoMode: boolean;
    onToggleEndoMode: () => void;
    onToggleAllExpanded: () => void;
    areAllResultsExpanded: boolean;
    expandedItems: Set<string>;
    getExpandedItemKey: (item: IItem) => string;
    toggleExpanded: (itemKey: string) => void;
}

interface PartsResultsEndoProps {
    getBranchOptions: (item: IItem) => EndoBranchOption[];
    endoBasketItems: EndoBasketPreviewItem[];
    getEndoRequestedQty: (mtrl: string | number, sourceBranch: string) => number;
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
        isEndoMode,
        onToggleEndoMode,
        onToggleAllExpanded,
        areAllResultsExpanded,
        expandedItems,
        getExpandedItemKey,
        toggleExpanded,
    } = results;

    const {
        getBranchOptions: getEndoBranchOptions,
        endoBasketItems,
        getEndoRequestedQty,
        setEndoRequestedQty,
        onAddToEndoBasket,
        isAddingToEndoBasket,
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
                            <div className="sticky top-0 z-10 mb-2 flex flex-col gap-2 border-b border-gray-100 bg-white py-2 backdrop-blur sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-[#0f172a]/95">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={onToggleAllExpanded}
                                        aria-label={areAllResultsExpanded ? "Κλείσιμο όλων" : "Άνοιγμα όλων"}
                                        title={areAllResultsExpanded ? "Κλείσιμο όλων" : "Άνοιγμα όλων"}
                                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:border-brand-500 dark:hover:text-brand-400"
                                    >
                                        {areAllResultsExpanded ? (
                                            <ListChevronsDownUp className="h-4 w-4" />
                                        ) : (
                                            <ListChevronsUpDown className="h-4 w-4" />
                                        )}
                                    </button>

                                    <p className="text-sm text-gray-500">
                                        Βρέθηκαν {items.length} αποτελέσματα
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    {hasCustomer && (
                                        <button
                                            type="button"
                                            onClick={onToggleEndoMode}
                                            aria-pressed={isEndoMode}
                                            className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold shadow-sm transition ${isEndoMode
                                                    ? "border-brand-500 bg-brand-500 text-white hover:bg-brand-600"
                                                    : "border-gray-200 bg-white text-gray-600 hover:border-brand-300 hover:text-brand-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:border-brand-500 dark:hover:text-brand-400"
                                                }`}
                                        >
                                            {isEndoMode ? (
                                                <ChevronLeft className="h-3.5 w-3.5" />
                                            ) : (
                                                <GitCompareArrows className="h-3.5 w-3.5" />
                                            )}
                                            <span>{isEndoMode ? "Καλάθι Πελάτη" : "Ενδοδιακίνηση"}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            {items.map((item) => {
                                const mtrlKey = String(item.MTRL);
                                const expandedItemKey = getExpandedItemKey(item);
                                const isExpanded = expandedItems.has(expandedItemKey);

                                if (isEndoMode) {
                                    const endoBranches = getEndoBranchOptions(item);
                                    const inEndoBasketQtyByBranch = endoBasketItems
                                        .filter((basketItem) => basketItem.mtrl === Number(item.MTRL))
                                        .reduce<Record<string, number>>((acc, basketItem) => {
                                            acc[basketItem.fromBranch] =
                                                (acc[basketItem.fromBranch] ?? 0) + basketItem.qty;
                                            return acc;
                                        }, {});

                                    return (
                                        <EndoPartResults
                                            key={`${item.ITEM_CODE}-${mtrlKey}`}
                                            item={item}
                                            isExpanded={isExpanded}
                                            branches={endoBranches}
                                            getRequestedQty={(branchCode) =>
                                                getEndoRequestedQty(item.MTRL, branchCode)
                                            }
                                            onRequestedQtyChange={(branchCode, nextQty) =>
                                                setEndoRequestedQty(item.MTRL, branchCode, nextQty)
                                            }
                                            onAddToBasket={(branchCode) =>
                                                onAddToEndoBasket(item, branchCode)
                                            }
                                            isAdding={(branchCode) =>
                                                isAddingToEndoBasket(item.MTRL, branchCode)
                                            }
                                            inBasketQtyByBranch={inEndoBasketQtyByBranch}
                                            onToggleExpanded={() => toggleExpanded(expandedItemKey)}
                                        />
                                    );
                                }

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
                                        currentBranchCode={currentBranchCode}
                                        storeStock={storeStock}
                                        storeOrderQty={storeOrderQty}
                                        stockRequestStatus={stockRequestStatus}
                                        stockRequestError={stockRequestError}
                                        isSubmittingStockRequest={isSubmittingStockRequest}
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
                                    />
                                );
                            })}
                        </div>

                        {hasSearched && !loading && items.length === 0 && (
                            <p className="mt-6 text-center text-sm text-gray-400">
                                Δεν βρέθηκαν ανταλλακτικά
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
