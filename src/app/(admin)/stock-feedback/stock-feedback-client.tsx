"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import ItemForensicsDrawer from "@/components/stock/item-forensics-drawer";
import QuantityControl from "@/components/ui/quantity-control";
import {
  AlertCircle,
  ChartColumn,
  ExternalLink,
  Loader2,
  Package,
  RefreshCw,
  Send,
  ShoppingCart,
  Warehouse,
} from "@/lib/icons/lucide";
import DataTable from "@/components/ui/data-table/data-table";
import DataTableEmptyState from "@/components/ui/data-table/data-table-empty-state";
import DataTableHeader from "@/components/ui/data-table/data-table-header";
import DataTableSearchBar from "@/components/ui/data-table/data-table-search-bar";
import NumberBadge from "@/components/ui/data-table/number-badge";
import ItemCodeBadge from "@/components/ui/item-code-badge";
import type { IItem, IStockFeedbackRow } from "@/lib/interface";
import {
  useFetchStockFeedbackMutation,
  useRequestStockQuantityMutation,
  useSearchItemsMutation,
} from "@/hooks/queries/useApiMutations";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";
import { getStockBranchOrder, normalizeBranchCode, resolveBranchName } from "@/lib/auth/branches";
import { getBranchColor } from "@/lib/branch-colors";
import { useSessionState } from "@/hooks/useSessionState";
import { useLoadOnChange } from "@/hooks/useLoadOnChange";
import {
  formatDaysLabel,
  formatNumber,
  toNumber,
} from "@/lib/utils/stock-feedback";

const DAY_OPTIONS = [0, 1, 2, 3, 4, 5] as const;

function itemSearchResultToStockFeedbackRow(item: IItem): IStockFeedbackRow {
  return {
    MTRL: item.MTRL,
    CODE: item.ITEM_CODE,
    NAME: item.ITEM_DESCR,
    CODE1: item.CODE1_0,
    CODE2: item.ITEM_CODE2,
    QTY_SOLD: "0",
    ONGOING: item.ONGOING,
    YP1000: item.YP1000,
    YP1006: item.YP1006,
    YP1007: item.YP1007,
    TOTAL_AVAIL: item.TOTAL_AVAIL,
    RES1000: item.RES1000,
    RES1006: item.RES1006,
    RES1007: item.RES1007,
    RES_TOTAL: item.RES_TOTAL,
    END1000: item.END1000,
    END1006: item.END1006,
    END1007: item.END1007,
    END_TOTAL: item.END_TOTAL,
    FREE_AVAIL: item.NET_QTY_AVAILABLE,
    RES_BRANCH: "0",
    YP_BRANCH: "0",
  };
}

function KpiCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {value}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="grid grid-cols-12 gap-4 px-5 py-4">
          <div className="col-span-4 h-4 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="col-span-1 h-4 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="col-span-1 h-4 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="col-span-1 h-4 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="col-span-1 h-4 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="col-span-1 h-4 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="col-span-1 h-4 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="col-span-2 h-4 rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      ))}
    </div>
  );
}

