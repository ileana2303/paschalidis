"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import {
  AlertCircle,
  CalendarDays,
  Check,
  Loader2,
  Minus,
  Package,
  Plus,
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
import StatusBadge from "@/components/ui/data-table/status-badge";
import type { IStockFeedbackRow, StockRequestStatus } from "@/lib/interface";
import {
  useFetchStockFeedbackMutation,
  useRequestStockQuantityMutation,
} from "@/hooks/queries/useApiMutations";
import { useAuthStore } from "@/stores/authStore";
import { normalizeBranchCode } from "@/lib/auth/branches";

const DAY_OPTIONS = [0, 1, 2, 3, 4, 5] as const;

function formatDaysLabel(days: number) {
  if (days === 0) return "Σήμερα";
  if (days === 1) return "1 ημέρα πριν";
  return `${days} ημέρες πριν`;
}

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(String(value ?? "").trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: string | number | null | undefined) {
  return new Intl.NumberFormat("el-GR", {
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function getRequestStatusLabel(
  status: StockRequestStatus,
  requestedQty?: number
) {
  if (status === "approved") return "Approved";
  if (status === "deleted") return "Deleted";
  if (Number.isInteger(requestedQty) && Number(requestedQty) > 0) {
    return `Pending: ${requestedQty}`;
  }
  return "Pending";
}

function isCurrentBranchStockColumn(
  currentBranchCode: string,
  branchCode: "1001" | "1006" | "1007"
) {
  return currentBranchCode === branchCode;
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
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-4">
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

export default function StockFeedbackClient() {
  const user = useAuthStore((state) => state.user);
  const { mutateAsync: fetchStockFeedback } = useFetchStockFeedbackMutation();
  const { mutateAsync: requestStockQuantity } = useRequestStockQuantityMutation();

  const currentBranchCode = useMemo(
    () => normalizeBranchCode(user?.s1code),
    [user?.s1code]
  );

  const [days, setDays] = useState<number>(0);
  const [rows, setRows] = useState<IStockFeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [requestQuantities, setRequestQuantities] = useState<
    Record<string, number>
  >({});
  const [requestStatuses, setRequestStatuses] = useState<
    Record<string, StockRequestStatus>
  >({});
  const [requestedStatusQty, setRequestedStatusQty] = useState<
    Record<string, number>
  >({});
  const [requestErrors, setRequestErrors] = useState<Record<string, string>>({});
  const [successToastMessage, setSuccessToastMessage] = useState("");
  const [submittingRequests, setSubmittingRequests] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (!successToastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessToastMessage("");
    }, 3200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [successToastMessage]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");

    if (!currentBranchCode) {
      setRows([]);
      setRequestStatuses({});
      setRequestedStatusQty({});
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

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const visibleRows = !query
      ? rows
      : rows.filter((row) => {
        return [row.MTRL, row.CODE, row.NAME]
          .join(" ")
          .toLowerCase()
          .includes(query);
      });

    return visibleRows
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const aIsPending = requestStatuses[String(a.row.MTRL)] === "pending";
        const bIsPending = requestStatuses[String(b.row.MTRL)] === "pending";

        if (aIsPending !== bIsPending) {
          return aIsPending ? 1 : -1;
        }

        return a.index - b.index;
      })
      .map(({ row }) => row);
  }, [rows, searchTerm, requestStatuses]);

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

  const handleRequestQuantityInput = useCallback(
    (mtrl: string, value: string) => {
      const normalizedValue = value.trim();

      if (!normalizedValue) {
        setRequestQuantity(mtrl, 0);
        return;
      }

      if (!/^\d+$/.test(normalizedValue)) {
        return;
      }

      setRequestQuantity(mtrl, Number(normalizedValue));
      setRequestErrors((prev) => ({
        ...prev,
        [mtrl]: "",
      }));
    },
    [setRequestQuantity]
  );

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
        await requestStockQuantity({
          mtrl: normalizedMtrl,
          qty,
          branch: currentBranchCode,
        });

        setRequestStatuses((prev) => ({
          ...prev,
          [mtrlKey]: "pending",
        }));
        setRequestedStatusQty((prev) => ({
          ...prev,
          [mtrlKey]: (prev[mtrlKey] ?? 0) + qty,
        }));
        setRequestQuantity(mtrlKey, 0);
        setSuccessToastMessage(
          `Το αίτημα για ${qty} τεμ. καταχωρήθηκε για το είδος ${row.CODE}.`
        );
      } catch (submitError) {
        setRequestErrors((prev) => ({
          ...prev,
          [mtrlKey]:
            submitError instanceof Error
              ? submitError.message
              : "Αποτυχία καταχώρησης αιτήματος ανατροφοδοσίας.",
        }));
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
      {successToastMessage && (
        <div className="fixed right-6 top-6 z-[100000]">
          <div
            role="status"
            className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-lg dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
          >
            <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
              <Check className="h-3.5 w-3.5" />
            </span>
            <p className="max-w-[280px] leading-5">{successToastMessage}</p>
          </div>
        </div>
      )}

      <PageBreadcrumb pageTitle="Ανατροφοδοσία Καταστήματος" />

      <div className="w-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
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
                  Έλεγχος πωλήσεων και διαθέσιμων ποσοτήτων για το ενεργό
                  κατάστημα.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Περίοδος
              </span>

              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                <select
                  value={days}
                  onChange={(event) => setDays(Number(event.target.value))}
                  className="h-10 min-w-[190px] rounded-xl border border-gray-300 bg-white pl-9 pr-8 text-sm font-medium text-gray-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  {DAY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatDaysLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <button
              type="button"
              onClick={loadRows}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Ανανέωση
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Δεν ήταν δυνατή η φόρτωση δεδομένων</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Είδη"
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
      </div>

      <DataTable>
        <DataTableHeader
          title="Λίστα Ειδών"
          description={`${filteredRows.length} από ${rows.length} είδη · ${formatDaysLabel(days)}`}
          action={(
            <DataTableSearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              onRefresh={loadRows}
              isRefreshing={loading}
              refreshDisabled={loading}
              placeholder="Αναζήτηση με κωδικό, MTRL ή περιγραφή..."
            />
          )}
        />

        {loading ? (
          <TableSkeleton />
        ) : filteredRows.length === 0 ? (
          <DataTableEmptyState
            icon={<Package className="h-7 w-7" />}
            title="Δεν βρέθηκαν είδη"
            description="Δεν υπάρχουν δεδομένα για τα επιλεγμένα φίλτρα ή η αναζήτηση δεν επέστρεψε αποτελέσματα."
          />
        ) : (
          <div className="max-h-[70vh] w-full overflow-y-auto">
            <table className="w-full table-fixed divide-y divide-gray-100 text-sm dark:divide-gray-800">
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[8%]" />
                <col className="w-[7%]" />
                <col className="w-[8%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[9%]" />
                <col className="w-[10%]" />
                <col className="w-[13%]" />
              </colgroup>

              <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-950">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Είδος
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    MTRL
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Πωλήσεις
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Σε εξέλιξη
                  </th>
                  <th
                    className={[
                      "px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide",
                      isCurrentBranchStockColumn(currentBranchCode, "1001")
                        ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200"
                        : "text-gray-500 dark:text-gray-400",
                    ].join(" ")}
                  >
                    Κασομούλη
                  </th>
                  <th
                    className={[
                      "px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide",
                      isCurrentBranchStockColumn(currentBranchCode, "1006")
                        ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200"
                        : "text-gray-500 dark:text-gray-400",
                    ].join(" ")}
                  >
                    Λ.Αθηνών
                  </th>
                  <th
                    className={[
                      "px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide",
                      isCurrentBranchStockColumn(currentBranchCode, "1007")
                        ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200"
                        : "text-gray-500 dark:text-gray-400",
                    ].join(" ")}
                  >
                    Λ.Μεσογείων
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Διαθέσιμο
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Κατάσταση
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
                  const requestStatus = requestStatuses[mtrlKey] ?? null;
                  const statusRequestedQty = requestedStatusQty[mtrlKey];
                  const requestError = requestErrors[mtrlKey] ?? "";
                  const isSubmittingRequest = submittingRequests.has(mtrlKey);

                  return (
                    <tr
                      key={`${row.MTRL}-${row.CODE}-${index}`}
                      className="transition hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                    >
                      <td className="px-5 py-4 align-top">
                        <div className="pr-4">
                          <p className="break-words font-medium leading-5 text-gray-900 dark:text-white">
                            {row.NAME}
                          </p>

                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Κωδικός:{" "}
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {row.CODE}
                            </span>
                          </p>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 align-top text-gray-600 dark:text-gray-300">
                        {row.MTRL}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right align-top tabular-nums font-semibold text-gray-900 dark:text-white">
                        {formatNumber(qtySold)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right align-top tabular-nums text-gray-700 dark:text-gray-200">
                        {formatNumber(row.ONGOING)}
                      </td>

                      <td
                        className={[
                          "whitespace-nowrap px-5 py-4 text-right align-top tabular-nums",
                          isCurrentBranchStockColumn(currentBranchCode, "1001")
                            ? "bg-brand-50/60 font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-200"
                            : "text-gray-700 dark:text-gray-200",
                        ].join(" ")}
                      >
                        {formatNumber(row.YP1001)}
                      </td>

                      <td
                        className={[
                          "whitespace-nowrap px-5 py-4 text-right align-top tabular-nums",
                          isCurrentBranchStockColumn(currentBranchCode, "1006")
                            ? "bg-brand-50/60 font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-200"
                            : "text-gray-700 dark:text-gray-200",
                        ].join(" ")}
                      >
                        {formatNumber(row.YP1006)}
                      </td>

                      <td
                        className={[
                          "whitespace-nowrap px-5 py-4 text-right align-top tabular-nums",
                          isCurrentBranchStockColumn(currentBranchCode, "1007")
                            ? "bg-brand-50/60 font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-200"
                            : "text-gray-700 dark:text-gray-200",
                        ].join(" ")}
                      >
                        {formatNumber(row.YP1007)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right align-top tabular-nums">
                        <NumberBadge
                          value={formatNumber(totalAvail)}
                          variant={totalAvail > 0 ? "success" : "danger"}
                          className="min-w-[72px]"
                        />
                      </td>

                      <td className="px-5 py-4 align-top">
                        <div className="flex justify-end">
                          {requestStatus ? (
                            <StatusBadge
                              status={requestStatus}
                              label={getRequestStatusLabel(
                                requestStatus,
                                statusRequestedQty
                              )}
                            />
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex w-full items-center justify-end gap-2">
                            <div className="inline-flex items-center rounded-xl border border-gray-200/80 bg-gray-50/70 p-1 shadow-sm dark:border-gray-700/70 dark:bg-gray-900/60">
                              <button
                                type="button"
                                onClick={() => setRequestQuantity(mtrlKey, requestQty - 1)}
                                disabled={requestQty <= 0 || isSubmittingRequest}
                                aria-label="Μείωση ποσότητας ανατροφοδοσίας"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-white hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-35 dark:hover:bg-gray-800 dark:hover:text-white"
                              >
                                <Minus className="h-4 w-4" />
                              </button>

                              <input
                                type="text"
                                inputMode="numeric"
                                value={requestQty === 0 ? "" : requestQty}
                                placeholder="0"
                                onChange={(event) =>
                                  handleRequestQuantityInput(mtrlKey, event.target.value)
                                }
                                disabled={isSubmittingRequest}
                                className="h-8 w-12 border-0 bg-transparent px-1 text-center text-sm font-semibold tabular-nums text-gray-900 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-70 dark:text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />

                              <button
                                type="button"
                                onClick={() => setRequestQuantity(mtrlKey, requestQty + 1)}
                                disabled={isSubmittingRequest}
                                aria-label="Αύξηση ποσότητας ανατροφοδοσίας"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-white hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-35 dark:hover:bg-gray-800 dark:hover:text-white"
                              >
                                <Plus className="h-4 w-4" />
                              </button>

                              <div className="mx-1 h-6 w-px bg-gray-200/70 dark:bg-gray-700/60" />

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
    </div>
  );
}
