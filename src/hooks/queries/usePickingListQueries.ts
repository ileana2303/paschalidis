"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryObserverResult,
} from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  fetchPickingList,
  updatePickingListOrder,
} from "@/lib/api-client/picking-list";
import {
  groupPickingListRows,
  type PickingListOrder,
  type PickingListUpdatePayload,
  type PickingStatusFilter,
} from "@/lib/picking-list";

export const PICKING_LIST_REFETCH_INTERVAL_MS = 60_000;

export const pickingListQueryKey = (statusFilter: PickingStatusFilter) =>
  ["picking-list", statusFilter] as const;

function getRequestedStatus(statusFilter: PickingStatusFilter) {
  return statusFilter === "ALL" ? undefined : statusFilter;
}

function notifyNewPickingOrders(added: PickingListOrder[]) {
  if (added.length === 0) return;

  if (added.length === 1) {
    const order = added[0];
    const label = order.parastatiko || order.fincode || order.findoc;
    toast.success(`Νέα παραγγελία: ${label}`, {
      position: "top-center",
      duration: 4000,
    });
    return;
  }

  toast.success(`${added.length} νέες παραγγελίες`, {
    position: "top-center",
    duration: 4000,
  });
}

export function usePickingListQuery(statusFilter: PickingStatusFilter) {
  const requestedStatus = getRequestedStatus(statusFilter);

  return useQuery({
    queryKey: pickingListQueryKey(statusFilter),
    queryFn: async () => {
      const data = await fetchPickingList(requestedStatus);
      return groupPickingListRows(
        data.rows ?? [],
        requestedStatus ?? "S1"
      );
    },
  });
}

export function useUpdatePickingListOrderMutation(
  statusFilter: PickingStatusFilter
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PickingListUpdatePayload) =>
      updatePickingListOrder(payload),
    onSuccess: (_response, payload) => {
      const findoc = payload.findoc.trim();
      if (!findoc) return;

      queryClient.setQueryData<PickingListOrder[]>(
        pickingListQueryKey(statusFilter),
        (current) => {
          if (!current) return current;

          const next = current.map((order) =>
            order.findoc === findoc
              ? {
                  ...order,
                  ...(payload.pickerComment !== undefined
                    ? { pickerComment: payload.pickerComment.trim() }
                    : {}),
                  ...(payload.status ? { status: payload.status } : {}),
                }
              : order
          );

          if (
            payload.status === "PICKED_IT_UP" &&
            statusFilter !== "PICKED_IT_UP"
          ) {
            return next.filter((order) => order.findoc !== findoc);
          }

          if (
            payload.status &&
            statusFilter !== "ALL" &&
            payload.status !== statusFilter
          ) {
            return next.filter((order) => order.findoc !== findoc);
          }

          return next;
        }
      );
    },
  });
}

type PickingListIntervalNotificationOptions = {
  branch: string;
  enabled: boolean;
  orders: PickingListOrder[];
  refetch: () => Promise<QueryObserverResult<PickingListOrder[], Error>>;
};

export function usePickingListIntervalNotifications({
  branch,
  enabled,
  orders,
  refetch,
}: PickingListIntervalNotificationOptions) {
  const knownFindocsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    knownFindocsRef.current = new Set(orders.map((order) => order.findoc));
  }, [orders]);

  useEffect(() => {
    if (!enabled || !branch) return;

    const intervalId = window.setInterval(() => {
      void (async () => {
        const before = knownFindocsRef.current;
        const result = await refetch();
        if (!result.isSuccess || !result.data) return;

        const nextOrders = result.data;
        knownFindocsRef.current = new Set(
          nextOrders.map((order) => order.findoc)
        );

        const added = nextOrders.filter(
          (order) => !before.has(order.findoc) && order.branch === branch
        );

        notifyNewPickingOrders(added);
      })();
    }, PICKING_LIST_REFETCH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [branch, enabled, refetch]);
}
