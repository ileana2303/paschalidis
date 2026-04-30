"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dispatch, RefObject, SetStateAction, UIEvent } from "react";
import type { ExternalLoginUserAccount } from "@/lib/auth/types";
import type { IItem, StockRequestStatus } from "@/app/lib/interface";
import type { EndoBasketUiItem } from "@/components/endo/endo-order-summary";
import type { EndoBranchOption } from "@/components/endo/endo-part-results";
import {
    getBranchCodesFromItem,
    getEndoItemKey,
    getEndoQtyKey,
} from "@/hooks/search-parts/search-parts-endo-utils";
import {
    getItemFieldValue,
    parseAvailableStock,
    parseStockValue,
} from "@/hooks/search-parts/search-parts-stock-utils";

export interface ResetScopedResultsStateOptions {
    resetScroll?: boolean;
}

interface UseSearchPartsResultsStateParams {
    user: ExternalLoginUserAccount | null;
    items: IItem[];
    hasMounted: boolean;
    resultsContainerRef: RefObject<HTMLDivElement | null>;
}

export interface SearchPartsResultsState {
    sidebarVisible: boolean;
    hasScrolledResults: boolean;
    isResultsScrollable: boolean | null;
    isEndoMode: boolean;
    expandedItems: Set<string>;
    endoQuantities: Record<string, number>;
    endoBasketItems: EndoBasketUiItem[];
    addingToEndoBasket: Set<string>;
    endoSummaryLoading: boolean;
    endoBasketError: string;
    endoBasketSuccess: string;
    currentBranchCode: string;
    currentBranchName: string;
    hasValidBranch: boolean;
    stockRequestStatuses: Record<string, StockRequestStatus>;
    stockRequestErrors: Record<string, string>;
    submittingStockRequests: Set<string>;
    areAllResultsExpanded: boolean;
    getExpandedItemKey: (item: IItem) => string;
    getStoreStock: (item: IItem) => number;
    getStoreOrderQuantity: (mtrl: string) => number;
    getEndoRequestedQty: (mtrl: string | number, sourceBranch: string) => number;
    getEndoBranchOptions: (item: IItem) => EndoBranchOption[];
    prepareForSearch: () => void;
    resetScopedResultsState: (options?: ResetScopedResultsStateOptions) => void;
    setStoreOrderQuantity: (mtrl: string, qty: number) => void;
    setEndoRequestedQty: (mtrl: string | number, sourceBranch: string, next: number) => void;
    toggleExpanded: (itemKey: string) => void;
    toggleAllExpanded: () => void;
    handleResultsScroll: (event: UIEvent<HTMLDivElement>) => void;
    handleToggleSidebarVisibility: () => void;
    setIsEndoMode: Dispatch<SetStateAction<boolean>>;
    setExpandedItems: Dispatch<SetStateAction<Set<string>>>;
    setEndoBasketItems: Dispatch<SetStateAction<EndoBasketUiItem[]>>;
    setAddingToEndoBasket: Dispatch<SetStateAction<Set<string>>>;
    setEndoSummaryLoading: Dispatch<SetStateAction<boolean>>;
    setEndoBasketError: Dispatch<SetStateAction<string>>;
    setEndoBasketSuccess: Dispatch<SetStateAction<string>>;
    setStockRequestStatuses: Dispatch<SetStateAction<Record<string, StockRequestStatus>>>;
    setStockRequestErrors: Dispatch<SetStateAction<Record<string, string>>>;
    setSubmittingStockRequests: Dispatch<SetStateAction<Set<string>>>;
}

