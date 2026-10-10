"use client";
import { Branch_CardStyles } from "@/lib/branch-colors";
import { Package } from "@/lib/icons/lucide";
import { useStockFeedbackTotalsQuery } from "@/hooks/queries/useStockFeedbackQueries";
import { getStockBranchOrder, normalizeBranchCode, resolveBranchName } from "@/lib/auth/branches";
import { useAuthStore } from "@/stores/authStore";
import { getAthensMonthName } from "@/lib/utils/athens-date";
import { formatNumber } from "@/lib/utils/stock-feedback";

export const EcommerceMetrics = () => {
  const activeBranchCode = useAuthStore((state) => normalizeBranchCode(state.user?.mainBranch));
  const { data: salesResults, isPending } = useStockFeedbackTotalsQuery(activeBranchCode);
  const currentMonth = getAthensMonthName();

  const orderedBranches = getStockBranchOrder(activeBranchCode);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 md:gap-6">
      {orderedBranches.map((branch) => (
        <div key={branch} className={`rounded-2xl border p-5 ${Branch_CardStyles[branch].card} md:p-6`}>
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${Branch_CardStyles[branch].icon}`}>
            <Package className="h-6 w-6" />
          </div>
          <div className="mt-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Σύνολο Πωλήσεων</span>
              <span className="text-sm capitalize text-gray-500 dark:text-gray-400">{currentMonth}</span>
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${Branch_CardStyles[branch].badge}`}>
                {resolveBranchName(branch)}
              </span>
            </div>
            <h4 className={`mt-2 font-bold text-title-sm ${Branch_CardStyles[branch].value}`}>
              {!activeBranchCode || salesResults?.[branch] === null
                ? "—"
                : isPending || salesResults?.[branch] === undefined
                  ? "…"
                  : formatNumber(salesResults[branch])}
            </h4>
          </div>
        </div>
      ))}
    </div>
  );
};
