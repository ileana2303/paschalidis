"use client";

import type { RefObject } from "react";
import type { AuthUser } from "@/lib/auth/types";
import type { ICustomerInfo, IItem } from "@/lib/interface";
import { useSearchPartsResultsState } from "@/hooks/search-parts/use-search-parts-results-state";
import { useSearchPartsResultsActions } from "@/hooks/search-parts/use-search-parts-results-actions";

interface UseSearchPartsResultsControllerParams {
    user: AuthUser | null;
    customer: ICustomerInfo | null;
    onCustomerBasketChanged?: () => void | Promise<void>;
    items: IItem[];
    hasMounted: boolean;
    resultsContainerRef: RefObject<HTMLDivElement | null>;
}

export function useSearchPartsResultsController({
    user,
    customer,
    onCustomerBasketChanged,
    items,
    hasMounted,
    resultsContainerRef,
}: UseSearchPartsResultsControllerParams) {
    const state = useSearchPartsResultsState({
        user,
        items,
        hasMounted,
        resultsContainerRef,
    });

    const actions = useSearchPartsResultsActions({
        user,
        customer,
        onCustomerBasketChanged,
        state,
    });

    return {
        ...state,
        ...actions,
    };
}
