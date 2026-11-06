"use client";

import type { RefObject } from "react";
import type { AuthUser } from "@/lib/auth/types";
import type { IItem } from "@/lib/interface";
import { useSearchPartsResultsState } from "@/hooks/search-parts/use-search-parts-results-state";
import { useSearchPartsResultsActions } from "@/hooks/search-parts/use-search-parts-results-actions";

interface UseSearchPartsResultsControllerParams {
    user: AuthUser | null;
    items: IItem[];
    hasMounted: boolean;
    resultsContainerRef: RefObject<HTMLDivElement | null>;
}

export function useSearchPartsResultsController({
    user,
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
        state,
    });

    return {
        ...state,
        ...actions,
    };
}