export default function StockFeedbackClient({ embedded = false }: { embedded?: boolean }) {
  const user = useAuthStore((state) => state.user);
  const { mutateAsync: fetchStockFeedback } = useFetchStockFeedbackMutation();
  const { mutateAsync: requestStockQuantity } = useRequestStockQuantityMutation();
  const { mutateAsync: searchItems, isPending: searchingItems } =
    useSearchItemsMutation();

  const currentBranchCode = useMemo(
    () => normalizeBranchCode(user?.mainBranch),
    [user?.mainBranch]
  );
  const stockBranchColumns = useMemo(() => {
    const branches = getStockBranchOrder(currentBranchCode);
    return [
      ...branches.filter((branch) => branch !== currentBranchCode),
      ...branches.filter((branch) => branch === currentBranchCode),
    ];
  }, [currentBranchCode]);

  const [days, setDays] = useState<number>(0);
  const [rows, setRows] = useState<IStockFeedbackRow[]>([]);
  const [itemSearchRows, setItemSearchRows] = useState<IStockFeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
        (a, b) => toNumber(b.QTY_SOLD) - toNumber(a.QTY_SOLD)
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

      const nextRows = (result.rows ?? []).map(itemSearchResultToStockFeedbackRow);
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
    [currentBranchCode, getRequestQuantity, requestStockQuantity, setRequestQuantity]
  );

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.qtySold += toNumber(row.QTY_SOLD);
        acc.ongoing += toNumber(row.ONGOING);
        acc.totalAvail += toNumber(row.TOTAL_AVAIL);
        return acc;
      },
      {
        qtySold: 0,
        ongoing: 0,
        totalAvail: 0,
      }
    );
  }, [rows]);

  return (
    <div className="w-full max-w-none space-y-6">
      {!embedded && <PageBreadcrumb pageTitle="Ανατροφοδοσία Καταστήματος" />}

      {!embedded && <div className="w-full rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                <Warehouse className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Ανατροφοδοσία Καταστήματος
                </h1>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  Έλεγχος αποθέματος και διαθέσιμων ποσοτήτων ανά κατάστημα και χρονική περίοδο.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>}

      {error && (
        <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Δεν ήταν δυνατή η φόρτωση δεδομένων</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {!embedded && <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="ΠΡΟΪΌΝΤΑ"
          value={formatNumber(rows.length)}
          description="Σύνολο γραμμών αποτελεσμάτων"
          icon={Package}
        />

        <KpiCard
          title="Πωληθείσα ποσότητα"
          value={formatNumber(totals.qtySold)}
          description={formatDaysLabel(days)}
          icon={ShoppingCart}
        />

        <KpiCard
          title="Σε εξέλιξη"
          value={formatNumber(totals.ongoing)}
          description="Ποσότητες σε ανοικτές κινήσεις"
          icon={RefreshCw}
        />

        <KpiCard
          title="Συνολική διαθεσιμότητα"
          value={formatNumber(totals.totalAvail)}
          description="Άθροισμα TOTAL_AVAIL"
          icon={Warehouse}
        />
      </div>}

      <DataTable className={embedded ? "flex h-[36rem] min-h-[20rem] flex-col" : "flex h-[calc(100dvh-8rem)] min-h-[20rem] flex-col"}>
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
            <table className="w-full min-w-[1380px] table-fixed divide-y divide-gray-100 text-sm dark:divide-gray-800">
              <colgroup>
                <col className="w-[12%]" />
                <col className="w-[18%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[24%]" />
              </colgroup>

              <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-950">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Κωδικός
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Είδος
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Πωλήσεις
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Σε εξέλιξη
                  </th>
                  {stockBranchColumns.map((branch) => (
                    <th
                      key={branch}
                      className={[
                        "px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide",
                        branch === currentBranchCode
                          ? getBranchColor(branch)
                          : "text-gray-500 dark:text-gray-400",
                      ].join(" ")}
                    >
                      {resolveBranchName(branch)}
                    </th>
                  ))}
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Διαθέσιμο
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Αίτημα
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredRows.map((row, index) => {
                  const totalAvail = toNumber(row.TOTAL_AVAIL);
                  const qtySold = toNumber(row.QTY_SOLD);
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
                      <td className="px-3 py-2 align-top">
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
                      <td className="px-5 py-4 align-top">
                        <p className="break-words font-medium leading-5 text-gray-900 dark:text-white">
                          {row.NAME || "—"}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right align-top tabular-nums font-semibold text-gray-900 dark:text-white">
                        {formatNumber(qtySold)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right align-top tabular-nums text-gray-700 dark:text-gray-200">
                        {formatNumber(row.ONGOING)}
                      </td>

                      {stockBranchColumns.map((branch) => (
                        <td
                          key={branch}
                          className={[
                            "whitespace-nowrap px-5 py-4 text-right align-top tabular-nums",
                            branch === currentBranchCode
                              ? `font-semibold ${getBranchColor(branch)}`
                              : "text-gray-700 dark:text-gray-200",
                          ].join(" ")}
                        >
                          {formatNumber(row[`YP${branch}`])}
                        </td>
                      ))}

                      <td className="whitespace-nowrap px-5 py-4 text-right align-top tabular-nums">
                        <NumberBadge
                          value={formatNumber(totalAvail)}
                          variant={totalAvail > 0 ? "success" : "danger"}
                          className="min-w-[72px]"
                        />
                      </td>

                      <td className="px-5 py-4 align-top">
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex w-full items-center justify-end gap-2">
                            <div className="inline-flex items-center gap-2">
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
                                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-800/70 dark:disabled:text-gray-500"
                              >
                                {isSubmittingRequest ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Send className="h-3.5 w-3.5" />
                                )}
                                <span>Αίτημα</span>
                              </button>
                            </div>
                          </div>

                          {requestError && (
                            <p className="max-w-[220px] text-right text-[11px] font-medium leading-4 text-red-500">
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
      {selectedForensicsItem ? (
        <ItemForensicsDrawer
          key={`${selectedForensicsItem.MTRL}-${days}`}
          item={selectedForensicsItem}
          days={days}
          onClose={closeForensicsDrawer}
        />
      ) : null}
    </div>
  );
}
