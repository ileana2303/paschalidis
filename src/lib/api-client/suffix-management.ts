import axios from "axios";
import { httpClient } from "@/lib/http/client";
import type {
  SuffixListFilters,
  SuffixListResponse,
  SuffixListSuccessResponse,
} from "@/lib/suffix-management/types";

const FALLBACK_ERROR = "Αποτυχία φόρτωσης των suffix.";

function getSuffixListError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const response = error.response?.data as
      | { error?: unknown; message?: unknown }
      | undefined;
    const message = response?.error ?? response?.message;

    if (typeof message === "string" && message.trim()) {
      return new Error(message.trim());
    }
  }

  return error instanceof Error ? error : new Error(FALLBACK_ERROR);
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
      throw new Error(data.error?.trim() || FALLBACK_ERROR);
    }

    return data;
  } catch (error) {
    throw getSuffixListError(error);
  }
}
