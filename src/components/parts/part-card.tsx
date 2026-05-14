import { BadgePercent, ChevronDown, Loader2, Send, ShoppingCart } from "@/lib/icons/lucide";
import {
    getBasketItemApprovalStatus,
    getBasketItemQty,
    getBasketItemRequestedPrice,
    hasBasketItemPriceRequest,
} from "@/lib/utils/basket-helpers";
import type { IBasketItem, IItem, StockRequestStatus } from "@/lib/interface";
import type { EndoBranchOption } from "@/components/endo/request-endo-card";
import QuantityControl from "@/components/ui/quantity-control";
import PartCardDetails from "./part-card-details";
import PartStockQuantityContainer from "../stock/request-stock-card";

type StockBranchCode = "1001" | "1006" | "1007";
type StockKey = "YP1001" | "YP1006" | "YP1007";
type LocationKey = "THESI1001" | "THESI1006" | "THESI1007";

const STOCK_BRANCH_CODES: StockBranchCode[] = ["1001", "1006", "1007"];

const STOCK_BRANCH_META: Record<
    StockBranchCode,
    { label: string; badgeClassName: string; stockKey: StockKey; locationKey: LocationKey }
> = {
    "1001": {
        label: "Ν.Κόσμος",
        badgeClassName:
            "rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
        stockKey: "YP1001",
        locationKey: "THESI1001",
    },
    "1006": {
        label: "Λ.Αθηνών",
        badgeClassName:
            "rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
        stockKey: "YP1006",
        locationKey: "THESI1006",
    },
    "1007": {
        label: "Λ.Μεσογείων",
        badgeClassName:
            "rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
        stockKey: "YP1007",
        locationKey: "THESI1007",
    },
};

const SECONDARY_BRANCH_PRIORITY: Record<StockBranchCode, number> = {
    "1006": 0,
    "1001": 1,
    "1007": 2,
};

function getStockBranchOrder(currentBranchCode: string) {
    const normalizedCurrentBranch = currentBranchCode.trim();

    if (!STOCK_BRANCH_CODES.includes(normalizedCurrentBranch as StockBranchCode)) {
        return STOCK_BRANCH_CODES;
    }

    const currentBranch = normalizedCurrentBranch as StockBranchCode;
    const remainingBranches = STOCK_BRANCH_CODES
        .filter((branchCode) => branchCode !== currentBranch)
        .sort((a, b) => SECONDARY_BRANCH_PRIORITY[a] - SECONDARY_BRANCH_PRIORITY[b]);

    return [currentBranch, ...remainingBranches];
}

interface PartEndoRequestProps {
    isActive: boolean;
    canStart: boolean;
    branches: EndoBranchOption[];
    error: string;
    successMessage: string;
    getRequestedQty: (branchCode: string) => number;
    onRequestedQtyChange: (branchCode: string, nextQuantity: number) => void;
    onStart: () => void;
    onCancel: () => void;
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
    const requestedPrice =
        basketItem != null
            ? getBasketItemRequestedPrice(basketItem)
            : null;
    const requestStatus =
        basketItem != null
            ? getBasketItemApprovalStatus(basketItem)
            : null;
    const hasPriceRequest =
        basketItem != null
            ? hasBasketItemPriceRequest(basketItem)
            : false;
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
    const hasManufacturerDescription = manufacturerDescription.length > 0;
    const primaryDescription = hasManufacturerDescription
        ? manufacturerDescription
        : itemDescription;
    const primaryDescriptionClassName = hasManufacturerDescription
        ? "min-w-0 text-sm font-medium text-gray-800 dark:text-white/90"
        : "min-w-0 text-xs text-gray-500";
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

    const hasSelectedQty = qty > 0;

    const basketActionClassName = isBasketActionMuted
        ? "group inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3.5 text-xs font-semibold text-green-700 transition disabled:cursor-not-allowed disabled:opacity-70 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-300"
        : hasSelectedQty
            ? "group inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3.5 text-xs font-semibold text-brand-700 shadow-xs transition hover:border-brand-300 hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/15"
            : "group inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 text-xs font-semibold text-gray-600 shadow-xs transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-300";

