import { ChevronDown, Loader2, ShoppingCart } from "@/lib/icons/lucide";
import { getBranchColor } from "@/lib/branch-colors";
import { getStockBranchOrder, resolveBranchName } from "@/lib/auth/branches";
import {
    getBasketItemApprovalStatus,
    getBasketItemBasePrice,
    getBasketItemQty,
    getBasketItemRequestedPrice,
    hasBasketItemPriceRequest,
} from "@/lib/utils/basket-helpers";
import type { IBasketItem, ICustomerInfo, IItem, StockRequestStatus } from "@/lib/interface";
import {
    formatCustomerSearchPrice,
    getCustomerBasketUnitPrice,
    getCustomerUnitListPrice,
    getCustomerUnitPriceLabel,
} from "@/lib/utils/customer-price-tier";
import type { EndoBranchOption } from "@/components/endo/request-endo-card";
import QuantityControl from "@/components/ui/quantity-control";
import RequestPriceBox from "@/components/ui/request-price-box";
import { useCan } from "@/hooks/usePermissions";
import PartCardDetails from "./part-card-details";
import PartStockQuantityContainer from "../stock/request-stock-card";

type StockBranchCode = "1000" | "1006" | "1007";
type StockKey = "YP1000" | "YP1006" | "YP1007";
type LocationKey = "THESI1000" | "THESI1006" | "THESI1007";

const STOCK_BRANCH_CODES: StockBranchCode[] = ["1000", "1006", "1007"];

const STOCK_BRANCH_META: Record<
    StockBranchCode,
    { label: string; shortLabel: string; stockKey: StockKey; locationKey: LocationKey }
> = {
    "1000": {
        label: "Κασομούλη",
        shortLabel: "ΚΑΣ",
        stockKey: "YP1000",
        locationKey: "THESI1000",
    },
    "1006": {
        label: "Λ.Αθηνών",
        shortLabel: "ΑΘΗ",
        stockKey: "YP1006",
        locationKey: "THESI1006",
    },
    "1007": {
        label: "Λ.Μεσογείων",
        shortLabel: "ΜΕΣ",
        stockKey: "YP1007",
        locationKey: "THESI1007",
    },
};

interface PartEndoRequestProps {
    branches: EndoBranchOption[];
    getRequestedQty: (branchCode: string) => number;
    onRequestedQtyChange: (branchCode: string, nextQuantity: number) => void;
    pendingQtyByBranch?: Record<string, number>;
    onAddToBasket: (branchCode: string) => void;
    isAdding: (branchCode: string) => boolean;
}

interface PartResultsProps {
    item: IItem;
    isExpanded: boolean;
    qty: number;
    isAdding: boolean;
    isInBasket: boolean;
    basketItem?: IBasketItem;
    hasCustomer: boolean;
    customer: ICustomerInfo | null;
    currentBranchCode: string;
    storeStock: number;
    storeOrderQty: number;
    stockRequestStatus: StockRequestStatus | null;
    stockRequestError: string;
    isSubmittingStockRequest: boolean;
    showStockRequestCard: boolean;
    requestedPriceValue: string;
    isSubmittingRequestPrice: boolean;
    onToggleExpanded: () => void;
    onQuantityChange: (nextQty: number) => void;
    onAddToBasket: () => void;
    onRequestedPriceValueChange: (value: string) => void;
    onRequestPrice: () => void;
    onStoreOrderQuantityChange: (nextQuantity: number) => void;
    onSubmitStockRequest: () => void;
    onOpenInsights: () => void;
    formatPrice: (price: number | string | null | undefined) => string;
    endoRequest: PartEndoRequestProps;
}

