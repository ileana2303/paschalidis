import axios from "axios";
import { httpClient } from "@/lib/http/client";
import type {
  SuffixListFilters,
  SuffixListResponse,
  SuffixListSuccessResponse,
  SuffixSaveResponse,
  SuffixSaveRoutePayload,
} from "@/lib/suffix-management/types";

const LIST_FALLBACK_ERROR = "Αποτυχία φόρτωσης των suffix.";
const SAVE_FALLBACK_ERROR = "Η αποθήκευση του suffix δεν ολοκληρώθηκε.";

function getSuffixError(error: unknown, fallbackMessage: string): Error {
  if (axios.isAxiosError(error)) {
    const response = error.response?.data as
      | { error?: unknown; message?: unknown }
      | undefined;
    const message = response?.error ?? response?.message;

    if (typeof message === "string" && message.trim()) {
      return new Error(message.trim());
    }
  }

  return error instanceof Error ? error : new Error(fallbackMessage);
}

export async function fetchSuffixList(
  filters: SuffixListFilters
): Promise<SuffixListSuccessResponse> {
  try {
    const { data } = await httpClient.post<SuffixListResponse>(
      "/api/suffix-management",
      filters
    );

    if (data.success !== true) {
      throw new Error(data.error?.trim() || LIST_FALLBACK_ERROR);
    }

    return data;
  } catch (error) {
    throw getSuffixError(error, LIST_FALLBACK_ERROR);
  }
}

export async function saveSuffixRows(
  payload: SuffixSaveRoutePayload
): Promise<SuffixSaveResponse> {
  try {
    const { data } = await httpClient.patch<SuffixSaveResponse>(
      "/api/suffix-management",
      payload
    );

    return data;
  } catch (error) {
    throw getSuffixError(error, SAVE_FALLBACK_ERROR);
  }
}
