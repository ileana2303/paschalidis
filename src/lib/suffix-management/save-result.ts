import type { SuffixSaveResponse } from "@/lib/suffix-management/types";

export type SuffixSaveOutcome = {
  saved: number;
  failed: number;
  completed: boolean;
  message: string;
};

export function getSuffixSaveOutcome(
  response: SuffixSaveResponse
): SuffixSaveOutcome {
  const saved = response.saved ?? 0;
  const failed = response.failed ?? 0;
  const details = (response.errors ?? []).map((item) => {
    const key = item.key ? ` (${item.key})` : "";
    return `Γραμμή ${item.row}${key}: ${item.error}`;
  });
  const parts = [`${saved} αποθηκεύτηκαν · ${failed} απέτυχαν`];

  if ("error" in response && response.error?.trim()) {
    parts.push(response.error.trim());
  }
  if (details.length > 0) parts.push(details.join(" · "));

  return {
    saved,
    failed,
    completed: response.success === true && saved > 0 && failed === 0,
    message: parts.join(" — "),
  };
}
