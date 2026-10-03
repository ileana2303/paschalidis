import { httpClient } from "@/lib/http/client";
import type {
  PickingListResponse,
  PickingListUpdatePayload,
  PickingListUpdateResponse,
  PickingStatus,
} from "@/lib/picking-list";

export async function fetchPickingList(
  status?: PickingStatus
): Promise<PickingListResponse> {
  const { data } = await httpClient.post<PickingListResponse>(
    "/api/picking-list",
    status ? { status } : {}
  );

  if (!data.success) {
    throw new Error(data.message ?? "Αποτυχία φόρτωσης Picking List.");
  }

  return data;
}

export async function updatePickingListOrder(
  payload: PickingListUpdatePayload
): Promise<PickingListUpdateResponse> {
  const { data } = await httpClient.patch<PickingListUpdateResponse>(
    "/api/picking-list",
    payload
  );

  if (!data.success) {
    throw new Error(data.message ?? "Αποτυχία ενημέρωσης Picking List.");
  }

  return data;
}
