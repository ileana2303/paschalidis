"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import DataTable from "@/components/ui/data-table/data-table";
import DataTableEmptyState from "@/components/ui/data-table/data-table-empty-state";
import DataTableHeader from "@/components/ui/data-table/data-table-header";
import DataTableSearchBar from "@/components/ui/data-table/data-table-search-bar";
import DataTableSelectionCheckbox from "@/components/ui/data-table/data-table-selection-checkbox";
import NumberBadge from "@/components/ui/data-table/number-badge";
import {
  ChevronLeft,
  Loader2,
  ShoppingCart,
  Trash2,
} from "@/lib/icons/lucide";
import {
  useDeleteBasketItemsMutation,
  useFetchAllClientBasketsMutation,
  useFetchBasketItemsMutation,
  useFetchCustomerByTrdrMutation,
} from "@/hooks/queries/useApiMutations";
import type { ICustomerInfo } from "@/lib/interface";
import { normalizeBranchCode } from "@/lib/auth/branches";
import { useAuthStore } from "@/stores/authStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useSessionState } from "@/hooks/useSessionState";
import {
  BASKET_BRANCH_OPTIONS,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SEARCH,
  formatDate,
  formatPrice,
  getBasketRows,
  isBasketBranchCode,
  type BasketBranchCode,
  type BasketListRow,
} from "@/lib/utils/all-baskets";
import toast from "react-hot-toast";