    const expandToggleButton = (
        <button
            type="button"
            onClick={onToggleExpanded}
            onKeyDown={(event) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                }
            }}
            aria-label={isExpanded ? "Απόκρυψη λεπτομερειών" : "Προβολή λεπτομερειών"}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
            <ChevronDown
                className={`h-4 w-4 transition-transform duration-100 ${isExpanded ? "rotate-180" : ""}`}
            />
        </button>
    );

    return (
        <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_228px]">

            <div
                className={`rounded-xl border transition hover:border-2 ${isInBasket
                    ? "border-green-400 bg-green-50 hover:bg-green-100 hover:border-green-500 dark:border-green-600 dark:bg-green-500/[0.06] dark:hover:bg-green-500/10 dark:hover:border-green-500"
                    : "border-gray-200 bg-white hover:bg-brand-100/40 hover:border-brand-500 dark:border-gray-800 dark:bg-white/[0.03]"
                    }`}
            >
                <div className="p-4">
                    <div className="flex items-start gap-3">
                        <div className="grid min-w-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                            <div className="min-w-0">
                                <button
                                    type="button"
                                    onClick={onToggleExpanded}
                                    className="flex flex-wrap items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                                >
                                    <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                                        {item.ITEM_CODE}
                                    </span>
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
                                </button>

                                <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={onToggleExpanded}
                                        className={`${primaryDescriptionClassName} text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40`}
                                    >
                                        {primaryDescription}
                                    </button>
                                    {expandToggleButton}
                                </div>

                                {hasManufacturerDescription && itemDescription && (
                                    <button
                                        type="button"
                                        onClick={onToggleExpanded}
                                        className="mt-0.5 block text-left text-xs text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                                    >
                                        {itemDescription}
                                    </button>
                                )}
                            </div>

                            {hasCustomer && (
                                <div className="grid min-w-0 gap-2 lg:justify-items-end">
                                    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 lg:justify-end">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                                Τιμή μονάδας
                                            </span>
                                            <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
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
                                        <div className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/90 px-2 py-2 dark:border-amber-500/20 dark:bg-amber-500/10 lg:w-auto lg:justify-end">
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                                                <BadgePercent className="h-3.5 w-3.5" />
                                                <span>Αίτημα τιμής</span>
                                            </div>

                                            {hasPriceRequest && requestedPrice != null && requestedPrice > 0 && (
                                                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                                                    {formatPrice(requestedPrice)}
                                                </span>
                                            )}

                                            {hasPriceRequest && (
                                                <span className={`text-[10px] font-semibold ${requestStatusClassName}`}>
                                                    {requestStatusLabel}
                                                </span>
                                            )}

                                            <input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={requestedPriceValue}
                                                onChange={(e) => onRequestedPriceValueChange(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        onRequestPrice();
                                                    }
                                                }}
                                                placeholder="Νέα τιμή..."
                                                className="h-8 w-32 rounded-md border border-amber-200 bg-white px-2 text-sm text-gray-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-amber-500/30 dark:bg-gray-900 dark:text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={onRequestPrice}
                                                disabled={isSubmittingRequestPrice || !requestedPriceValue || Number(requestedPriceValue) <= 0}
                                                className="flex h-8 items-center gap-1.5 rounded-md bg-amber-500 px-2.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                {isSubmittingRequestPrice ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Send className="h-3.5 w-3.5" />
                                                )}
                                                <span>Αίτημα</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-3 w-full rounded-xl border border-gray-200 bg-gray-50/70 p-3 text-left dark:border-gray-800 dark:bg-white/[0.02]">
                        <div className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                            Απόθεμα ανά κατάστημα
                        </div>

                        <div className="grid gap-2 sm:grid-cols-3">
                            {getStockBranchOrder(currentBranchCode).map((branchCode) => {
                                const branchMeta = STOCK_BRANCH_META[branchCode];
                                const stockValue = item[branchMeta.stockKey];
                                const locationValue = item[branchMeta.locationKey];
                                const normalizedLocation = String(locationValue ?? "").trim();

                                return (
                                    <div
                                        key={branchCode}
                                        className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs shadow-sm dark:bg-white/[0.04]"
                                    >
                                        <span className={branchMeta.badgeClassName}>
                                            {branchMeta.label}
                                        </span>
                                        <div className="text-right">
                                            <span className="font-semibold text-gray-800 dark:text-white">
                                                {stockValue}
                                            </span>
                                            {normalizedLocation && (
                                                <div className="text-[10px] text-gray-400">
                                                    {normalizedLocation}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <PartCardDetails
                    item={item}
                    isExpanded={isExpanded}
                    formatPrice={formatPrice}
                />

            </div>

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
        </div>
    );
}
