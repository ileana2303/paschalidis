"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { isAxiosError } from "axios";
import {
  deletePickingListOrder,
  fetchPickingList,
  updatePickingListOrder,
} from "@/lib/api-client/picking-list";
import {
  groupPickingListRows,
  type PickingListOrder,
  type PickingListDeletePayload,
  type PickingListUpdatePayload,
  type PickingStatusFilter,
} from "@/lib/picking-list";
import { NOTIFICATION_POLL_INTERVAL_MS } from "@/lib/notifications";
import { useAuthStore } from "@/stores/authStore";

const pickingListQueryKey = (username: string | undefined, statusFilter: PickingStatusFilter) =>
  ["picking-list", username, statusFilter] as const;

function getRequestedStatus(statusFilter: PickingStatusFilter) {
  return statusFilter === "ALL" ? undefined : statusFilter;
}

export function isPickingListUnauthorized(error: unknown) {
  return isAxiosError(error) && error.response?.status === 401;
}

export function usePickingListQuery(
  statusFilter: PickingStatusFilter,
  { enabled = true, notifications = false } = {}
) {
  const username = useAuthStore((state) => state.user?.username);
  const requestedStatus = getRequestedStatus(statusFilter);

  return useQuery<PickingListOrder[]>({
    queryKey: pickingListQueryKey(username, statusFilter),
    enabled: enabled && Boolean(username),
    refetchInterval: (query) => {
      if (isPickingListUnauthorized(query.state.error)) return false;
      if (notifications) return NOTIFICATION_POLL_INTERVAL_MS;
      return statusFilter === "ALL" ? false : 60_000;
    },
    refetchIntervalInBackground: notifications,
    refetchOnWindowFocus: notifications,
    retry: (failureCount, error) => failureCount < 1 && !isPickingListUnauthorized(error),
    queryFn: async ({ signal }) => {
      const data = await fetchPickingList(requestedStatus, signal);
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
  const username = useAuthStore((state) => state.user?.username);

  return useMutation({
    mutationFn: (payload: PickingListUpdatePayload) =>
      updatePickingListOrder(payload),
    onSuccess: (_response, payload) => {
      const findoc = payload.findoc.trim();
      if (!findoc) return;

      for (const filter of new Set<PickingStatusFilter>([statusFilter, "ALL"])) {
        queryClient.setQueryData<PickingListOrder[]>(
          pickingListQueryKey(username, filter),
          (current) => {
            if (!current) return current;

            if (
              payload.status &&
              payload.status !== filter &&
              (filter !== "ALL" || payload.status === "PICKED_IT_UP")
            ) {
              return current.filter((order) => order.findoc !== findoc);
            }

            return current.map((order) =>
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
          }
        );
      }
    },
  });
}

export function useDeletePickingListOrderMutation(
  statusFilter: PickingStatusFilter
) {
  const queryClient = useQueryClient();
  const username = useAuthStore((state) => state.user?.username);

  return useMutation({
    mutationFn: (payload: PickingListDeletePayload) =>
      deletePickingListOrder(payload),
    onSuccess: (_response, payload) => {
      const findoc = payload.findoc.trim();
      if (!findoc) return;

      for (const filter of new Set<PickingStatusFilter>([statusFilter, "ALL"])) {
        queryClient.setQueryData<PickingListOrder[]>(
          pickingListQueryKey(username, filter),
          (current) => current?.filter((order) => order.findoc !== findoc)
        );
      }
    },
  });
}
