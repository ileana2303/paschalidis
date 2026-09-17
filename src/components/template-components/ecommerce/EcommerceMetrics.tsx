"use client";
import { Branch_CardStyles } from "@/lib/branch-colors";
import { useEffect, useState } from "react";
import { Package } from "@/lib/icons/lucide";
import { fetchStockFeedback } from "@/lib/api-client/items";
import { getStockBranchOrder, normalizeBranchCode, resolveBranchName } from "@/lib/auth/branches";
import { useAuthStore } from "@/stores/authStore";
import { formatNumber } from "@/lib/utils/stock-feedback";

export const EcommerceMetrics = () => {
  const activeBranchCode = useAuthStore((state) => normalizeBranchCode(state.user?.s1code));
  const [salesResults, setSalesResults] = useState<Record<string, number | null>>({});
  const currentMonth = new Intl.DateTimeFormat("el-GR", {
    month: "long",
    timeZone: "Europe/Athens",
  }).format(new Date());

  useEffect(() => {
    if (!activeBranchCode) return;
    let active = true;
    const days = Number(new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      timeZone: "Europe/Athens",
    }).format(new Date()));
    const branches = getStockBranchOrder(activeBranchCode);

    void Promise.allSettled(
      branches.map((branch) => fetchStockFeedback({ branch, days }))
    ).then((results) => {
      if (!active) return;
      const nextResults: Record<string, number | null> = {};
      results.forEach((result, index) => {
        const branch = branches[index];
        if (result.status === "fulfilled") {
          nextResults[branch] = result.value.totalcount;
        } else {
          console.error(`[ecommerce-metrics] Failed to load sales for branch ${branch}`, result.reason);
          nextResults[branch] = null;
        }
      });
      setSalesResults(nextResults);
    });

    return () => { active = false; };
  }, [activeBranchCode]);

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
              {!activeBranchCode || salesResults[branch] === null
                ? "—"
                : salesResults[branch] === undefined
                  ? "…"
                  : formatNumber(salesResults[branch])}
            </h4>
          </div>
        </div>
      ))}
    </div>
  );
};