export function useSearchPartsResultsState({
    user,
    items,
    hasMounted,
    resultsContainerRef,
}: UseSearchPartsResultsStateParams): SearchPartsResultsState {
    const [hasScrolledResults, setHasScrolledResults] = useState(false);
    const [isResultsScrollable, setIsResultsScrollable] = useState<boolean | null>(null);
    const [sidebarVisible, setSidebarVisible] = useState(true);
    const [isEndoMode, setIsEndoMode] = useState(false);
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const [storeOrderQuantities, setStoreOrderQuantities] = useState<Record<string, number>>({});
    const [stockRequestStatuses, setStockRequestStatuses] = useState<Record<string, StockRequestStatus>>({});
    const [stockRequestErrors, setStockRequestErrors] = useState<Record<string, string>>({});
    const [submittingStockRequests, setSubmittingStockRequests] = useState<Set<string>>(new Set());
    const [endoQuantities, setEndoQuantities] = useState<Record<string, number>>({});
    const [endoBasketItems, setEndoBasketItems] = useState<EndoBasketUiItem[]>([]);
    const [addingToEndoBasket, setAddingToEndoBasket] = useState<Set<string>>(new Set());
    const [endoSummaryLoading, setEndoSummaryLoading] = useState(false);
    const [endoBasketError, setEndoBasketError] = useState("");
    const [endoBasketSuccess, setEndoBasketSuccess] = useState("");

    const currentBranchCode = useMemo(
        () => String(user?.s1code ?? "").trim(),
        [user?.s1code]
    );
    const hasValidBranch = currentBranchCode.length > 0;

    const currentBranchName = useMemo(() => {
        if (!hasValidBranch) {
            return "—";
        }

        const normalizedCurrent = String(currentBranchCode).trim();
        const fromProfile = user?.listBranches?.find(
            (branch) => String(branch.s1Code ?? "").trim() === normalizedCurrent
        )?.name;
        const normalizedProfileName = String(fromProfile ?? "").trim();

        if (normalizedProfileName) {
            return normalizedProfileName;
        }

        return normalizedCurrent;
    }, [currentBranchCode, hasValidBranch, user?.listBranches]);

    useEffect(() => {
        const updateScrollability = () => {
            const container = resultsContainerRef.current;

            if (!container) {
                return;
            }

            setIsResultsScrollable(container.scrollHeight > container.clientHeight + 1);
        };

        updateScrollability();
        window.addEventListener("resize", updateScrollability);

        return () => {
            window.removeEventListener("resize", updateScrollability);
        };
    }, [hasMounted, isEndoMode, items.length, resultsContainerRef]);

    const getExpandedItemKey = useCallback((item: IItem) => {
        return isEndoMode ? getEndoItemKey(item) : item.ITEM_CODE;
    }, [isEndoMode]);

    const areAllResultsExpanded = useMemo(() => {
        return items.length > 0 && items.every((item) => expandedItems.has(getExpandedItemKey(item)));
    }, [expandedItems, getExpandedItemKey, items]);

    const toggleExpanded = useCallback((itemKey: string) => {
        setExpandedItems((prev) => {
            const next = new Set(prev);
            if (next.has(itemKey)) next.delete(itemKey);
            else next.add(itemKey);
            return next;
        });
    }, []);

    const toggleAllExpanded = useCallback(() => {
        setExpandedItems((prev) => {
            const next = new Set(prev);

            if (areAllResultsExpanded) {
                items.forEach((item) => next.delete(getExpandedItemKey(item)));
            } else {
                items.forEach((item) => next.add(getExpandedItemKey(item)));
            }

            return next;
        });
    }, [areAllResultsExpanded, getExpandedItemKey, items]);

    const handleResultsScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
        const scrollTop = event.currentTarget.scrollTop;

        if (scrollTop > 0) {
            setHasScrolledResults(true);
        }
    }, []);

    const handleToggleSidebarVisibility = useCallback(() => {
        setSidebarVisible((visible) => !visible);
    }, []);

    const getStoreStock = useCallback((item: IItem) => {
        if (!hasValidBranch) {
            return 0;
        }

        return parseStockValue(getItemFieldValue(item, `YP${currentBranchCode}`));
    }, [currentBranchCode, hasValidBranch]);

    const getStoreOrderQuantity = useCallback((mtrl: string) => {
        return storeOrderQuantities[mtrl] ?? 0;
    }, [storeOrderQuantities]);

    const setStoreOrderQuantity = useCallback((mtrl: string, qty: number) => {
        setStoreOrderQuantities((prev) => ({ ...prev, [mtrl]: qty }));
    }, []);

    const getEndoRequestedQty = useCallback((mtrl: string | number, sourceBranch: string) => {
        return endoQuantities[getEndoQtyKey(mtrl, sourceBranch)] ?? 0;
    }, [endoQuantities]);

    const setEndoRequestedQty = useCallback((
        mtrl: string | number,
        sourceBranch: string,
        next: number
    ) => {
        const qtyKey = getEndoQtyKey(mtrl, sourceBranch);
        const normalizedQty = Number.isFinite(next) ? Math.max(0, Math.floor(next)) : 0;

        setEndoQuantities((prev) => {
            if (normalizedQty <= 0) {
                if (!(qtyKey in prev)) {
                    return prev;
                }

                const copy = { ...prev };
                delete copy[qtyKey];
                return copy;
            }

            return {
                ...prev,
                [qtyKey]: normalizedQty,
            };
        });
    }, []);

    const getEndoBranchOptions = useCallback((item: IItem): EndoBranchOption[] => {
        const branchCodes = new Set<string>(getBranchCodesFromItem(item));

        (user?.listBranches ?? []).forEach((branch) => {
            const code = String(branch.s1Code ?? "").trim();
            if (code) {
                branchCodes.add(code);
            }
        });

        if (hasValidBranch) {
            branchCodes.add(currentBranchCode);
        }

        return Array.from(branchCodes)
            .sort((a, b) => Number(a) - Number(b))
            .map((code) => {
                const labelFromProfile = user?.listBranches?.find(
                    (branch) => String(branch.s1Code ?? "").trim() === code
                )?.name;
                const label = String(labelFromProfile ?? "").trim() || code;
                const location =
                    String(getItemFieldValue(item, `THESI${code}`) ?? "").trim() || "-";

                return {
                    code,
                    label,
                    stock: parseAvailableStock(getItemFieldValue(item, `YP${code}`)),
                    location,
                    isCurrent: currentBranchCode === code,
                };
            });
    }, [currentBranchCode, hasValidBranch, user?.listBranches]);

    const resetScopedResultsState = useCallback((
        options?: ResetScopedResultsStateOptions
    ) => {
        const shouldResetScroll = options?.resetScroll ?? false;

        setExpandedItems(new Set());
        setIsEndoMode(false);
        setEndoQuantities({});
        setEndoBasketItems([]);
        setEndoBasketError("");
        setEndoBasketSuccess("");

        if (shouldResetScroll) {
            setHasScrolledResults(false);
        }
    }, []);

    const prepareForSearch = useCallback(() => {
        setEndoBasketSuccess("");
        setEndoQuantities({});
    }, []);

    return {
        sidebarVisible,
        hasScrolledResults,
        isResultsScrollable,
        isEndoMode,
        expandedItems,
        endoQuantities,
        endoBasketItems,
        addingToEndoBasket,
        endoSummaryLoading,
        endoBasketError,
        endoBasketSuccess,
        currentBranchCode,
        currentBranchName,
        hasValidBranch,
        stockRequestStatuses,
        stockRequestErrors,
        submittingStockRequests,
        areAllResultsExpanded,
        getExpandedItemKey,
        getStoreStock,
        getStoreOrderQuantity,
        getEndoRequestedQty,
        getEndoBranchOptions,
        prepareForSearch,
        resetScopedResultsState,
        setStoreOrderQuantity,
        setEndoRequestedQty,
        toggleExpanded,
        toggleAllExpanded,
        handleResultsScroll,
        handleToggleSidebarVisibility,
        setIsEndoMode,
        setExpandedItems,
        setEndoBasketItems,
        setAddingToEndoBasket,
        setEndoSummaryLoading,
        setEndoBasketError,
        setEndoBasketSuccess,
        setStockRequestStatuses,
        setStockRequestErrors,
        setSubmittingStockRequests,
    };
}
