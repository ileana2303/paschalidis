"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    applyBasePricePurDocument,
    fetchBasePricePurItems,
    fetchBasePricePurList,
} from "@/lib/api-client/base-price-pur";
import type {
    BasePricePurApplyRoutePayload,
    BasePricePurItemsRoutePayload,
} from "@/lib/base-price-pur/types";

export const basePricePurListQueryKey = ["base-price-pur", "list"] as const;

export function useBasePricePurListQuery(enabled = true) {
    return useQuery({
        queryKey: basePricePurListQueryKey,
        queryFn: fetchBasePricePurList,
        enabled,
    });
}

export function useFetchBasePricePurListMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: fetchBasePricePurList,
        onSuccess: (data) => {
            queryClient.setQueryData(basePricePurListQueryKey, data);
        },
    });
}

export function useBasePricePurItemsMutation() {
    return useMutation({
        mutationFn: (payload: BasePricePurItemsRoutePayload) =>
            fetchBasePricePurItems(payload),
    });
}

export function useApplyBasePricePurMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: BasePricePurApplyRoutePayload) =>
            applyBasePricePurDocument(payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: basePricePurListQueryKey });
        },
    });
}
