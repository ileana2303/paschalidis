"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dispatch, RefObject, SetStateAction, UIEvent } from "react";
import type { ExternalLoginUserAccount } from "@/lib/auth/types";
import type { IItem, StockRequestStatus } from "@/lib/interface";
import type { EndoBranchOption } from "@/components/endo/request-endo-card";
import {
    getBranchCodesFromItem,
    getEndoItemKey,
    getEndoQtyKey,
} from "@/hooks/search-parts/search-parts-endo-utils";
import { normalizeBranchCode, resolveBranchName } from "@/lib/auth/branches";
import {
    getItemFieldValue,
    parseAvailableStock,
    parseStockValue,
} from "@/hooks/search-parts/search-parts-stock-utils";

interface ResetScopedResultsStateOptions {
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
    stockRequestCardsVisible: boolean;
    hasScrolledResults: boolean;
    isResultsScrollable: boolean | null;
    activeEndoItemKey: string | null;
    expandedItems: Set<string>;
    endoQuantities: Record<string, number>;
    endoPendingQuantities: Record<string, number>;
    addingToEndoBasket: Set<string>;
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
    getEndoPendingQty: (mtrl: string | number, sourceBranch: string) => number;
    getEndoBranchOptions: (item: IItem) => EndoBranchOption[];
    prepareForSearch: () => void;
    resetScopedResultsState: (options?: ResetScopedResultsStateOptions) => void;
    setStoreOrderQuantity: (mtrl: string, qty: number) => void;
    setEndoRequestedQty: (mtrl: string | number, sourceBranch: string, next: number) => void;
    toggleExpanded: (itemKey: string) => void;
    toggleAllExpanded: () => void;
    toggleStockRequestCardsVisibility: () => void;
    handleResultsScroll: (event: UIEvent<HTMLDivElement>) => void;
    handleToggleSidebarVisibility: () => void;
    setActiveEndoItemKey: Dispatch<SetStateAction<string | null>>;
    setExpandedItems: Dispatch<SetStateAction<Set<string>>>;
    setEndoPendingQuantities: Dispatch<SetStateAction<Record<string, number>>>;
    setAddingToEndoBasket: Dispatch<SetStateAction<Set<string>>>;
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
    const [stockRequestCardsVisible, setStockRequestCardsVisible] = useState(true);
    const [activeEndoItemKey, setActiveEndoItemKey] = useState<string | null>(null);
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const [storeOrderQuantities, setStoreOrderQuantities] = useState<Record<string, number>>({});
    const [stockRequestStatuses, setStockRequestStatuses] = useState<Record<string, StockRequestStatus>>({});
    const [stockRequestErrors, setStockRequestErrors] = useState<Record<string, string>>({});
    const [submittingStockRequests, setSubmittingStockRequests] = useState<Set<string>>(new Set());
    const [endoQuantities, setEndoQuantities] = useState<Record<string, number>>({});
    const [endoPendingQuantities, setEndoPendingQuantities] = useState<Record<string, number>>({});
    const [addingToEndoBasket, setAddingToEndoBasket] = useState<Set<string>>(new Set());
    const [endoBasketError, setEndoBasketError] = useState("");
    const [endoBasketSuccess, setEndoBasketSuccess] = useState("");

    const currentBranchCode = useMemo(
        () => normalizeBranchCode(user?.s1code),
        [user?.s1code]
    );
    const hasValidBranch = currentBranchCode.length > 0;

    const currentBranchName = useMemo(() => {
        if (!hasValidBranch) {
            return "—";
        }

        const normalizedCurrent = normalizeBranchCode(currentBranchCode);
        const fromProfile = user?.listBranches?.find(
            (branch) => normalizeBranchCode(branch.s1Code) === normalizedCurrent
        )?.name;
        return resolveBranchName(normalizedCurrent, fromProfile);
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
    }, [activeEndoItemKey, hasMounted, items.length, resultsContainerRef]);

    const getExpandedItemKey = useCallback((item: IItem) => {
        return getEndoItemKey(item);
    }, []);

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

    const toggleStockRequestCardsVisibility = useCallback(() => {
        setStockRequestCardsVisible((visible) => {
            if (visible) {
                setActiveEndoItemKey(null);
                setEndoBasketError("");
                setEndoBasketSuccess("");
            }

            return !visible;
        });
    }, []);

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

    const getEndoPendingQty = useCallback((mtrl: string | number, sourceBranch: string) => {
        return endoPendingQuantities[getEndoQtyKey(mtrl, sourceBranch)] ?? 0;
    }, [endoPendingQuantities]);

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

        return Array.from(branchCodes)
            .sort((a, b) => Number(a) - Number(b))
            .filter((code) => code !== currentBranchCode)
            .map((code) => {
                const labelFromProfile = user?.listBranches?.find(
                    (branch) => normalizeBranchCode(branch.s1Code) === code
                )?.name;
                const label = resolveBranchName(code, labelFromProfile);
                const location =
                    String(getItemFieldValue(item, `THESI${code}`) ?? "").trim() || "-";

                return {
                    code,
                    label,
                    stock: parseAvailableStock(getItemFieldValue(item, `YP${code}`)),
                    location,
                };
            });
    }, [currentBranchCode, user?.listBranches]);

    const resetScopedResultsState = useCallback((
        options?: ResetScopedResultsStateOptions
    ) => {
        const shouldResetScroll = options?.resetScroll ?? false;

        setExpandedItems(new Set());
        setActiveEndoItemKey(null);
        setStockRequestCardsVisible(true);
        setEndoQuantities({});
        setEndoBasketError("");
        setEndoBasketSuccess("");

        if (shouldResetScroll) {
            setHasScrolledResults(false);
        }
    }, []);

    const prepareForSearch = useCallback(() => {
        setActiveEndoItemKey(null);
        setEndoBasketSuccess("");
        setEndoBasketError("");
        setEndoQuantities({});
    }, []);

    return {
        sidebarVisible,
        stockRequestCardsVisible,
        hasScrolledResults,
        isResultsScrollable,
        activeEndoItemKey,
        expandedItems,
        endoQuantities,
        endoPendingQuantities,
        addingToEndoBasket,
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
        getEndoPendingQty,
        getEndoBranchOptions,
        prepareForSearch,
        resetScopedResultsState,
        setStoreOrderQuantity,
        setEndoRequestedQty,
        toggleExpanded,
        toggleAllExpanded,
        toggleStockRequestCardsVisibility,
        handleResultsScroll,
        handleToggleSidebarVisibility,
        setActiveEndoItemKey,
        setExpandedItems,
        setEndoPendingQuantities,
        setAddingToEndoBasket,
        setEndoBasketError,
        setEndoBasketSuccess,
        setStockRequestStatuses,
        setStockRequestErrors,
        setSubmittingStockRequests,
    };
}
