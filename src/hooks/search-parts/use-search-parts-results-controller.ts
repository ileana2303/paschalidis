"use client";

import type { RefObject } from "react";
import type { ExternalLoginUserAccount } from "@/lib/auth/types";
import type { ICustomerInfo, IItem } from "@/lib/interface";
import { useSearchPartsResultsState } from "@/hooks/search-parts/use-search-parts-results-state";
import { useSearchPartsResultsActions } from "@/hooks/search-parts/use-search-parts-results-actions";

interface UseSearchPartsResultsControllerParams {
    customer: ICustomerInfo | null;
    user: ExternalLoginUserAccount | null;
    items: IItem[];
    hasMounted: boolean;
    resultsContainerRef: RefObject<HTMLDivElement | null>;
    onRequireCustomerSelection: () => void;
}

export function useSearchPartsResultsController({
    customer,
    user,
    items,
    hasMounted,
    resultsContainerRef,
    onRequireCustomerSelection,
}: UseSearchPartsResultsControllerParams) {
    const state = useSearchPartsResultsState({
        user,
        items,
        hasMounted,
        resultsContainerRef,
    });

    const actions = useSearchPartsResultsActions({
        customer,
        user,
        onRequireCustomerSelection,
        state,
    });

    return {
        ...state,
        ...actions,
    };
}
