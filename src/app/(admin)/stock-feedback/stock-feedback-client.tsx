"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import ItemForensicsDrawer from "@/components/stock/item-forensics-drawer";
import StockOrderSummary from "@/components/stock/stock-order-summary";
import QuantityControl from "@/components/ui/quantity-control";
import {
  AlertCircle,
  ChartColumn,
  ExternalLink,
  Loader2,
  Package,
  Send,
} from "@/lib/icons/lucide";
import DataTable from "@/components/ui/data-table/data-table";
import DataTableEmptyState from "@/components/ui/data-table/data-table-empty-state";
import DataTableHeader from "@/components/ui/data-table/data-table-header";
import DataTableSearchBar from "@/components/ui/data-table/data-table-search-bar";
import NumberBadge from "@/components/ui/data-table/number-badge";
import ItemCodeBadge from "@/components/ui/item-code-badge";
import type {
  IStockFeedbackRow,
  IStockRequestListRow,
} from "@/lib/interface";
import {
  useFetchStockFeedbackMutation,
  useFetchStockRequestsMutation,
  useRequestStockQuantityMutation,
  useSearchItemsMutation,
  useUpdateStockRequestMutation,
} from "@/hooks/queries/useApiMutations";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";
import {
  formatBranchLabel,
  normalizeBranchCode,
  resolveBranchName,
} from "@/lib/auth/branches";
import { getBranchColor } from "@/lib/branch-colors";
import { useSessionState } from "@/hooks/useSessionState";
import { useLoadOnChange } from "@/hooks/useLoadOnChange";
import {
  formatDaysLabel,
  formatNumber,
  toNumber,
} from "@/lib/utils/stock-feedback";
import { getAthensMonthName } from "@/lib/utils/athens-date";
import {
  formatDateTime,
  getRequestedQty,
  sortStockRequestRows,
} from "@/lib/utils/stock-requests";
import { itemSearchResultToSalesPaschaRow } from "@/lib/utils/sales-pascha";

const DAY_OPTIONS = [1, 3, 7, 10] as const;
const SALES_HISTORY_FIELDS = [
  { sales: "Y0", monthlyRate: "M0" },
  { sales: "Y1", monthlyRate: "M1" },
  { sales: "Y2", monthlyRate: "M2" },
  { sales: "Y3", monthlyRate: "M3" },
  { sales: "Y4", monthlyRate: "M4" },
] as const;
const AVAILABILITY_FIELDS = [
  { key: "YP1000", branch: "1000" },
  { key: "YP1006", branch: "1006" },
  { key: "YP1007", branch: "1007" },
] as const;

function TableSkeleton() {
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="grid grid-cols-12 gap-4 px-5 py-4">
          <div className="col-span-2 h-12 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="col-span-2 h-12 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="col-span-1 h-12 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="col-span-3 h-12 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="col-span-1 h-12 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="col-span-2 h-12 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="col-span-1 h-12 rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      ))}
    </div>
  );
}

