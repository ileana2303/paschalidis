"use client";

import Link from "next/link";
import { ExternalLink, ShoppingCart } from "@/lib/icons/lucide";
import { useActiveClientBasketsCountQuery } from "@/hooks/queries/useBasketQueries";
import { normalizeBranchCode, resolveBranchName } from "@/lib/auth/branches";
import { getBranchColor } from "@/lib/branch-colors";
import { BASKET_BRANCH_OPTIONS, DEFAULT_SEARCH, isBasketBranchCode } from "@/lib/utils/all-baskets";
import { formatNumber } from "@/lib/utils/stock-feedback";
import { useAuthStore } from "@/stores/authStore";
import { useMemo } from "react";

export default function ActiveBasketsCard() {
  const user = useAuthStore((state) => state.user);
  const activeBranch = normalizeBranchCode(user?.mainBranch);
  const branch = !user
    ? ""
    : isBasketBranchCode(activeBranch)
      ? activeBranch
      : BASKET_BRANCH_OPTIONS[0].code;
  const basketsQueryParams = useMemo(
    () =>
      branch
        ? {
            search: DEFAULT_SEARCH,
            page: 1,
            pageSize: 1,
            branch,
          }
        : null,
    [branch]
  );

  const { data: count, isError, isPending } =
    useActiveClientBasketsCountQuery(basketsQueryParams);

  return (
    <Link
      href="/all-baskets"
      className="flex h-full w-full min-h-[190px] flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 text-gray-900 transition-colors hover:border-brand-200 hover:bg-brand-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white dark:hover:border-brand-500/30 dark:hover:bg-brand-500/5 md:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/90">
          <ShoppingCart className="h-5 w-5" aria-hidden="true" />
        </span>
        <ExternalLink className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true" />
      </div>

      <div className="mt-5">
        {branch && (
          <span className={`mb-3 block w-fit max-w-full truncate rounded-full px-3 py-1 text-xs font-semibold ${getBranchColor(branch)}`}>
            {resolveBranchName(branch)}
          </span>
        )}
        <p className="text-sm text-gray-500 dark:text-gray-400">Ενεργά καλάθια</p>
        <div className="mt-1">
          <span className="text-title-sm font-bold tabular-nums text-gray-800 dark:text-white/90" aria-live="polite">
            {!branch || isError
              ? "—"
              : isPending || count === undefined
                ? "…"
                : formatNumber(count)}
          </span>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {isError ? "Δεν ήταν δυνατή η φόρτωση" : "Πελάτες με ανοιχτό καλάθι"}
        </p>
      </div>
    </Link>
  );
}
