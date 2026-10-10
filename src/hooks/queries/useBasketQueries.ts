"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAllClientBaskets } from "@/lib/api-client/basket";
import type { BasketAllRoutePayload } from "@/lib/interface";

export const activeClientBasketsCountQueryKey = (
  params: BasketAllRoutePayload
) => ["active-client-baskets-count", params] as const;

export function useActiveClientBasketsCountQuery(
  params: BasketAllRoutePayload | null
) {
  return useQuery({
    queryKey: params
      ? activeClientBasketsCountQueryKey(params)
      : ["active-client-baskets-count", "disabled"],
    queryFn: () => fetchAllClientBaskets(params!),
    enabled: Boolean(params?.branch),
    select: (data) => data.totalcount,
  });
}
