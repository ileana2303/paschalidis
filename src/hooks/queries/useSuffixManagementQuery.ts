"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import {
  fetchSuffixList,
  saveSuffixRows,
} from "@/lib/api-client/suffix-management";
import type {
  SuffixListFilters,
  SuffixSaveRoutePayload,
} from "@/lib/suffix-management/types";

export const suffixListQueryKey = (filters: SuffixListFilters) =>
  ["suffix-management", "getlist", filters] as const;

export function useSuffixListQuery(filters: SuffixListFilters) {
  return useQuery({
    queryKey: suffixListQueryKey(filters),
    queryFn: () => fetchSuffixList(filters),
    placeholderData: keepPreviousData,
  });
}

export function useSaveSuffixMutation() {
  return useMutation({
    mutationFn: (payload: SuffixSaveRoutePayload) => saveSuffixRows(payload),
  });
}
