"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchStockFeedback } from "@/lib/api-client/items";
import { getStockBranchOrder } from "@/lib/auth/branches";

export type StockFeedbackTotalsByBranch = Record<string, number | null>;

function getAthensMonthToDateDays(): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      timeZone: "Europe/Athens",
    }).format(new Date())
  );
}

async function fetchStockFeedbackTotalsForBranches(
  activeBranchCode: string
): Promise<StockFeedbackTotalsByBranch> {
  const days = getAthensMonthToDateDays();
  const branches = getStockBranchOrder(activeBranchCode);
  const results = await Promise.allSettled(
    branches.map((branch) => fetchStockFeedback({ branch, days }))
  );

  const totals: StockFeedbackTotalsByBranch = {};
  results.forEach((result, index) => {
    const branch = branches[index];
    if (result.status === "fulfilled") {
      totals[branch] = result.value.totalcount;
    } else {
      console.error(
        `[stock-feedback] Failed to load sales for branch ${branch}`,
        result.reason
      );
      totals[branch] = null;
    }
  });

  return totals;
}

export const stockFeedbackTotalsQueryKey = (activeBranchCode: string) =>
  ["stock-feedback-totals", activeBranchCode] as const;

export function useStockFeedbackTotalsQuery(activeBranchCode: string) {
  return useQuery({
    queryKey: activeBranchCode
      ? stockFeedbackTotalsQueryKey(activeBranchCode)
      : ["stock-feedback-totals", "disabled"],
    queryFn: () => fetchStockFeedbackTotalsForBranches(activeBranchCode),
    enabled: Boolean(activeBranchCode),
  });
}
