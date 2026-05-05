import { BadgePercent, ChevronDown, Loader2, Minus, Plus, Send, ShoppingCart } from "@/lib/icons/lucide";
import {
    getBasketItemApprovalStatus,
    getBasketItemQty,
    getBasketItemRequestedPrice,
    hasBasketItemDiscount,
} from "@/lib/utils/basket-helpers";
import type { IBasketItem, IItem, StockRequestStatus } from "@/lib/interface";
import PartStockQuantityContainer from "./part-stock-quantity-container";
import { useEffect, useState } from "react";

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
    discountValue: string;
    isSubmittingRequestPrice: boolean;
    onToggleExpanded: () => void;
    onQuantityChange: (nextQty: number) => void;
    onAddToBasket: () => void;
    onDiscountValueChange: (value: string) => void;
    onRequestDiscount: () => void;
    onStoreOrderQuantityChange: (nextQuantity: number) => void;
    onSubmitStockRequest: () => void;
    formatPrice: (price: number | string | null | undefined) => string;
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
    discountValue,
    isSubmittingRequestPrice,
    onToggleExpanded,
    onQuantityChange,
    onAddToBasket,
    onDiscountValueChange,
    onRequestDiscount,
    onStoreOrderQuantityChange,
    onSubmitStockRequest,
    formatPrice,
}: PartResultsProps) {
    const [quantityInput, setQuantityInput] = useState(String(qty));
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
            ? hasBasketItemDiscount(basketItem)
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

    useEffect(() => {
        setQuantityInput(String(qty));
    }, [qty]);

    const handleQuantityInputChange = (value: string) => {
        const nextValue = value.replace(/\D/g, "");
        setQuantityInput(nextValue);

        if (nextValue === "") {
            return;
        }

        onQuantityChange(Math.max(1, Number(nextValue)));
    };

    const handleQuantityInputBlur = () => {
        if (quantityInput === "") {
            setQuantityInput("1");
            onQuantityChange(1);
        }
    };

    return (
        <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_228px]">
            <div
                className={`rounded-xl border transition hover:border-2 ${isInBasket
                    ? "border-green-400 bg-green-50 hover:bg-green-100 hover:border-green-500 dark:border-green-600 dark:bg-green-500/[0.06] dark:hover:bg-green-500/10 dark:hover:border-green-500"
                    : "border-gray-200 bg-white hover:bg-brand-100/40 hover:border-brand-500 dark:border-gray-800 dark:bg-white/[0.03]"
                    }`}
            >
                <button
                    type="button"
                    onClick={onToggleExpanded}
                    className="flex w-full items-start gap-3 p-4 text-left"
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

                            {isInBasket && (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold leading-tight text-green-700 dark:bg-green-500/10 dark:text-green-400">
                                    <ShoppingCart className="h-3 w-3" />
                                    Στο καλάθι
                                </span>
                            )}
                        </div>
                        <p className="mt-0.5 text-sm font-medium text-gray-800 dark:text-white/90">
                            {item.MNF_DESCR}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                            {item.ITEM_DESCR}
                        </p>
                        {basketItem && hasPriceRequest && (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                                    <BadgePercent className="h-3 w-3" />
                                    Αίτημα: {formatPrice(requestedPrice)}
                                </span>
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${requestStatusClassName}`}>
                                    {requestStatusLabel}
                                </span>
                            </div>
                        )}

                        <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-white/[0.02]">
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

                    <ChevronDown
                        className={`mt-1 h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                    />
                </button>

                <div
                    className={`overflow-hidden transition-all duration-200 ${isExpanded ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0"
                        }`}
                >
                    <div className="border-t border-gray-100 px-4 py-4 text-sm dark:border-gray-800">
                        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                                <div className="text-[10px] text-gray-400">Δεσμ. Καλαθιού</div>
                                <div className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                                    {item.BasketReserved}
                                </div>
                            </div>

                            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
                                <div className="text-[10px] text-gray-400">Παραγγελίες</div>
                                <div className="font-semibold tabular-nums">{item.SoOrdered}</div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                Κωδικοί
                            </div>

                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Κωδ. 2</span>
                                    <span className="font-medium text-gray-800 dark:text-white">{item.ITEM_CODE2}</span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-gray-400">Ομοιος</span>
                                    <span className="font-medium text-gray-800 dark:text-white">{item.ITEM_OMOIO || "—"}</span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-gray-400">CODE1_0</span>
                                    <span className="font-medium text-gray-800 dark:text-white">{item.CODE1_0 || "—"}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mb-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                            <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                Κατάσταση Αποθέματος
                            </div>

                            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Σε εξέλιξη</span>
                                    <span className="font-medium text-gray-800 dark:text-white">{item.ONGOING}</span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-gray-400">Καθαρή Διαθ.</span>
                                    <span className="font-semibold tabular-nums text-gray-900 dark:text-white">
                                        {item.NET_QTY_AVAILABLE}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mb-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                            <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                Παραγγελίες
                            </div>

                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Παραγγελθέντα</span>
                                    <span className="font-medium text-gray-800 dark:text-white">{item.SoOrdered}</span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-gray-400">Δεσμευμένα</span>
                                    <span className="font-medium text-gray-800 dark:text-white">{item.SoReserved}</span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-gray-400">Κατάσταση</span>
                                    <span className="font-medium text-gray-800 dark:text-white">{item.STATUS_MOBILE || "—"}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mb-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                            <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                Καλάθι
                            </div>

                            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Ποσότητα</span>
                                    <span className="font-medium text-gray-800 dark:text-white">{item.BASKET_QTY}</span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-gray-400">Ημ/νία</span>
                                    <span className="text-gray-500">
                                        {item.BASKET_DATE !== "1900-01-01 00:00:00"
                                            ? item.BASKET_DATE
                                            : "—"}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-gray-400">Req. Τιμή</span>
                                    <span className="font-medium text-gray-800 dark:text-white">
                                        {formatPrice(item.BASKET_REQ_PRICE)}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-gray-400">ERP Τιμή</span>
                                    <span className="font-medium text-gray-800 dark:text-white">
                                        {formatPrice(item.BASKET_ERP_PRICE)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
                            <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                Τιμές
                            </div>

                            {item.PRICE_MESSAGE && item.PRICE_MESSAGE !== "0" && (
                                <div className="mb-2 rounded-md bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                                    {item.PRICE_MESSAGE}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Χονδρική</span>
                                    <span>{formatPrice(item.PRICE_WHOLE)}</span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-gray-400">Λιανική</span>
                                    <span className="font-semibold">{formatPrice(item.PRICE_RETAIL)}</span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-gray-400">Κόστος</span>
                                    <span>{formatPrice(item.STANDCOST)}</span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-gray-400">Τιμοκ. 01</span>
                                    <span>{formatPrice(item.PRICER01)}</span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-gray-400">Τιμοκ. 02</span>
                                    <span>{formatPrice(item.PRICER02)}</span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-gray-400">Τιμοκ. 03</span>
                                    <span>{formatPrice(item.PRICER03)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {hasCustomer && (
                    <div className="border-t border-gray-100 dark:border-gray-800">
                        {basketItem && (
                            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                                <div className="mb-2 flex items-center gap-2">
                                    <BadgePercent className="h-4 w-4 text-amber-500" />
                                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                        Αίτημα Τιμής
                                    </p>
                                    {hasPriceRequest && requestedPrice != null && requestedPrice > 0 && (
                                        <span className="ml-auto text-xs font-medium text-amber-700 dark:text-amber-400">
                                            Αίτημα: {formatPrice(requestedPrice)}
                                        </span>
                                    )}
                                    {hasPriceRequest && (
                                        <span className={`text-[10px] font-semibold ${requestStatusClassName}`}>
                                            {requestStatusLabel}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={discountValue}
                                        onChange={(e) => onDiscountValueChange(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                onRequestDiscount();
                                            }
                                        }}
                                        placeholder="Νέα τιμή..."
                                        className="h-9 w-36 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={onRequestDiscount}
                                        disabled={isSubmittingRequestPrice || !discountValue || Number(discountValue) <= 0}
                                        className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-medium text-white shadow-sm transition-all duration-200 hover:bg-amber-600 disabled:opacity-40"
                                    >
                                        {isSubmittingRequestPrice ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Send className="h-3.5 w-3.5" />
                                        )}
                                        <span>Αίτημα</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-3 px-4 py-3">
                            <div className="inline-flex items-center overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900/40">
                                <button
                                    type="button"
                                    onClick={() => onQuantityChange(qty - 1)}
                                    disabled={qty <= 1}
                                    aria-label="Μείωση ποσότητας"
                                    className="flex h-10 w-10 items-center justify-center text-gray-500 transition-colors hover:bg-brand-50 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent dark:text-gray-300 dark:hover:bg-brand-500/10 dark:hover:text-brand-300 dark:disabled:text-gray-600"
                                >
                                    <Minus className="h-4 w-4" />
                                </button>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={quantityInput}
                                    onChange={(e) => handleQuantityInputChange(e.target.value)}
                                    onBlur={handleQuantityInputBlur}
                                    onFocus={(e) => e.target.select()}
                                    className="h-10 w-14 border-x border-gray-200 bg-gray-50/70 text-center text-sm font-semibold text-gray-800 outline-none transition-colors focus:bg-white focus:ring-2 focus:ring-inset focus:ring-brand-500/40 dark:border-gray-700 dark:bg-gray-800/70 dark:text-white dark:focus:bg-gray-900 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => onQuantityChange(qty + 1)}
                                    aria-label="Αύξηση ποσότητας"
                                    className="flex h-10 w-10 items-center justify-center text-gray-500 transition-colors hover:bg-brand-50 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 dark:text-gray-300 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={onAddToBasket}
                                disabled={isAdding}
                                className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-brand-600 hover:shadow-md disabled:opacity-60"
                            >
                                {isAdding ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <ShoppingCart className="h-4 w-4" />
                                )}
                                <span className="hidden sm:inline">Προσθήκη</span>
                            </button>

                            <span className="ml-auto text-xs font-semibold text-gray-600 dark:text-gray-400">
                                {formatPrice(item.PRICE_WHOLE)}
                            </span>
                        </div>
                        {basketItem && (
                            <div className="border-t border-gray-100 px-4 py-2 text-xs text-green-700 dark:border-gray-800 dark:text-green-400">
                                Ήδη στο καλάθι: {getBasketItemQty(basketItem)} τεμ.
                            </div>
                        )}
                    </div>
                )}
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
            />
        </div>
    );
}
