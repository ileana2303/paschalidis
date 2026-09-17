import { BadgePercent, ChevronDown, Loader2, ShoppingCart } from "@/lib/icons/lucide";
import { getBranchColor } from "@/lib/branch-colors";
import { getStockBranchOrder } from "@/lib/auth/branches";
import {
    getBasketItemApprovalStatus,
    getBasketItemBasePrice,
    getBasketItemQty,
    getBasketItemRequestedPrice,
    hasBasketItemPriceRequest,
} from "@/lib/utils/basket-helpers";
import type { IBasketItem, IItem, StockRequestStatus } from "@/lib/interface";
import type { EndoBranchOption } from "@/components/endo/request-endo-card";
import QuantityControl from "@/components/ui/quantity-control";
import RequestPriceBox from "@/components/ui/request-price-box";
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
    formatPrice,
    endoRequest,
}: PartResultsProps) {
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
            : Number(item.PRICE_WHOLE);
    const requestedPrice =
        basketItem != null && hasPriceRequest
            ? getBasketItemRequestedPrice(basketItem)
            : null;
    const hasRequestedPrice =
        requestedPrice != null &&
        requestedPrice > 0 &&
        Math.abs(requestedPrice - erpPrice) > 0.0001;
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
        ? "group inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3.5 text-xs font-semibold text-green-700 transition disabled:cursor-not-allowed disabled:opacity-70 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-300"
        : "group inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3.5 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-40";
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

    return (
        <div className={`grid gap-2 ${showStockRequestCard ? "xl:grid-cols-[minmax(0,1fr)_228px]" : ""}`}>

            <div
                className={`overflow-hidden rounded-xl border shadow-sm transition ${isInBasket
                    ? "border-green-400 bg-white hover:border-green-500 dark:border-green-600 dark:bg-white/[0.03] dark:hover:border-green-500"
                    : "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
                    }`}
            >
                <button
                    type="button"
                    onClick={onToggleExpanded}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? "Απόκρυψη λεπτομερειών" : "Προβολή λεπτομερειών"}
                    className={`group flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/40 ${isExpanded
                        ? "border-brand-200 bg-brand-50/70 dark:border-brand-500/30 dark:bg-brand-500/10"
                        : "border-gray-100 bg-gray-50/80 hover:bg-brand-50/60 dark:border-gray-800 dark:bg-white/[0.02] dark:hover:bg-brand-500/5"
                        }`}
                >
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                                {item.ITEM_CODE}
                            </span>

                            {(itemDescription || manufacturerDescription) && (
                                <span className="min-w-0 text-sm text-gray-700 dark:text-gray-200">
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

                            {basketItem && hasPriceRequest && (
                                <>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                                        <BadgePercent className="h-3 w-3" />
                                        Αίτημα: {formatPrice(requestedPrice)}
                                    </span>
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${requestStatusClassName}`}>
                                        {requestStatusLabel}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-center gap-0.5">
                        <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400 transition-colors group-hover:text-brand-500 dark:group-hover:text-brand-400">
                            {isExpanded ? "Κλείσιμο" : "Λεπτομέρειες"}
                        </span>
                        <span className="grid h-8 w-8 place-items-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition group-hover:border-brand-300 group-hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:group-hover:border-brand-500 dark:group-hover:text-brand-400">
                            <ChevronDown
                                className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                            />
                        </span>
                    </div>
                </button>

                <div className="p-4">
                    {hasCustomer && (
                        <div className="grid min-w-0 gap-2 lg:justify-items-end">
                            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 lg:justify-end">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        Τιμή μονάδας
                                    </span>
                                    <span className="text-base font-bold tabular-nums text-gray-900 dark:text-white">
                                        {formatPrice(item.PRICE_WHOLE)}
                                    </span>
                                </div>

                                <div className="hidden h-6 w-px bg-gray-200 dark:bg-gray-700 sm:block" />

                                <div className="flex items-center gap-2.5">
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

                            {basketItem && (
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
                                    stableWidth
                                />
                            )}
                        </div>
                    )}

                    <div className={`flex w-full flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-lg border border-gray-100 bg-gray-50/70 px-2.5 py-1.5 text-left dark:border-gray-800 dark:bg-white/[0.02] ${hasCustomer ? "mt-2.5" : ""}`}>
                        {myStockBranchCode && (
                            <span className="flex min-w-0 items-baseline gap-1.5">
                                <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${getBranchColor(myStockBranchCode)}`}
                                >
                                    {STOCK_BRANCH_META[myStockBranchCode].label}
                                </span>

                                <span
                                    className={`text-base font-bold tabular-nums ${myStockValue > 0
                                        ? "text-gray-800 dark:text-white/90"
                                        : "text-amber-600 dark:text-amber-400"
                                        }`}
                                >
                                    {item[STOCK_BRANCH_META[myStockBranchCode].stockKey]}
                                </span>

                                {myStockLocation && (
                                    <span className="min-w-0 truncate text-[11px] text-gray-500 dark:text-gray-400">
                                        Θέση{" "}
                                        <span className="font-semibold text-gray-700 dark:text-gray-200">
                                            {myStockLocation}
                                        </span>
                                    </span>
                                )}
                            </span>
                        )}

                        {myStockBranchCode && otherStockBranchCodes.length > 0 && (
                            <span className="h-4 w-px shrink-0 bg-gray-200 dark:bg-gray-700" />
                        )}

                        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                            {otherStockBranchCodes.map((branchCode) => {
                                const branchMeta = STOCK_BRANCH_META[branchCode];
                                const stockValue = item[branchMeta.stockKey];
                                const hasStock = Number(stockValue) > 0;

                                return (
                                    <span
                                        key={branchCode}
                                        title={`${branchMeta.label}: ${stockValue ?? 0} τεμ.`}
                                        className={`inline-flex items-center gap-1.5 ${hasStock ? "" : "opacity-50"}`}
                                    >
                                        <span
                                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${getBranchColor(branchCode)}`}
                                        >
                                            {branchMeta.label}
                                        </span>
                                        <span className="text-base font-bold tabular-nums text-gray-700 dark:text-gray-200">
                                            {stockValue}
                                        </span>
                                    </span>
                                );
                            })}
                        </span>
                    </div>
                </div>

                <PartCardDetails
                    item={item}
                    isExpanded={isExpanded}
                    formatPrice={formatPrice}
                />

            </div>

            {showStockRequestCard && (
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
