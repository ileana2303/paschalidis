"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchSuffixList } from "@/lib/api-client/suffix-management";
import type { SuffixListFilters } from "@/lib/suffix-management/types";

export const suffixListQueryKey = (filters: SuffixListFilters) =>
  ["suffix-management", "getlist", filters] as const;

export function useSuffixListQuery(filters: SuffixListFilters) {
  return useQuery({
    queryKey: suffixListQueryKey(filters),
    queryFn: () => fetchSuffixList(filters),
    placeholderData: keepPreviousData,
  });
}
