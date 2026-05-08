"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/template components/common/PageBreadCrumb";
import DataTable from "@/components/ui/data-table/DataTable";
import DataTableEmptyState from "@/components/ui/data-table/DataTableEmptyState";
import DataTableHeader from "@/components/ui/data-table/DataTableHeader";
import DataTableSearchBar from "@/components/ui/data-table/DataTableSearchBar";
import NumberBadge from "@/components/ui/data-table/NumberBadge";
import {
  ChevronLeft,
  Loader2,
  ShoppingCart,
} from "@/lib/icons/lucide";
import type { BasketAllResponse } from "@/lib/interface";
import { useFetchAllClientBasketsMutation } from "@/hooks/queries/useApiMutations";

const DEFAULT_SEARCH = "*";
const DEFAULT_PAGE_SIZE = 25;

type BasketListRow = {
  TRDR: string;
  MAXDATE: string;
  MINDATE: string;
  CUSTOMER_NAME: string;
  TOT_QTY: string;
  TOTAL_VALUE: string;
  BASKETROWS: string;
};

function formatPrice(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed.toFixed(2)} €` : "0.00 €";
}

function formatDate(value: unknown) {
  if (!value) return "—";

  const parsed = new Date(String(value));

  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleDateString("el-GR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getBasketRows(data: BasketAllResponse): BasketListRow[] {
  return Array.isArray(data.rows) ? (data.rows as BasketListRow[]) : [];
}

export default function AllBasketsClient() {
  const { mutateAsync: fetchAllClientBaskets } =
    useFetchAllClientBasketsMutation();

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState(DEFAULT_SEARCH);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalcount, setTotalcount] = useState(0);
  const [rows, setRows] = useState<BasketListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await fetchAllClientBaskets({
        search: appliedSearch,
        page,
        pageSize,
      });

      setRows(getBasketRows(data));
      setTotalcount(Number(data.totalcount) || 0);
    } catch (err) {
      setRows([]);
      setTotalcount(0);
      setError(
        err instanceof Error
          ? err.message
          : "Αποτυχία φόρτωσης καλαθιών πελατών"
      );
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, fetchAllClientBaskets, page, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearchOrRefresh = useCallback(() => {
    const normalizedSearch = searchInput.trim() || DEFAULT_SEARCH;

    if (normalizedSearch !== appliedSearch) {
      setAppliedSearch(normalizedSearch);
      setPage(1);
      return;
    }

    void loadData();
  }, [appliedSearch, loadData, searchInput]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalcount / pageSize));
  }, [pageSize, totalcount]);

  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div>
      <PageBreadcrumb pageTitle="Καλάθια Πελατών" />

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      <DataTable className="mt-4">
        <DataTableHeader
          title="Καλάθια Πελατών"
          description="Αναζήτηση και προβολή όλων των καλαθιών πελατών."
          count={totalcount}
          action={
            <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
              <DataTableSearchBar
                value={searchInput}
                onChange={setSearchInput}
                onRefresh={handleSearchOrRefresh}
                onSubmit={handleSearchOrRefresh}
                isRefreshing={loading}
                refreshDisabled={loading}
                placeholder="Όνομα πελάτη ή TRDR..."
              />

              <label className="flex h-10 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                Ανά Σελίδα
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                  className="border-0 bg-transparent text-xs font-semibold text-gray-700 outline-none focus:ring-0 dark:text-gray-200"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
            </div>
          }
        />

        {loading ? (
          <div className="flex items-center justify-center px-5 py-16 text-gray-500 dark:text-gray-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Φόρτωση καλαθιών...
          </div>
        ) : rows.length === 0 ? (
          <DataTableEmptyState
            icon={<ShoppingCart className="h-7 w-7" />}
            title="Δεν βρέθηκαν καλάθια"
            description="Δεν βρέθηκαν καλάθια για τα τρέχοντα κριτήρια αναζήτησης."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
              <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-950">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                    Πελάτης
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                    TRDR
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                    Από
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                    Έως
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                    Τεμάχια
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                    Αξία
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                    Γραμμές
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((row) => (
                  <tr
                    key={row.TRDR}
                    className="transition hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white/90">
                      {row.CUSTOMER_NAME || "—"}
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      <NumberBadge value={row.TRDR || "—"} />
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {formatDate(row.MINDATE)}
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {formatDate(row.MAXDATE)}
                    </td>

                    <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">
                      <NumberBadge
                        value={row.TOT_QTY || "0"}
                        variant="brand"
                        className="min-w-[64px]"
                      />
                    </td>

                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-200">
                      {formatPrice(row.TOTAL_VALUE)}
                    </td>

                    <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">
                      <NumberBadge
                        value={row.BASKETROWS || "0"}
                        className="min-w-[64px]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataTable>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Σελίδα {page} από {totalPages} · Σύνολο {totalcount}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canGoPrevious}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition hover:border-brand-500 hover:text-brand-600 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
          >
            <ChevronLeft className="h-4 w-4" />
            Προηγούμενη
          </button>

          <button
            type="button"
            disabled={!canGoNext}
            onClick={() => setPage((prev) => prev + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition hover:border-brand-500 hover:text-brand-600 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
          >
            Επόμενη
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
}