export default function StockFeedbackClient({ embedded = false }: { embedded?: boolean }) {
  const user = useAuthStore((state) => state.user);
  const { mutateAsync: fetchStockFeedback } = useFetchStockFeedbackMutation();
  const { mutateAsync: fetchStockRequests } = useFetchStockRequestsMutation();
  const { mutateAsync: requestStockQuantity } = useRequestStockQuantityMutation();
  const { mutateAsync: updateStockRequest } = useUpdateStockRequestMutation();
  const { mutateAsync: searchItems, isPending: searchingItems } =
    useSearchItemsMutation();

  const currentBranchCode = useMemo(
    () => normalizeBranchCode(user?.mainBranch),
    [user?.mainBranch]
  );
  const availabilityFields = useMemo(
    () => [
      ...AVAILABILITY_FIELDS.filter(
        ({ branch }) => branch !== currentBranchCode
      ),
      ...AVAILABILITY_FIELDS.filter(
        ({ branch }) => branch === currentBranchCode
      ),
    ],
    [currentBranchCode]
  );
  const [days, setDays] = useState<number>(1);
  const [rows, setRows] = useState<IStockFeedbackRow[]>([]);
  const [itemSearchRows, setItemSearchRows] = useState<IStockFeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summaryRows, setSummaryRows] = useState<IStockRequestListRow[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const [summaryVisible, setSummaryVisible] = useState(true);
  const [updatingSummaryBasketIds, setUpdatingSummaryBasketIds] = useState<
    Set<string>
  >(new Set());
  const [selectedSummaryBasketIds, setSelectedSummaryBasketIds] = useState<
    Set<string>
  >(new Set());
  const [removingSummaryBasketIds, setRemovingSummaryBasketIds] = useState<
    Set<string>
  >(new Set());
  const [removingSelectedSummaryLines, setRemovingSelectedSummaryLines] =
    useState(false);
  const [searchTerm, setSearchTerm] = useSessionState(
    "stock-feedback-search",
    ""
  );
  const [requestQuantities, setRequestQuantities] = useState<
    Record<string, number>
  >({});
  const [requestErrors, setRequestErrors] = useState<Record<string, string>>({});
  const [submittingRequests, setSubmittingRequests] = useState<Set<string>>(
    new Set()
  );
  const [selectedForensicsItem, setSelectedForensicsItem] =
    useState<IStockFeedbackRow | null>(null);
  const itemSearchRequestId = useRef(0);
  const summaryLoadRequestId = useRef(0);
  const currentYear = new Date().getFullYear();
  const currentMonth = getAthensMonthName();
  const currentBranchLabel = useMemo(
    () => formatBranchLabel(currentBranchCode),
    [currentBranchCode]
  );
  const summaryRequestedQty = useMemo(
    () =>
      summaryRows.reduce((total, row) => {
        const quantity = Number(row.QTY_REQUESTED);
        return total + (Number.isFinite(quantity) ? quantity : 0);
      }, 0),
    [summaryRows]
  );

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");

    if (!currentBranchCode) {
      setRows([]);
      setLoading(false);
      setError("Δεν βρέθηκε ενεργό κατάστημα στο προφίλ χρήστη.");
      return;
    }

    try {
      const data = await fetchStockFeedback({
        branch: currentBranchCode,
        days,
      });

      const nextRows = [...(data.rows ?? [])].sort(
        (a, b) => toNumber(b.QTY_WIN) - toNumber(a.QTY_WIN)
      );

      setRows(nextRows);
    } catch (err) {
      setRows([]);
      setError(
        err instanceof Error
          ? err.message
          : "Αποτυχία φόρτωσης λίστας ανατροφοδοσίας."
      );
    } finally {
      setLoading(false);
    }
  }, [currentBranchCode, days, fetchStockFeedback]);

  useLoadOnChange(loadRows);

  const loadSummaryRows = useCallback(async () => {
    const requestId = ++summaryLoadRequestId.current;

    if (embedded || !currentBranchCode) {
      setSummaryRows([]);
      setSelectedSummaryBasketIds(new Set());
      setSummaryError("");
      setSummaryLoading(false);
      return;
    }

    setSummaryLoading(true);
    setSummaryError("");

    try {
      const data = await fetchStockRequests({
        branch: currentBranchCode,
        origin: "STORE",
      });

      if (requestId !== summaryLoadRequestId.current) return;

      const nextRows = sortStockRequestRows(data.rows ?? []);
      setSummaryRows(nextRows);
      setSelectedSummaryBasketIds(
        new Set(nextRows.map((row) => row.BASKETID))
      );
    } catch (summaryLoadError) {
      if (requestId !== summaryLoadRequestId.current) return;

      setSummaryRows([]);
      setSelectedSummaryBasketIds(new Set());
      setSummaryError(
        summaryLoadError instanceof Error
          ? summaryLoadError.message
          : "Αποτυχία φόρτωσης καλαθιού ανατροφοδοσίας."
      );
    } finally {
      if (requestId === summaryLoadRequestId.current) {
        setSummaryLoading(false);
      }
    }
  }, [currentBranchCode, embedded, fetchStockRequests]);

  useLoadOnChange(loadSummaryRows);

  const handleToggleSummaryLine = useCallback((basketId: string) => {
    setSelectedSummaryBasketIds((current) => {
      const next = new Set(current);
      if (next.has(basketId)) {
        next.delete(basketId);
      } else {
        next.add(basketId);
      }
      return next;
    });
  }, []);

  const handleRemoveSummaryLines = useCallback(
    async (lines: IStockRequestListRow[], bulk = false) => {
      if (lines.length === 0) return;

      const basketIds = new Set(lines.map((row) => row.BASKETID));

      setRemovingSummaryBasketIds((current) => {
        const next = new Set(current);
        basketIds.forEach((basketId) => next.add(basketId));
        return next;
      });
      if (bulk) {
        setRemovingSelectedSummaryLines(true);
      }

      try {
        const results = await Promise.allSettled(
          lines.map((row) =>
            updateStockRequest({
              action: "DELETE",
              basketId: Number(row.BASKETID),
              qty: row.QTY_REQUESTED || row.QTY || "1",
            })
          )
        );
        const failedCount = results.filter(
          (result) => result.status === "rejected"
        ).length;

        await loadSummaryRows();

        if (failedCount > 0) {
          toast.error(
            `${failedCount} ${failedCount === 1 ? "γραμμή δεν διαγράφηκε" : "γραμμές δεν διαγράφηκαν"}.`
          );
        } else {
          toast.success(
            lines.length === 1
              ? "Η γραμμή αφαιρέθηκε από το καλάθι."
              : "Οι επιλεγμένες γραμμές αφαιρέθηκαν από το καλάθι."
          );
        }
      } finally {
        setRemovingSummaryBasketIds((current) => {
          const next = new Set(current);
          basketIds.forEach((basketId) => next.delete(basketId));
          return next;
        });
        if (bulk) {
          setRemovingSelectedSummaryLines(false);
        }
      }
    },
    [loadSummaryRows, updateStockRequest]
  );

  const handleSummaryQuantityChange = useCallback(
    async (row: IStockRequestListRow, nextQuantity: number) => {
      const basketId = Number(row.BASKETID);

      if (!Number.isInteger(basketId) || basketId <= 0) {
        toast.error("Μη έγκυρο αναγνωριστικό καλαθιού.");
        return;
      }

      if (!Number.isInteger(nextQuantity) || nextQuantity <= 0) {
        toast.error("Η ποσότητα πρέπει να είναι θετικός ακέραιος αριθμός.");
        return;
      }

      const nextQuantityValue = String(nextQuantity);
      const previousQuantityValue = row.QTY_REQUESTED;

      if (nextQuantityValue === previousQuantityValue) return;

      setUpdatingSummaryBasketIds((current) =>
        new Set(current).add(row.BASKETID)
      );
      setSummaryRows((current) =>
        current.map((currentRow) =>
          currentRow.BASKETID === row.BASKETID
            ? { ...currentRow, QTY_REQUESTED: nextQuantityValue }
            : currentRow
        )
      );

      try {
        await updateStockRequest({
          action: "UPDATE",
          basketId,
          qty: nextQuantityValue,
        });
        toast.success("Η ποσότητα ενημερώθηκε.");
      } catch (updateError) {
        setSummaryRows((current) =>
          current.map((currentRow) =>
            currentRow.BASKETID === row.BASKETID
              ? { ...currentRow, QTY_REQUESTED: previousQuantityValue }
              : currentRow
          )
        );
        toast.error(
          updateError instanceof Error
            ? updateError.message
            : "Αποτυχία ενημέρωσης ποσότητας."
        );
      } finally {
        setUpdatingSummaryBasketIds((current) => {
          const next = new Set(current);
          next.delete(row.BASKETID);
          return next;
        });
      }
    },
    [updateStockRequest]
  );

  const availableRows = useMemo(() => {
    const salesMtrls = new Set(rows.map((row) => String(row.MTRL)));
    return [
      ...rows,
      ...itemSearchRows.filter((row) => !salesMtrls.has(String(row.MTRL))),
    ];
  }, [itemSearchRows, rows]);
  const itemSearchMtrls = useMemo(
    () => new Set(itemSearchRows.map((row) => String(row.MTRL))),
    [itemSearchRows]
  );
  const salesMtrls = useMemo(
    () => new Set(rows.map((row) => String(row.MTRL))),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return !query
      ? availableRows
      : availableRows.filter((row) => {
        if (itemSearchMtrls.has(String(row.MTRL))) return true;

        return [row.CODE, row.NAME]
          .join(" ")
          .toLowerCase()
          .includes(query);
      });
  }, [availableRows, itemSearchMtrls, searchTerm]);

  const handleSearchTermChange = useCallback(
    (nextSearchTerm: string) => {
      itemSearchRequestId.current += 1;
      setSearchTerm(nextSearchTerm);
      setItemSearchRows([]);
    },
    [setSearchTerm]
  );

  const handleItemSearch = useCallback(async () => {
    const query = searchTerm.trim();

    if (!query) return;

    const requestId = ++itemSearchRequestId.current;

    try {
      const result = await searchItems(query);

      if (requestId !== itemSearchRequestId.current) return;

      if (!result.success) {
        throw new Error(result.message || "Η αναζήτηση ειδών δεν ολοκληρώθηκε.");
      }

      const nextRows = (result.rows ?? []).map((item) =>
        itemSearchResultToSalesPaschaRow(item, {
          days: "1",
          branch: "",
        })
      );
      setItemSearchRows(nextRows);

      if (nextRows.length === 0) {
        toast.error("Δεν βρέθηκαν είδη στο ERP για αυτόν τον όρο.");
      }
    } catch (searchError) {
      if (requestId !== itemSearchRequestId.current) return;

      const message =
        searchError instanceof Error
          ? searchError.message
          : "Αποτυχία αναζήτησης ειδών στο ERP.";
      setItemSearchRows([]);
      toast.error(message);
    }
  }, [searchItems, searchTerm]);

  const getRequestQuantity = useCallback(
    (mtrl: string) => requestQuantities[mtrl] ?? 0,
    [requestQuantities]
  );

  const setRequestQuantity = useCallback((mtrl: string, nextQuantity: number) => {
    const normalizedQty = Number.isFinite(nextQuantity)
      ? Math.max(0, Math.floor(nextQuantity))
      : 0;

    setRequestQuantities((prev) => ({
      ...prev,
      [mtrl]: normalizedQty,
    }));
  }, []);

  const closeForensicsDrawer = useCallback(() => {
    setSelectedForensicsItem(null);
  }, []);

  const handleSubmitStockRequest = useCallback(
    async (row: IStockFeedbackRow) => {
      const mtrlKey = String(row.MTRL);
      const qty = getRequestQuantity(mtrlKey);
      const normalizedMtrl = Number(mtrlKey);

      if (!currentBranchCode) {
        setRequestErrors((prev) => ({
          ...prev,
          [mtrlKey]: "Δεν βρέθηκε ενεργό κατάστημα χρήστη.",
        }));
        return;
      }

      if (!Number.isFinite(normalizedMtrl) || normalizedMtrl <= 0) {
        setRequestErrors((prev) => ({
          ...prev,
          [mtrlKey]: "Μη έγκυρο MTRL για αίτημα ανατροφοδοσίας.",
        }));
        return;
      }

      if (!Number.isInteger(qty) || qty <= 0) {
        setRequestErrors((prev) => ({
          ...prev,
          [mtrlKey]: "Η ποσότητα πρέπει να είναι μεγαλύτερη από 0.",
        }));
        return;
      }

      setSubmittingRequests((prev) => new Set(prev).add(mtrlKey));
      setRequestErrors((prev) => ({
        ...prev,
        [mtrlKey]: "",
      }));

      try {
        const result = await requestStockQuantity({
          mtrl: normalizedMtrl,
          qty,
          branch: currentBranchCode,
          origin: "STORE",
        });

        setRequestQuantity(mtrlKey, 0);
        void loadSummaryRows();
        const requestId = String(result.rows?.[0]?.NEW_ID ?? "").trim();
        toast.success(
          `ID: ${requestId || "—"} έχει καταχωρηθεί στα Αιτήματα Ανατροφοδοσίας επιτυχώς`
        );
      } catch (submitError) {
        const message =
          submitError instanceof Error
            ? submitError.message
            : "Αποτυχία καταχώρησης αιτήματος ανατροφοδοσίας.";
        setRequestErrors((prev) => ({
          ...prev,
          [mtrlKey]: message,
        }));
        toast.error(message);
      } finally {
        setSubmittingRequests((prev) => {
          const next = new Set(prev);
          next.delete(mtrlKey);
          return next;
        });
      }
    },
    [
      currentBranchCode,
      getRequestQuantity,
      loadSummaryRows,
      requestStockQuantity,
      setRequestQuantity,
    ]
  );

  return (
    <div
      className={
        embedded
          ? "w-full max-w-none space-y-4"
          : "flex min-h-[calc(100dvh-8rem)] min-w-0 max-w-full flex-col md:min-h-[calc(100dvh-9rem)] xl:h-[calc(100dvh-9rem)] xl:min-h-0 xl:overflow-hidden"
      }
    >
      <div className={embedded ? "space-y-4" : "shrink-0 space-y-4"}>
        {!embedded && <PageBreadcrumb pageTitle="Ανατροφοδοσία Καταστήματος" />}

        {error && (
          <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Δεν ήταν δυνατή η φόρτωση δεδομένων</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}
      </div>

      <div
        className={
          embedded
            ? ""
            : "mt-4 flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-5 xl:min-h-0 xl:flex-row"
        }
      >
        <DataTable
          className={
            embedded
              ? "flex h-[36rem] min-h-[20rem] flex-col"
              : "flex h-[60dvh] min-h-[20rem] min-w-0 max-w-full shrink-0 flex-col overflow-hidden xl:h-auto xl:min-h-0 xl:max-h-full xl:flex-1 xl:basis-3/4 xl:shrink"
          }
        >
        <DataTableHeader
          className="shrink-0"
          title={embedded ? (
            <Link href="/stock-feedback" className="inline-flex items-center gap-2 hover:text-brand-600 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-brand-500 dark:hover:text-brand-300">
              Έλεγχος Αποθέματος - Πίνακας Τελευταίων Πωλήσεων
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Link>
          ) : "Έλεγχος Αποθέματος - Πίνακας Τελευταίων Πωλήσεων"}
          description={`${filteredRows.length} από ${availableRows.length} είδη · ${formatDaysLabel(days)}`}
          action={(
            <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
              <label className="flex h-10 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                Περίοδος:
                <select
                  value={days}
                  onChange={(event) => setDays(Number(event.target.value))}
                  disabled={loading}
                  className="min-w-[140px] border-0 bg-transparent text-xs font-semibold text-gray-700 outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-200"
                >
                  {DAY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatDaysLabel(option)}
                    </option>
                  ))}
                </select>
              </label>

              <DataTableSearchBar
                value={searchTerm}
                onChange={handleSearchTermChange}
                onSubmit={() => void handleItemSearch()}
                onClear={() => handleSearchTermChange("")}
                onRefresh={loadRows}
                isRefreshing={loading}
                isSubmitting={searchingItems}
                refreshDisabled={loading}
                submitDisabled={loading}
                placeholder="Κωδικός ή περιγραφή · Enter για ERP..."
              />
            </div>
          )}
        />

        {loading ? (
          <TableSkeleton />
        ) : filteredRows.length === 0 ? (
          <DataTableEmptyState
            icon={<Package className="h-7 w-7" />}
            title="Δεν βρέθηκαν ανταλλακτικά"
            description="Δεν υπάρχουν δεδομένα για τα επιλεγμένα φίλτρα. Πατήστε «Αναζήτηση ERP» για είδη εκτός της λίστας πωλήσεων."
          />
        ) : (
          <div className="min-h-0 w-full flex-1 overflow-auto">
            <table className="w-full min-w-[1500px] table-fixed divide-y divide-gray-100 text-sm dark:divide-gray-800">
              <colgroup>
                <col className="w-[12%]" />
                <col className="w-[16%]" />
                <col className="w-[6%]" />
                <col className="w-[24%]" />
                <col className="w-[5%]" />
                <col className="w-[20%]" />
                <col className="w-[17%]" />
              </colgroup>

              <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-950">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Κωδικός
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Είδος
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Πωλήσεις
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Ιστορικό πωλήσεων
                  </th>
                  <th className="px-1 py-3 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Σε Εξέλιξη
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Διαθεσιμότητα
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Αίτημα
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredRows.map((row, index) => {
                  const totalAvail = toNumber(row.TOTAL_AVAIL);
                  const qtySold = toNumber(row.QTY_WIN);
                  const mtrlKey = String(row.MTRL);
                  const requestQty = getRequestQuantity(mtrlKey);
                  const requestError = requestErrors[mtrlKey] ?? "";
                  const isSubmittingRequest = submittingRequests.has(mtrlKey);
                  const isItemSearchResult =
                    itemSearchMtrls.has(mtrlKey) && !salesMtrls.has(mtrlKey);

                  return (
                    <tr
                      key={`${row.MTRL}-${row.CODE}-${index}`}
                      className="transition hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                    >
                      <td className="px-3 py-2 align-middle">
                        <button
                          type="button"
                          onClick={() => setSelectedForensicsItem(row)}
                          className="group/item inline-flex max-w-full flex-col items-start gap-1.5 rounded-xl px-2 py-2 text-left transition hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:hover:bg-brand-500/10"
                          aria-label={`Προβολή ιστορικού πωλήσεων για τον κωδικό ${row.CODE || "—"}`}
                          title="Προβολή ιστορικού πωλήσεων"
                        >
                          <span className="inline-flex max-w-full items-center gap-2">
                            <ItemCodeBadge
                              code={row.CODE}
                              className="transition group-hover/item:border-brand-300 group-hover/item:bg-white dark:group-hover/item:border-brand-400 dark:group-hover/item:bg-gray-900"
                            />
                            <ChartColumn className="h-4 w-4 shrink-0 text-gray-300 transition group-hover/item:text-brand-500 dark:text-gray-600" />
                          </span>
                          {isItemSearchResult ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium leading-tight text-gray-500 shadow-xs transition group-hover/item:border-gray-300 group-hover/item:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:group-hover/item:border-gray-600 dark:group-hover/item:bg-gray-800">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
                              Αποτέλεσμα αναζήτησης ERP
                            </span>
                          ) : null}
                        </button>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <p className="break-words font-medium leading-5 text-gray-900 dark:text-white">
                          {row.NAME || "—"}
                        </p>
                        <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
                          <span>CODE1: <strong className="font-medium text-gray-700 dark:text-gray-300">{row.CODE1 || "—"}</strong></span>
                          <span>SUFFIX: <strong className="font-medium text-gray-700 dark:text-gray-300">{row.CCCSUFIX || "—"}</strong></span>
                          <span>GROUP: <strong className="font-medium text-gray-700 dark:text-gray-300">{row.ZGROUP_CODE || "—"}</strong></span>
                          <span>B2B: <strong className="font-medium text-gray-700 dark:text-gray-300">{row.ZB2B_CODE || "—"}</strong></span>
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-center align-middle tabular-nums font-semibold text-gray-900 dark:text-white">
                        {formatNumber(qtySold)}
                      </td>

                      <td className="px-4 py-4 align-middle">
                        {isItemSearchResult ? (
                          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                            Δεν παρέχεται από την αναζήτηση ERP
                          </p>
                        ) : (
                          <div className="grid grid-cols-5 gap-1.5">
                            {SALES_HISTORY_FIELDS.map(({ sales, monthlyRate }, historyIndex) => {
                              const year = currentYear - historyIndex;

                              return (
                                <div
                                  key={sales}
                                  className="min-w-0 rounded-lg bg-gray-50 px-1.5 py-1.5 text-center dark:bg-gray-800/70"
                                  title={`${sales}-${year} · ${monthlyRate}-${currentMonth}`}
                                >
                                  <p className="whitespace-nowrap text-[10px] font-medium leading-tight text-gray-400 dark:text-gray-500">
                                    {year}
                                  </p>
                                  <p className="mt-0.5 text-sm font-semibold tabular-nums leading-tight text-gray-800 dark:text-gray-100">
                                    {formatNumber(row[sales])}
                                  </p>
                                  <p className="mt-1 whitespace-nowrap text-[10px] font-medium leading-tight text-gray-400 dark:text-gray-500">
                                    {currentMonth}
                                  </p>
                                  <p className="mt-0.5 text-xs font-medium tabular-nums leading-tight text-gray-600 dark:text-gray-300">
                                    {formatNumber(row[monthlyRate])}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-1 py-4 text-center align-middle text-xs tabular-nums text-gray-700 dark:text-gray-200">
                        {formatNumber(row.ONGOING)}
                      </td>

                      <td className="px-4 py-4 align-middle">
                        <div className="grid grid-cols-4 gap-1.5">
                          {availabilityFields.map(({ key, branch }) => {
                            const isLoggedInBranch = branch === currentBranchCode;

                            return (
                              <div
                                key={key}
                                className={[
                                  "min-w-0 rounded-lg px-1.5 py-1.5 text-center",
                                  isLoggedInBranch
                                    ? getBranchColor(branch)
                                    : "bg-gray-50 dark:bg-gray-800/70",
                                ].join(" ")}
                                title={`${key} · ${resolveBranchName(branch)}`}
                              >
                                <p
                                  className={[
                                    "truncate text-[10px] font-medium",
                                    isLoggedInBranch
                                      ? "opacity-75"
                                      : "text-gray-400 dark:text-gray-500",
                                  ].join(" ")}
                                >
                                  {key}
                                </p>
                                <p
                                  className={[
                                    "mt-0.5 font-semibold tabular-nums",
                                    isLoggedInBranch
                                      ? ""
                                      : "text-gray-800 dark:text-gray-100",
                                  ].join(" ")}
                                >
                                  {formatNumber(row[key])}
                                </p>
                              </div>
                            );
                          })}
                          <div className="flex min-w-0 flex-col items-center rounded-lg bg-brand-50 px-1.5 py-1.5 text-center dark:bg-brand-500/10">
                            <p className="text-[10px] font-medium text-brand-500 dark:text-brand-300">
                              TOTAL
                            </p>
                            <NumberBadge
                              value={formatNumber(totalAvail)}
                              variant={totalAvail > 0 ? "success" : "danger"}
                              className="mt-0.5 min-w-0 px-2 py-0.5"
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-2 py-3 align-middle">
                        <div className="flex min-w-0 flex-col items-stretch justify-center gap-2">
                          <QuantityControl
                            value={requestQty}
                            onChange={(nextQty) => {
                              setRequestQuantity(mtrlKey, nextQty);
                              setRequestErrors((prev) => ({
                                ...prev,
                                [mtrlKey]: "",
                              }));
                            }}
                            min={0}
                            size="sm"
                            fullWidth
                            disabled={isSubmittingRequest}
                            displayZeroAsEmpty
                            placeholder="0"
                            decrementLabel="Μείωση ποσότητας ανατροφοδοσίας"
                            incrementLabel="Αύξηση ποσότητας ανατροφοδοσίας"
                          />
                          <button
                            type="button"
                            onClick={() => void handleSubmitStockRequest(row)}
                            disabled={isSubmittingRequest || requestQty <= 0 || !currentBranchCode}
                            className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-800/70 dark:disabled:text-gray-500"
                          >
                            {isSubmittingRequest ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                            <span>Αίτημα</span>
                          </button>

                          {requestError && (
                            <p className="text-left text-[11px] font-medium leading-4 text-red-500">
                              {requestError}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        </DataTable>
        {!embedded ? (
          <StockOrderSummary
            rows={summaryRows}
            requestedQtyTotal={summaryRequestedQty}
            branchLabel={currentBranchLabel}
            title="Καλάθι Ανατροφοδοσίας Καταστήματος"
            basketTitle="Αιτήματα Ανατροφοδοσίας"
            emptyMessage="Δεν υπάρχουν αιτήματα στο καλάθι."
            error={summaryError}
            onChangeQuantity={(row, quantity) =>
              void handleSummaryQuantityChange(row, quantity)
            }
            updatingBasketIds={updatingSummaryBasketIds}
            selectedBasketIds={selectedSummaryBasketIds}
            removingBasketIds={removingSummaryBasketIds}
            removingSelectedLines={removingSelectedSummaryLines}
            onToggleLineSelection={handleToggleSummaryLine}
            onRemoveLine={(row) => void handleRemoveSummaryLines([row])}
            onRemoveSelectedLines={() =>
              void handleRemoveSummaryLines(
                summaryRows.filter((row) =>
                  selectedSummaryBasketIds.has(row.BASKETID)
                ),
                true
              )
            }
            getRequestedQty={getRequestedQty}
            formatDateTime={formatDateTime}
            loading={summaryLoading}
            onRefresh={loadSummaryRows}
            collapsible
            collapsed={!summaryVisible}
            onToggleCollapse={() => setSummaryVisible((visible) => !visible)}
          />
        ) : null}
      </div>
      {selectedForensicsItem ? (
        <ItemForensicsDrawer
          key={`${selectedForensicsItem.MTRL}-${days}-${currentBranchCode}`}
          item={selectedForensicsItem}
          days={days}
          branch={currentBranchCode}
          onClose={closeForensicsDrawer}
        />
      ) : null}
    </div>
  );
}
