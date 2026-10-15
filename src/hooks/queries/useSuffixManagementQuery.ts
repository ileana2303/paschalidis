"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  fetchSuffixList,
  saveSuffixRows,
} from "@/lib/api-client/suffix-management";
import type {
  SuffixListFilters,
  SuffixSaveRoutePayload,
} from "@/lib/suffix-management/types";

export const suffixListQueryRoot = ["suffix-management", "getlist"] as const;

export const suffixListQueryKey = (filters: SuffixListFilters) =>
  [...suffixListQueryRoot, filters] as const;

export function useSuffixListQuery(filters: SuffixListFilters) {
  return useQuery({
    queryKey: suffixListQueryKey(filters),
    queryFn: () => fetchSuffixList(filters),
    placeholderData: keepPreviousData,
  });
}

export function useSaveSuffixMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SuffixSaveRoutePayload) => saveSuffixRows(payload),
    onSuccess: (response) => {
      if ((response.saved ?? 0) > 0) {
        void queryClient.invalidateQueries({
          queryKey: suffixListQueryRoot,
          refetchType: "none",
        });
      }
    },
  });
}
