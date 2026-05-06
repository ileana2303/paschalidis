"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/template components/common/PageBreadCrumb";
import {
  AlertCircle,
  CalendarDays,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  Warehouse,
} from "@/lib/icons/lucide";
import type { IStockFeedbackRow } from "@/lib/interface";
import { useFetchStockFeedbackMutation } from "@/hooks/queries/useApiMutations";
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

  const currentBranchCode = useMemo(
    () => normalizeBranchCode(user?.s1code),
    [user?.s1code]
  );

  const [days, setDays] = useState<number>(0);
  const [rows, setRows] = useState<IStockFeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

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

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return rows;

    return rows.filter((row) => {
      return [row.MTRL, row.CODE, row.NAME]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [rows, searchTerm]);

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
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
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

      <section className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Λίστα Ειδών
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {filteredRows.length} από {rows.length} είδη ·{" "}
                {formatDaysLabel(days)}
              </p>
            </div>

            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Αναζήτηση με κωδικό, MTRL ή περιγραφή..."
                className="h-10 w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <TableSkeleton />
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <Package className="h-7 w-7" />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">
              Δεν βρέθηκαν είδη
            </h3>

            <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
              Δεν υπάρχουν δεδομένα για τα επιλεγμένα φίλτρα ή η αναζήτηση δεν
              επέστρεψε αποτελέσματα.
            </p>
          </div>
        ) : (
          <div className="max-h-[70vh] w-full overflow-y-auto">
            <table className="w-full table-fixed divide-y divide-gray-100 text-sm dark:divide-gray-800">
              <colgroup>
                <col className="w-[40%]" />
                <col className="w-[9%]" />
                <col className="w-[8%]" />
                <col className="w-[9%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[10%]" />
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
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    YP1001
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    YP1006
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    YP1007
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Διαθέσιμο
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredRows.map((row, index) => {
                  const totalAvail = toNumber(row.TOTAL_AVAIL);
                  const qtySold = toNumber(row.QTY_SOLD);

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

                      <td className="whitespace-nowrap px-5 py-4 text-right align-top tabular-nums text-gray-700 dark:text-gray-200">
                        {formatNumber(row.YP1001)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right align-top tabular-nums text-gray-700 dark:text-gray-200">
                        {formatNumber(row.YP1006)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right align-top tabular-nums text-gray-700 dark:text-gray-200">
                        {formatNumber(row.YP1007)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right align-top tabular-nums">
                        <span
                          className={[
                            "inline-flex min-w-[72px] justify-center rounded-full px-2.5 py-1 text-xs font-semibold",
                            totalAvail > 0
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
                          ].join(" ")}
                        >
                          {formatNumber(totalAvail)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