export default function PartResults({
    item,
    isExpanded,
    qty,
    isAdding,
    isInBasket,
    basketItem,
    hasCustomer,
    customer,
    currentBranchCode,
    storeStock,
    storeOrderQty,
    stockRequestStatus,
    stockRequestError,
    isSubmittingStockRequest,
    showStockRequestCard,
    requestedPriceValue,
    isSubmittingRequestPrice,
    onToggleExpanded,
    onQuantityChange,
    onAddToBasket,
    onRequestedPriceValueChange,
    onRequestPrice,
    onStoreOrderQuantityChange,
    onSubmitStockRequest,
    onOpenInsights,
    formatPrice,
    endoRequest,
}: PartResultsProps) {
    const can = useCan();
    const canSeePrices = can("prices");
    const canRequestPrice = can("request-price");
    const canSeeStatistics = can("statistics");
    const canExpandDetails = can("expand-details");
    const canSeeBranchStock = can("stock-branch-meta");
    const showAnatrofCard = showStockRequestCard && can("anatrof-card");
    const requestStatus =
        basketItem != null
            ? getBasketItemApprovalStatus(basketItem)
            : null;
    const hasPriceRequest =
        basketItem != null
            ? hasBasketItemPriceRequest(basketItem)
            : false;
    const erpPrice =
        basketItem != null
            ? getBasketItemBasePrice(basketItem)
            : getCustomerBasketUnitPrice(item, customer);
    const requestedPrice =
        basketItem != null && hasPriceRequest
            ? getBasketItemRequestedPrice(basketItem)
            : null;
    const hasRequestedPrice =
        requestedPrice != null &&
        requestedPrice > 0 &&
        Math.abs(requestedPrice - erpPrice) > 0.0001;
    const hasApprovedRequestedPrice =
        requestStatus === "approved" && hasRequestedPrice;
    const manufacturerDescription = String(item.MNF_DESCR ?? "").trim();
    const itemDescription = String(item.ITEM_DESCR ?? "").trim();
    const unitListPrice = getCustomerUnitListPrice(item, customer);
    const unitPriceLabel = getCustomerUnitPriceLabel(customer);
    const locatedTier = String(item.LOCATED_TIER ?? "").trim();
    const basketQuantity = basketItem != null
        ? Math.max(1, getBasketItemQty(basketItem))
        : null;
    // The basket can only hold what the user's own branch has in stock.
    const availableStock = Math.max(0, Math.floor(storeStock));
    const isOutOfStock = availableStock <= 0;
    const hasUnsavedBasketQuantity = basketQuantity != null && qty !== basketQuantity;
    const isBasketActionMuted = basketItem != null && !hasUnsavedBasketQuantity;
    const isBasketActionDisabled = isAdding || isBasketActionMuted || isOutOfStock;
    const basketActionLabel = isAdding
        ? basketItem != null
            ? "Ενημέρωση..."
            : "Προσθήκη..."
        : isBasketActionMuted
            ? "Στο καλάθι"
            : isOutOfStock
                ? "Χωρίς απόθεμα"
                : basketItem != null
                    ? "Ενημέρωση"
                    : "Προσθήκη";

    const basketActionClassName = isBasketActionMuted
        ? "group inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-green-200 bg-green-50 px-3.5 text-xs font-semibold text-green-700 transition disabled:cursor-not-allowed disabled:opacity-70 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-300"
        : "group inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-brand-500 px-3.5 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-40";
    const orderedStockBranchCodes = getStockBranchOrder(currentBranchCode);
    const myStockBranchCode = STOCK_BRANCH_CODES.includes(
        currentBranchCode.trim() as StockBranchCode
    )
        ? orderedStockBranchCodes[0]
        : null;
  
    const otherStockBranchCodes = (myStockBranchCode
        ? orderedStockBranchCodes.slice(1)
        : orderedStockBranchCodes
    ).slice().sort((a, b) => {
        const aHasStock = Number(item[STOCK_BRANCH_META[a].stockKey]) > 0;
        const bHasStock = Number(item[STOCK_BRANCH_META[b].stockKey]) > 0;

        if (aHasStock === bHasStock) return 0;
        return aHasStock ? -1 : 1;
    });
    const myStockValue = myStockBranchCode
        ? Number(item[STOCK_BRANCH_META[myStockBranchCode].stockKey])
        : 0;
    const myStockLocation = myStockBranchCode
        ? String(item[STOCK_BRANCH_META[myStockBranchCode].locationKey] ?? "").trim()
        : "";

    const statusBadgeClassName =
        item.STATUS_NOW === "1"
            ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
            : item.STATUS_NOW === "0"
                ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400";

    const renderStockSummary = (className: string) => (
        <div
            className={`min-w-0 flex-nowrap items-center gap-x-1.5 text-left min-[1500px]:gap-x-2.5 ${className}`}
            aria-label="Απόθεμα ανά κατάστημα"
        >
            {myStockBranchCode && (
                <span
                    className="flex min-w-0 items-baseline gap-1.5"
                    title={myStockLocation
                        ? `${STOCK_BRANCH_META[myStockBranchCode].label}: ${item[STOCK_BRANCH_META[myStockBranchCode].stockKey] ?? 0} τεμ. · Θέση ${myStockLocation}`
                        : `${STOCK_BRANCH_META[myStockBranchCode].label}: ${item[STOCK_BRANCH_META[myStockBranchCode].stockKey] ?? 0} τεμ.`}
                >
                    <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${getBranchColor(myStockBranchCode)}`}
                    >
                        <span className="min-[1500px]:hidden">
                            {STOCK_BRANCH_META[myStockBranchCode].shortLabel}
                        </span>
                        <span className="hidden min-[1500px]:inline">
                            {STOCK_BRANCH_META[myStockBranchCode].label}
                        </span>
                    </span>

                    <span
                        className={`text-sm font-bold tabular-nums ${myStockValue > 0
                            ? "text-gray-800 dark:text-white/90"
                            : "text-amber-600 dark:text-amber-400"
                            }`}
                    >
                        {item[STOCK_BRANCH_META[myStockBranchCode].stockKey]}
                    </span>

                    {myStockLocation && (
                        <span className="hidden min-w-0 truncate text-[10px] text-gray-500 dark:text-gray-400 2xl:inline">
                            Θέση{" "}
                            <span className="font-semibold text-gray-700 dark:text-gray-200">
                                {myStockLocation}
                            </span>
                        </span>
                    )}
                </span>
            )}

            <span className="flex min-w-0 flex-nowrap items-center gap-1.5 min-[1500px]:gap-2">
                {otherStockBranchCodes.map((branchCode) => {
                    const branchMeta = STOCK_BRANCH_META[branchCode];
                    const stockValue = item[branchMeta.stockKey];
                    const hasStock = Number(stockValue) > 0;

                    return (
                        <span
                            key={branchCode}
                            title={`${branchMeta.label}: ${stockValue ?? 0} τεμ.`}
                            className={`inline-flex items-center gap-1 ${hasStock ? "" : "opacity-50"}`}
                        >
                            <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${getBranchColor(branchCode)}`}
                            >
                                <span className="min-[1500px]:hidden">
                                    {branchMeta.shortLabel}
                                </span>
                                <span className="hidden min-[1500px]:inline">
                                    {branchMeta.label}
                                </span>
                            </span>
                            <span className="text-sm font-bold tabular-nums text-gray-700 dark:text-gray-200">
                                {stockValue}
                            </span>
                        </span>
                    );
                })}
            </span>
        </div>
    );

    return (
        <div className={`grid gap-2 ${showAnatrofCard ? "xl:grid-cols-[minmax(0,1fr)_17rem] min-[1800px]:grid-cols-[minmax(0,1fr)_25rem]" : ""}`}>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition dark:border-gray-800 dark:bg-white/[0.03]">
                <div
                    className={`flex w-full items-center gap-2 border-b px-3 py-2 transition-colors ${isInBasket
                        ? "border-gray-100 bg-green-50/80 hover:bg-green-100/70 dark:border-gray-800 dark:bg-green-500/10 dark:hover:bg-green-500/15"
                        : isExpanded
                            ? "border-brand-200 bg-brand-50/70 dark:border-brand-500/30 dark:bg-brand-500/10"
                            : "border-gray-100 bg-gray-50/80 hover:bg-brand-50/60 dark:border-gray-800 dark:bg-white/[0.02] dark:hover:bg-brand-500/5"
                        }`}
                >
                    {canSeeStatistics ? (
                        <button
                            type="button"
                            onClick={onOpenInsights}
                            disabled={!hasCustomer}
                            title={hasCustomer ? "Στατιστικά και ανταγωνισμός" : "Επιλέξτε πρώτα πελάτη"}
                            aria-label={`Στατιστικά και ανταγωνισμός για ${item.ITEM_CODE}`}
                            className="shrink-0 text-sm font-bold text-brand-600 transition hover:text-brand-700 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline dark:text-brand-400 dark:hover:text-brand-300 dark:disabled:text-gray-600"
                        >
                            {item.ITEM_CODE}
                        </button>
                    ) : (
                        <span className="shrink-0 text-sm font-bold text-brand-600 dark:text-brand-400">
                            {item.ITEM_CODE}
                        </span>
                    )}

                    <button
                        type="button"
                        onClick={canExpandDetails ? onToggleExpanded : undefined}
                        disabled={!canExpandDetails}
                        aria-expanded={canExpandDetails ? isExpanded : undefined}
                        aria-label={isExpanded ? "Απόκρυψη λεπτομερειών" : "Προβολή λεπτομερειών"}
                        className="group flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-default"
                    >
                        <div className="min-w-0 flex-1 overflow-hidden">
                            <div className="flex min-w-0 flex-nowrap items-center gap-x-2 overflow-hidden">
                            {(itemDescription || manufacturerDescription) && (
                                <span className="min-w-0 max-w-full flex-[0_1_auto] truncate text-sm text-gray-700 dark:text-gray-200">
                                    {itemDescription}
                                    {itemDescription && manufacturerDescription ? ", " : ""}
                                    {manufacturerDescription && (
                                        <span className="font-medium text-gray-800 dark:text-white/90">
                                            {manufacturerDescription}
                                        </span>
                                    )}
                                </span>
                            )}

                            <span
                                className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight ${statusBadgeClassName}`}
                            >
                                {item.STATUS_LABEL}
                            </span>

                            {isInBasket && basketItem && (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold leading-tight text-green-700 dark:bg-green-500/10 dark:text-green-400">
                                    <ShoppingCart className="h-3 w-3" />
                                    <span className="hidden min-[1500px]:inline">Στο καλάθι:</span>
                                    {getBasketItemQty(basketItem)}
                                    <span className="hidden sm:inline">τεμ.</span>
                                </span>
                            )}

                            {canSeeBranchStock && renderStockSummary("ml-auto flex min-w-0 shrink-0")}

                            </div>
                        </div>

                        {canExpandDetails && (
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition group-hover:border-brand-300 group-hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:group-hover:border-brand-500 dark:group-hover:text-brand-400">
                                <ChevronDown
                                    className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                                />
                            </span>
                        )}
                    </button>
                </div>

                <div className="p-3">
                    <div className="flex min-w-0 flex-col gap-2.5 md:flex-row md:items-start md:justify-between">
                        <div className="flex w-full min-w-0 max-w-[300px] items-center md:w-[clamp(9.5rem,24%,18.75rem)] md:max-w-none md:shrink-0">
                        </div>

                        {hasCustomer && (
                            <div className="flex min-w-0 shrink-0 flex-nowrap items-center gap-x-2 sm:gap-x-3 lg:gap-x-4 lg:justify-end">
                                {basketItem && canRequestPrice && !hasApprovedRequestedPrice && (
                                    <RequestPriceBox
                                        status={requestStatus}
                                        hasPriceRequest={hasPriceRequest}
                                        requestedPrice={requestedPrice}
                                        value={requestedPriceValue}
                                        onChange={onRequestedPriceValueChange}
                                        onSubmit={onRequestPrice}
                                        submitting={isSubmittingRequestPrice}
                                        prominent
                                    />
                                )}

                                {canSeePrices && (
                                <>
                                <div className="flex shrink-0 flex-col items-end gap-0.5">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                            {unitPriceLabel}
                                        </span>
                                        {hasApprovedRequestedPrice ? (
                                            <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                                                <span className="text-sm font-medium tabular-nums text-gray-400 line-through decoration-red-400 dark:text-gray-500">
                                                    {hasCustomer
                                                        ? formatCustomerSearchPrice(unitListPrice)
                                                        : formatPrice(unitListPrice)}
                                                </span>
                                                <span className="text-base font-bold tabular-nums text-green-700 dark:text-green-400">
                                                    {formatPrice(requestedPrice)}
                                                </span>
                                            </span>
                                        ) : (
                                            <span className="text-base font-bold tabular-nums text-gray-900 dark:text-white">
                                                {hasCustomer
                                                    ? formatCustomerSearchPrice(unitListPrice)
                                                    : formatPrice(unitListPrice)}
                                            </span>
                                        )}
                                    </div>

                                    {hasCustomer && (
                                        <div className="flex items-baseline gap-1.5 whitespace-nowrap text-gray-400 dark:text-gray-500">
                                            <span className="text-[10px] font-semibold uppercase tracking-wide">
                                                Λιανική
                                            </span>
                                            <span className="text-xs tabular-nums">
                                                {formatCustomerSearchPrice(item.PRICE_RETAIL)}
                                            </span>
                                            {locatedTier && (
                                                <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                                    Βαθμίδα {locatedTier}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                </div>

                                <div className="hidden h-6 w-px bg-gray-200 dark:bg-gray-700 sm:block" />
                                </>
                                )}

                                <div className="flex shrink-0 items-center gap-2.5">
                                    <div className="flex flex-col items-end leading-tight">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                            Ποσότητα
                                        </span>
                                        <span
                                            className={`text-[10px] font-medium tabular-nums ${isOutOfStock
                                                ? "text-red-600 dark:text-red-400"
                                                : "text-gray-400 dark:text-gray-500"}`}
                                        >
                                            {isOutOfStock
                                                ? "Μη διαθέσιμο"
                                                : `Διαθ.: ${availableStock}`}
                                        </span>
                                    </div>

                                    <QuantityControl
                                        value={qty}
                                        onChange={onQuantityChange}
                                        max={Math.max(1, availableStock)}
                                        disabled={isOutOfStock}
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={onAddToBasket}
                                    disabled={isBasketActionDisabled}
                                    title={isOutOfStock && !isBasketActionMuted
                                        ? "Το είδος δεν έχει απόθεμα στο κατάστημά σας"
                                        : undefined}
                                    className={basketActionClassName}
                                >
                                    {isAdding ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <ShoppingCart
                                            className={isBasketActionMuted
                                                ? "h-3.5 w-3.5 text-green-500 dark:text-green-300"
                                                : "h-3.5 w-3.5"}
                                        />
                                    )}

                                    <span>{basketActionLabel}</span>
                                </button>
                            </div>
                        )}
                    </div>

                </div>

                <PartCardDetails
                    item={item}
                    isExpanded={canExpandDetails && isExpanded}
                    formatPrice={formatPrice}
                    customer={customer}
                    showPrices={canSeePrices && !hasCustomer}
                />

            </div>

            {showAnatrofCard && (
                <PartStockQuantityContainer
                    mtrl={item.MTRL}
                    branchCode={currentBranchCode}
                    branchLabel={resolveBranchName(currentBranchCode)}
                    stock={storeStock}
                    quantity={storeOrderQty}
                    onQuantityChange={onStoreOrderQuantityChange}
                    onSubmitRequest={onSubmitStockRequest}
                    requestStatus={stockRequestStatus}
                    isSubmittingRequest={isSubmittingStockRequest}
                    requestError={stockRequestError}
                    endoRequest={endoRequest}
                />
            )}
        </div>
    );
}
