import { BadgePercent, ChartColumn, ChevronDown, Loader2, ShoppingCart } from "@/lib/icons/lucide";
import { getBranchColor } from "@/lib/branch-colors";
import { getStockBranchOrder } from "@/lib/auth/branches";
import {
    getBasketItemApprovalStatus,
    getBasketItemBasePrice,
    getBasketItemQty,
    getBasketItemRequestedPrice,
    hasBasketItemPriceRequest,
} from "@/lib/utils/basket-helpers";
import type { IBasketItem, ICustomerInfo, IItem, StockRequestStatus } from "@/lib/interface";
import {
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
    { label: string; stockKey: StockKey; locationKey: LocationKey }
> = {
    "1000": {
        label: "Κασομούλη",
        stockKey: "YP1000",
        locationKey: "THESI1000",
    },
    "1006": {
        label: "Λ.Αθηνών",
        stockKey: "YP1006",
        locationKey: "THESI1006",
    },
    "1007": {
        label: "Λ.Μεσογείων",
        stockKey: "YP1007",
        locationKey: "THESI1007",
    },
};

interface PartEndoRequestProps {
    isOpen: boolean;
    canStart: boolean;
    branches: EndoBranchOption[];
    error: string;
    successMessage: string;
    getRequestedQty: (branchCode: string) => number;
    onRequestedQtyChange: (branchCode: string, nextQuantity: number) => void;
    pendingQtyByBranch?: Record<string, number>;
    onToggle: () => void;
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
    const requestStatusLabel =
        requestStatus === "approved"
            ? "Accepted"
            : requestStatus === "rejected"
                ? "Rejected"
                : "Pending";
    const requestStatusClassName =
        requestStatus === "approved"
            ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
            : requestStatus === "rejected"
                ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
    const manufacturerDescription = String(item.MNF_DESCR ?? "").trim();
    const itemDescription = String(item.ITEM_DESCR ?? "").trim();
    const unitListPrice = getCustomerUnitListPrice(item, customer);
    const unitPriceLabel = getCustomerUnitPriceLabel(customer);
    const basketQuantity = basketItem != null
        ? Math.max(1, getBasketItemQty(basketItem))
        : null;
    const hasUnsavedBasketQuantity = basketQuantity != null && qty !== basketQuantity;
    const isBasketActionMuted = basketItem != null && !hasUnsavedBasketQuantity;
    const isBasketActionDisabled = isAdding || isBasketActionMuted;
    const basketActionLabel = isAdding
        ? basketItem != null
            ? "Ενημέρωση..."
            : "Προσθήκη..."
        : isBasketActionMuted
            ? "Στο καλάθι"
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
            className={`min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-left ${className}`}
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
                        {STOCK_BRANCH_META[myStockBranchCode].label}
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

            <span className="flex min-w-0 flex-wrap items-center gap-2">
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
                                {branchMeta.label}
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
        <div className={`grid gap-2 ${showAnatrofCard ? "xl:grid-cols-[minmax(0,1fr)_228px]" : ""}`}>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition dark:border-gray-800 dark:bg-white/[0.03]">
                <button
                    type="button"
                    onClick={canExpandDetails ? onToggleExpanded : undefined}
                    disabled={!canExpandDetails}
                    aria-expanded={canExpandDetails ? isExpanded : undefined}
                    aria-label={isExpanded ? "Απόκρυψη λεπτομερειών" : "Προβολή λεπτομερειών"}
                    className={`group flex w-full items-center gap-3 border-b px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/40 ${isInBasket
                        ? "border-gray-100 bg-green-50/80 hover:bg-green-100/70 dark:border-gray-800 dark:bg-green-500/10 dark:hover:bg-green-500/15"
                        : isExpanded
                            ? "border-brand-200 bg-brand-50/70 dark:border-brand-500/30 dark:bg-brand-500/10"
                            : "border-gray-100 bg-gray-50/80 hover:bg-brand-50/60 dark:border-gray-800 dark:bg-white/[0.02] dark:hover:bg-brand-500/5"
                        }`}
                >
                    <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="shrink-0 text-sm font-bold text-brand-600 dark:text-brand-400">
                                {item.ITEM_CODE}
                            </span>

                            {(itemDescription || manufacturerDescription) && (
                                <span className="min-w-0 flex-1 truncate text-sm text-gray-700 dark:text-gray-200">
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
                                    Στο καλάθι: {getBasketItemQty(basketItem)} τεμ.
                                </span>
                            )}

                            {basketItem && hasPriceRequest && canSeePrices && (
                                <span
                                    title={`Κατάσταση αιτήματος: ${requestStatusLabel}`}
                                    aria-label={`Αίτημα ${formatPrice(requestedPrice)}, κατάσταση ${requestStatusLabel}`}
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${requestStatusClassName}`}
                                >
                                    <BadgePercent className="h-3 w-3" />
                                    Αίτημα: {formatPrice(requestedPrice)}
                                </span>
                            )}
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

                <div className="p-3">
                    <div className="flex min-w-0 flex-col gap-2.5 md:flex-row md:items-start md:justify-between">
                        <div className="w-full min-w-0 max-w-[300px] md:w-[clamp(9.5rem,24%,18.75rem)] md:max-w-none md:shrink-0">
                            {canSeeStatistics && (
                            <button
                                type="button"
                                onClick={onOpenInsights}
                                disabled={!hasCustomer}
                                title={hasCustomer ? "Προβολή ιστορικού και ανταγωνισμού" : "Επιλέξτε πρώτα πελάτη"}
                                aria-label="Προβολή ιστορικού αγορών και ανταγωνισμού"
                                className="group inline-flex h-8 min-w-0 w-full items-center gap-2 rounded-lg border border-gray-200 bg-white p-0.5 pr-3 text-xs font-semibold text-gray-700 shadow-xs transition-all hover:-translate-y-px hover:border-brand-300 hover:text-brand-700 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:shadow-none disabled:hover:translate-y-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-brand-500/60 dark:hover:text-brand-300 dark:disabled:border-gray-800 dark:disabled:bg-white/[0.02] dark:disabled:text-gray-600"
                            >
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-400 dark:group-hover:bg-brand-500/25 group-disabled:bg-gray-100 group-disabled:text-gray-400 dark:group-disabled:bg-gray-800 dark:group-disabled:text-gray-600">
                                    <ChartColumn className="h-4 w-4" />
                                </span>
                                <span className="min-w-0 truncate">Στατιστικά</span>
                            </button>
                            )}

                        </div>

                        {hasCustomer && (
                            <div className="flex min-w-0 shrink-0 flex-nowrap items-center gap-x-2 sm:gap-x-3 lg:gap-x-4 lg:justify-end">
                                {canSeePrices && (
                                <>
                                <div className="flex shrink-0 items-baseline gap-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        {unitPriceLabel}
                                    </span>
                                    {hasApprovedRequestedPrice ? (
                                        <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                                            <span className="text-sm font-medium tabular-nums text-gray-400 line-through decoration-red-400 dark:text-gray-500">
                                                {formatPrice(unitListPrice)}
                                            </span>
                                            <span className="text-base font-bold tabular-nums text-green-700 dark:text-green-400">
                                                {formatPrice(requestedPrice)}
                                            </span>
                                        </span>
                                    ) : (
                                        <span className="text-base font-bold tabular-nums text-gray-900 dark:text-white">
                                            {formatPrice(unitListPrice)}
                                        </span>
                                    )}
                                </div>

                                <div className="hidden h-6 w-px bg-gray-200 dark:bg-gray-700 sm:block" />
                                </>
                                )}

                                <div className="flex shrink-0 items-center gap-2.5">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        Ποσότητα
                                    </span>

                                    <QuantityControl
                                        value={qty}
                                        onChange={onQuantityChange}
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={onAddToBasket}
                                    disabled={isBasketActionDisabled}
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

                    {(canSeeBranchStock || (basketItem && canRequestPrice)) && (
                    <div className="mt-2 flex min-w-0 flex-col gap-2 border-t border-gray-100 pt-2 dark:border-gray-800 lg:flex-row lg:items-center">
                        {canSeeBranchStock && renderStockSummary("flex min-w-0 flex-1")}

                        {basketItem && canRequestPrice && (
                            <RequestPriceBox
                                status={requestStatus}
                                hasPriceRequest={hasPriceRequest}
                                hasRequestedPrice={hasRequestedPrice}
                                requestedPrice={requestedPrice}
                                value={requestedPriceValue}
                                onChange={onRequestedPriceValueChange}
                                onSubmit={onRequestPrice}
                                submitting={isSubmittingRequestPrice}
                                formatPrice={(price) => formatPrice(price)}
                                className="shrink-0"
                            />
                        )}
                    </div>
                    )}
                </div>

                <PartCardDetails
                    item={item}
                    isExpanded={canExpandDetails && isExpanded}
                    formatPrice={formatPrice}
                    customer={customer}
                    showPrices={canSeePrices}
                />

            </div>

            {showAnatrofCard && (
                <PartStockQuantityContainer
                    mtrl={item.MTRL}
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
