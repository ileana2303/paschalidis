"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    assignCustomerPriceGroup,
    fetchPriceTierGrid,
    fetchPriceTierGroups,
    savePriceTier,
} from "@/lib/api-client/price-tiers";
import type {
    PriceTierAssignRoutePayload,
    PriceTierGridResponse,
    PriceTierSaveRoutePayload,
} from "@/lib/price-tiers/types";

export const priceTierGridQueryKey = ["price-tiers", "grid"] as const;
export const priceTierGroupsQueryKey = ["price-tiers", "groups"] as const;

// Every opening of the screen reads fresh data: nothing is kept once it
// unmounts, and failed calls are never retried automatically.
const freshOnlyOptions = {
    gcTime: 0,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
} as const;

export function usePriceTierGridQuery() {
    return useQuery({
        queryKey: priceTierGridQueryKey,
        queryFn: fetchPriceTierGrid,
        ...freshOnlyOptions,
    });
}

export function usePriceTierGroupsQuery() {
    return useQuery({
        queryKey: priceTierGroupsQueryKey,
        queryFn: fetchPriceTierGroups,
        ...freshOnlyOptions,
    });
}

export function useSavePriceTierMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: PriceTierSaveRoutePayload) => savePriceTier(payload),
        onSuccess: (response, payload) => {
            queryClient.setQueryData<PriceTierGridResponse>(
                priceTierGridQueryKey,
                (current) =>
                    current && {
                        ...current,
                        cells: current.cells.map((cell) =>
                            cell.autoId === payload.autoId
                                ? {
                                      ...cell,
                                      tier: response.tier ?? payload.tier,
                                      ...(response.appUser
                                          ? { lastUser: response.appUser }
                                          : {}),
                                  }
                                : cell
                        ),
                    }
            );
        },
    });
}

export function useAssignCustomerPriceGroupMutation() {
    return useMutation({
        mutationFn: (payload: PriceTierAssignRoutePayload) =>
            assignCustomerPriceGroup(payload),
    });
}
