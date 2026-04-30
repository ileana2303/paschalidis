"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageBreadcrumb from "@/components/template components/common/PageBreadCrumb";
import SearchBar from "@/components/search/search-bar";
import {
  ChevronLeft,
  Loader2,
  RefreshCw,
  ShoppingCart,
} from "@/app/lib/lucide";
import type { BasketAllResponse } from "@/app/lib/interface";
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

  const searchInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const handleSearch = () => {
    const normalizedSearch = searchInput.trim() || DEFAULT_SEARCH;

    setAppliedSearch(normalizedSearch);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setAppliedSearch(DEFAULT_SEARCH);
    setPage(1);
  };

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalcount / pageSize));
  }, [pageSize, totalcount]);

  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div>
      <PageBreadcrumb pageTitle="Καλάθια Πελατών" />

      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.02]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-gray-500">
              Αναζήτηση πελάτη
            </label>

            <SearchBar
              inputRef={searchInputRef}
              value={searchInput}
              onChange={setSearchInput}
              onSearch={handleSearch}
              onClear={handleClearSearch}
              placeholder="Όνομα πελάτη ή TRDR..."
              loading={loading}
              clearOnFocus={false}
              containerClassName="w-full"
              inputClassName="rounded-lg py-2.5"
              searchButtonClassName="h-10 w-10 rounded-lg"
            />
          </div>

          <div className="w-full lg:w-40">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-gray-500">
              Ανά σελίδα
            </label>

            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:border-brand-500 hover:text-brand-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Ανανέωση
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="mt-4 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]">
        {loading ? (
          <div className="flex items-center justify-center px-5 py-16 text-gray-500 dark:text-gray-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Φόρτωση καλαθιών...
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center text-gray-500 dark:text-gray-400">
            <ShoppingCart className="h-10 w-10 text-gray-300 dark:text-gray-600" />

            <p className="mt-3 text-sm">
              Δεν βρέθηκαν καλάθια για τα κριτήρια αναζήτησης.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-white/[0.02]">
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
                  <tr key={row.TRDR}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white/90">
                      {row.CUSTOMER_NAME || "—"}
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {row.TRDR || "—"}
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {formatDate(row.MINDATE)}
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {formatDate(row.MAXDATE)}
                    </td>

                    <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">
                      {row.TOT_QTY || "0"}
                    </td>

                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-200">
                      {formatPrice(row.TOTAL_VALUE)}
                    </td>

                    <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">
                      {row.BASKETROWS || "0"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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