export default function AllBasketsClient() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setCustomer = useCustomerStore((state) => state.setCustomer);
  const currentBranchCode = useMemo(
    () => normalizeBranchCode(user?.s1code),
    [user?.s1code]
  );
  const { mutateAsync: fetchAllClientBaskets } =
    useFetchAllClientBasketsMutation();
  const { mutateAsync: fetchBasketItems } = useFetchBasketItemsMutation();
  const { mutateAsync: deleteBasketItems } = useDeleteBasketItemsMutation();
  const { mutateAsync: fetchCustomerByTrdr } = useFetchCustomerByTrdrMutation();

  const [searchInput, setSearchInput] = useSessionState(
    "all-baskets-search-input",
    ""
  );
  const [appliedSearch, setAppliedSearch] = useSessionState(
    "all-baskets-applied-search",
    DEFAULT_SEARCH
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalcount, setTotalcount] = useState(0);
  const [rows, setRows] = useState<BasketListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranchCode, setSelectedBranchCode] = useState<
    BasketBranchCode | ""
  >("");
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [navigatingTrdr, setNavigatingTrdr] = useState<string | null>(null);
  const [selectedTrdrs, setSelectedTrdrs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (selectedBranchCode) {
      return;
    }

    const normalizedCurrentBranch = normalizeBranchCode(currentBranchCode);

    if (isBasketBranchCode(normalizedCurrentBranch)) {
      setSelectedBranchCode(normalizedCurrentBranch);
      return;
    }

    setSelectedBranchCode(BASKET_BRANCH_OPTIONS[0].code);
  }, [currentBranchCode, selectedBranchCode]);

  const loadData = useCallback(async () => {
    if (!selectedBranchCode) {
      return;
    }

    setLoading(true);

    try {
      const data = await fetchAllClientBaskets({
        search: appliedSearch,
        page,
        pageSize,
        branch: selectedBranchCode,
      });

      setRows(getBasketRows(data));
      setSelectedTrdrs(new Set());
      setTotalcount(Number(data.totalcount) || 0);
    } catch (err) {
      setRows([]);
      setSelectedTrdrs(new Set());
      setTotalcount(0);
      toast.error(
        err instanceof Error
          ? err.message
          : "Αποτυχία φόρτωσης καλαθιών πελατών"
      );
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, fetchAllClientBaskets, page, pageSize, selectedBranchCode]);

  useEffect(() => {
    if (!selectedBranchCode) {
      return;
    }

    void loadData();
  }, [loadData, selectedBranchCode]);

  const handleSearchOrRefresh = useCallback(() => {
    const normalizedSearch = searchInput.trim() || DEFAULT_SEARCH;

    if (normalizedSearch !== appliedSearch) {
      setAppliedSearch(normalizedSearch);
      setPage(1);
      return;
    }

    void loadData();
  }, [appliedSearch, loadData, searchInput, setAppliedSearch]);

  // Customer records resolved for this page are kept around so re-opening the
  // same basket (or a row the pointer already hovered) navigates instantly.
  const customerCacheRef = useRef(new Map<string, ICustomerInfo>());
  const customerLookupsRef = useRef(new Map<string, Promise<ICustomerInfo>>());
  const navigationTrdrRef = useRef<string | null>(null);

  const getBasketHref = useCallback(
    (trdr: string) => `/basket?trdr=${encodeURIComponent(trdr)}`,
    []
  );

  const resolveCustomer = useCallback(
    (row: BasketListRow) => {
      const normalizedTrdr = String(row.TRDR ?? "").trim();
      const cachedCustomer = customerCacheRef.current.get(normalizedTrdr);

      if (cachedCustomer) {
        return Promise.resolve(cachedCustomer);
      }

      const pendingLookup = customerLookupsRef.current.get(normalizedTrdr);

      if (pendingLookup) {
        return pendingLookup;
      }

      // The complete record is resolved by TRDR server-side - the customer name
      // is only passed as a search hint, never as the match criterion.
      const lookup = fetchCustomerByTrdr({
        trdr: normalizedTrdr,
        name: row.CUSTOMER_NAME?.trim() || undefined,
      })
        .then((customer) => {
          customerCacheRef.current.set(normalizedTrdr, customer);
          return customer;
        })
        .finally(() => {
          customerLookupsRef.current.delete(normalizedTrdr);
        });

      customerLookupsRef.current.set(normalizedTrdr, lookup);

      return lookup;
    },
    [fetchCustomerByTrdr]
  );

  // Warms both the customer record and the basket route while the user is still
  // deciding, so the click itself has nothing left to wait for.
  const handleBasketRowPrefetch = useCallback(
    (row: BasketListRow) => {
      const normalizedTrdr = String(row.TRDR ?? "").trim();

      if (!normalizedTrdr || customerCacheRef.current.has(normalizedTrdr)) {
        return;
      }

      router.prefetch(getBasketHref(normalizedTrdr));
      void resolveCustomer(row).catch(() => {
        // Prefetch failures are silent - the click path reports them.
      });
    },
    [getBasketHref, resolveCustomer, router]
  );

  const handleBasketRowClick = useCallback(
    async (row: BasketListRow) => {
      const normalizedTrdr = String(row.TRDR ?? "").trim();

      if (!normalizedTrdr || deletingSelected) {
        return;
      }

      if (navigationTrdrRef.current === normalizedTrdr) {
        return;
      }

      const basketHref = getBasketHref(normalizedTrdr);
      const cachedCustomer = customerCacheRef.current.get(normalizedTrdr);

      if (cachedCustomer) {
        setCustomer(cachedCustomer);
        router.push(basketHref);
        return;
      }

      navigationTrdrRef.current = normalizedTrdr;
      setNavigatingTrdr(normalizedTrdr);
      router.prefetch(basketHref);

      try {
        const customer = await resolveCustomer(row);

        // A click on another row while this lookup was running wins.
        if (navigationTrdrRef.current !== normalizedTrdr) {
          return;
        }

        setCustomer(customer);
        router.push(basketHref);
      } catch (err) {
        if (navigationTrdrRef.current !== normalizedTrdr) {
          return;
        }

        const message =
          err instanceof Error
            ? err.message
            : "Αποτυχία φόρτωσης στοιχείων πελάτη";
        toast.error(`${message} Το καλάθι ανοίγει χωρίς τα στοιχεία πελάτη.`);

        // The basket itself is keyed by TRDR, so it stays usable even when the
        // customer record could not be resolved.
        router.push(basketHref);
      } finally {
        if (navigationTrdrRef.current === normalizedTrdr) {
          navigationTrdrRef.current = null;
          setNavigatingTrdr(null);
        }
      }
    },
    [
      deletingSelected,
      getBasketHref,
      resolveCustomer,
      router,
      setCustomer,
    ]
  );

  const deleteClientBaskets = useCallback(
    async (basketsToDelete: BasketListRow[]) => {
      const basketResponses = await Promise.all(
        basketsToDelete.map((row) => fetchBasketItems(String(row.TRDR).trim()))
      );
      const basketIds = Array.from(
        new Set(
          basketResponses.flatMap((basket) =>
            basket.rows
              .map((item) => String(item.BASKETID ?? "").trim())
              .filter(Boolean)
          )
        )
      );

      if (basketIds.length === 0) {
        throw new Error("Δεν βρέθηκαν γραμμές καλαθιού για διαγραφή.");
      }

      await deleteBasketItems({
        basketIds,
        tableAction: "USRCUST",
        method: "DELETE",
        s1Key: "1305",
      });

      setSelectedTrdrs(new Set());
      await loadData();
    },
    [deleteBasketItems, fetchBasketItems, loadData]
  );

  const handleDeleteSelectedBaskets = useCallback(async () => {
    if (selectedTrdrs.size === 0 || deletingSelected) {
      return;
    }

    const selectedRows = rows.filter((row) =>
      selectedTrdrs.has(String(row.TRDR).trim())
    );

    if (selectedRows.length === 0) {
      return;
    }

    if (
      !window.confirm(
        `Διαγραφή ${selectedRows.length} επιλεγμένων καλαθιών πελατών;`
      )
    ) {
      return;
    }

    setDeletingSelected(true);

    try {
      await deleteClientBaskets(selectedRows);
      toast.success(
        selectedRows.length === 1
          ? "Το επιλεγμένο καλάθι διαγράφηκε."
          : `Διαγράφηκαν ${selectedRows.length} καλάθια πελατών.`
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Αποτυχία διαγραφής επιλεγμένων καλαθιών";
      toast.error(message);
    } finally {
      setDeletingSelected(false);
    }
  }, [
    deleteClientBaskets,
    deletingSelected,
    rows,
    selectedTrdrs,
  ]);

  const toggleBasketSelection = useCallback((trdr: string) => {
    const normalizedTrdr = String(trdr).trim();

    setSelectedTrdrs((current) => {
      const next = new Set(current);
      if (next.has(normalizedTrdr)) {
        next.delete(normalizedTrdr);
      } else {
        next.add(normalizedTrdr);
      }
      return next;
    });
  }, []);

  const currentRowTrdrs = useMemo(
    () => rows.map((row) => String(row.TRDR).trim()).filter(Boolean),
    [rows]
  );
  const selectedOnPageCount = currentRowTrdrs.filter((trdr) =>
    selectedTrdrs.has(trdr)
  ).length;
  const allRowsSelected =
    currentRowTrdrs.length > 0 && selectedOnPageCount === currentRowTrdrs.length;
  const someRowsSelected = selectedOnPageCount > 0 && !allRowsSelected;
  const toggleAllBaskets = useCallback(() => {
    setSelectedTrdrs(
      allRowsSelected ? new Set() : new Set(currentRowTrdrs)
    );
  }, [allRowsSelected, currentRowTrdrs]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalcount / pageSize));
  }, [pageSize, totalcount]);

  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;
  const isDeleting = deletingSelected;

  return (
    <div>
      <PageBreadcrumb pageTitle="Καλάθια Πελατών" />

      <DataTable className="mt-4">
        <DataTableHeader
          title="Καλάθια Πελατών"
          description="Αναζήτηση και προβολή όλων των καλαθιών πελατών."
          count={totalcount}
          action={
            <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
              <button
                type="button"
                onClick={() => void handleDeleteSelectedBaskets()}
                disabled={selectedOnPageCount === 0 || isDeleting || loading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300 dark:border-red-500/30 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-500/10 dark:disabled:border-gray-700 dark:disabled:text-gray-600"
              >
                {deletingSelected ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Διαγραφή επιλεγμένων
                {selectedOnPageCount > 0 ? ` (${selectedOnPageCount})` : ""}
              </button>

              <label className="flex h-10 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                Κατάστημα
                <select
                  value={selectedBranchCode}
                  onChange={(event) => {
                    const nextBranchCode = normalizeBranchCode(event.target.value);

                    if (!isBasketBranchCode(nextBranchCode)) {
                      return;
                    }

                    setSelectedBranchCode(nextBranchCode);
                    setPage(1);
                  }}
                  disabled={loading || isDeleting}
                  className="min-w-[140px] border-0 bg-transparent text-xs font-semibold text-gray-700 outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-200"
                >
                  {BASKET_BRANCH_OPTIONS.map((branch) => (
                    <option key={branch.code} value={branch.code}>
                      {branch.label}
                    </option>
                  ))}
                </select>
              </label>

              <DataTableSearchBar
                value={searchInput}
                onChange={setSearchInput}
                onRefresh={handleSearchOrRefresh}
                onSubmit={handleSearchOrRefresh}
                isRefreshing={loading}
                refreshDisabled={loading}
                placeholder="Όνομα πελάτη ή TRDR..."
              />

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
          <div className="w-full overflow-hidden">
            <table className="w-full table-fixed divide-y divide-gray-100 dark:divide-gray-800">
              <colgroup>
                <col className="w-[5%]" />
                <col className="w-[23%]" />
                <col className="w-[12%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
                <col className="w-[11%]" />
                <col className="w-[12%]" />
                <col className="w-[11%]" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-950">
                <tr>
                  <th className="px-2 py-3 text-left">
                    <DataTableSelectionCheckbox
                      ariaLabel="Επιλογή όλων των καλαθιών της σελίδας"
                      checked={allRowsSelected}
                      indeterminate={someRowsSelected}
                      onCheckedChange={toggleAllBaskets}
                      disabled={isDeleting}
                    />
                  </th>
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
                    role="link"
                    tabIndex={0}
                    aria-busy={navigatingTrdr === String(row.TRDR).trim()}
                    onClick={() => void handleBasketRowClick(row)}
                    onMouseEnter={() => handleBasketRowPrefetch(row)}
                    onFocus={() => handleBasketRowPrefetch(row)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void handleBasketRowClick(row);
                      }
                    }}
                    className={`cursor-pointer transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 dark:hover:bg-white/[0.04] ${
                      navigatingTrdr === String(row.TRDR).trim() ? "opacity-60" : ""
                    }`}
                  >
                    <td
                      className="px-4 py-3"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <DataTableSelectionCheckbox
                        ariaLabel={`Επιλογή καλαθιού πελάτη ${row.CUSTOMER_NAME || row.TRDR}`}
                        checked={selectedTrdrs.has(String(row.TRDR).trim())}
                        onCheckedChange={() => toggleBasketSelection(row.TRDR)}
                        disabled={isDeleting}
                      />
                    </td>
                    <td className="break-words px-2 py-3 text-sm font-medium text-gray-800 dark:text-white/90">
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
          <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            Ανά Σελίδα
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="border-0 bg-transparent text-sm font-medium text-gray-700 outline-none focus:ring-0 dark:text-gray-200"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
          
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
