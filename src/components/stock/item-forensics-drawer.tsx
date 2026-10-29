"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import type { ApexOptions } from "apexcharts";
import DataTableEmptyState from "@/components/ui/data-table/data-table-empty-state";
import { useFetchItemForensicsMutation } from "@/hooks/queries/useApiMutations";
import type { IItemForensicsRow } from "@/lib/interface";
import {
  AlertCircle,
  ChartColumn,
  Loader2,
  PackageSearch,
  RefreshCw,
  X,
} from "@/lib/icons/lucide";
import {
  formatElNumber,
  parseSoftOneNumber,
} from "@/lib/utils/number";
import { getAthensMonthName } from "@/lib/utils/athens-date";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const SALES_HISTORY_FIELDS = [
  { sales: "Y0", monthlyRate: "M0" },
  { sales: "Y1", monthlyRate: "M1" },
  { sales: "Y2", monthlyRate: "M2" },
  { sales: "Y3", monthlyRate: "M3" },
  { sales: "Y4", monthlyRate: "M4" },
] as const;

interface ItemForensicsDrawerProps {
  item: {
    MTRL: string;
    CODE: string;
    NAME: string;
  };
  days: number;
  branch: string;
  onClose: () => void;
}

function numberValue(value: unknown) {
  return parseSoftOneNumber(value) ?? 0;
}

function salesPeriodLabel(days: number) {
  return days === 0 ? "Σήμερα" : `${days}ημ.`;
}

function scopeLabel(scope: string) {
  return scope.toLocaleUpperCase("el-GR");
}

function scopeBadgeClassName(scope: string) {
  if (scope === "ΕΙΔΟΣ") {
    return "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300";
  }

  if (scope === "ΟΜΟΙΑ") {
    return "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400";
  }

  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200";
}

function trendClassName(trend: string) {
  if (trend === "ΑΝΟΔΟΣ") {
    return "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400";
  }

  if (trend === "ΠΤΩΣΗ") {
    return "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400";
  }

  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-white/[0.025]">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function ChartCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]">
      <header className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      {children}
    </section>
  );
}

function ItemForensicsContent({
  rows,
  days,
  branch,
}: {
  rows: IItemForensicsRow[];
  days: number;
  branch: string;
}) {
  const currentYear = new Date().getFullYear();
  const currentMonth = getAthensMonthName();
  const selected = rows.find((row) => row.SCOPE === "ΕΙΔΟΣ") ?? rows[0];
  const branchLabel = branch === "ALL" ? "Εταιρεία" : `Κατάστημα ${branch}`;

  const annualOptions = useMemo<ApexOptions>(() => ({
    chart: { fontFamily: "Google Sans, sans-serif", toolbar: { show: false } },
    colors: ["#465fff"],
    dataLabels: { enabled: false },
    grid: { borderColor: "#e4e7ec", strokeDashArray: 4 },
    plotOptions: {
      bar: { borderRadius: 5, columnWidth: "48%", borderRadiusApplication: "end" },
    },
    tooltip: { y: { formatter: (value: number) => `${formatElNumber(value)} τεμ.` } },
    xaxis: {
      categories: Array.from({ length: 5 }, (_, index) => String(currentYear - 4 + index)),
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { min: 0, labels: { formatter: (value: number) => formatElNumber(value) } },
  }), [currentYear]);

  const scopeComparisonOptions = useMemo<ApexOptions>(() => ({
    chart: { fontFamily: "Google Sans, sans-serif", toolbar: { show: false } },
    colors: ["#465fff", "#9cb9ff"],
    dataLabels: { enabled: false },
    grid: { borderColor: "#e4e7ec", strokeDashArray: 4 },
    legend: { position: "top", horizontalAlign: "left", fontSize: "12px" },
    plotOptions: {
      bar: { borderRadius: 4, columnWidth: "56%", borderRadiusApplication: "end" },
    },
    tooltip: { y: { formatter: (value: number) => `${formatElNumber(value)} τεμ.` } },
    xaxis: {
      categories: rows.map((row) => scopeLabel(row.SCOPE)),
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { min: 0, labels: { formatter: (value: number) => formatElNumber(value) } },
  }), [rows]);

  if (!selected) return null;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <section aria-label="Σύνοψη forensics">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <KpiCard label={`Πωλήσεις ${salesPeriodLabel(days)}`} value={formatElNumber(selected.QTY_WIN)} />
          <KpiCard label={`${currentYear} ποσότητα`} value={formatElNumber(selected.Y0)} />
          <KpiCard label="Ρυθμός μήνα" value={formatElNumber(selected.RYTHMOS_MINA)} />
          <KpiCard label="Διαθέσιμα" value={formatElNumber(selected.AVAIL)} />
          <KpiCard label="Ongoing" value={formatElNumber(selected.ONGOING)} />
          <KpiCard label="Ελεύθερα" value={formatElNumber(selected.FREE_AVAIL)} />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          title="Ετήσια πορεία επιλεγμένου είδους"
          description="Ποσότητα πωλήσεων του είδους για τα πέντε διαθέσιμα έτη."
        >
          <div className="px-3 py-2">
            <Chart
              options={annualOptions}
              series={[{
                name: "Ποσότητα",
                data: [selected.Y4, selected.Y3, selected.Y2, selected.Y1, selected.Y0].map(numberValue),
              }]}
              type="bar"
              height={270}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Σύγκριση εύρους"
          description="Πωλήσεις τρέχοντος και προηγούμενου έτους ανά σχέση είδους."
        >
          <div className="px-3 py-2">
            <Chart
              options={scopeComparisonOptions}
              series={[
                {
                  name: String(currentYear),
                  data: rows.map((row) => numberValue(row.Y0)),
                },
                {
                  name: String(currentYear - 1),
                  data: rows.map((row) => numberValue(row.Y1)),
                },
              ]}
              type="bar"
              height={270}
            />
          </div>
        </ChartCard>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.02] sm:p-5">
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">Απόθεμα · {branchLabel}</h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Διαθεσιμότητα, δεσμεύσεις και αναμενόμενες ποσότητες για το επιλεγμένο εύρος.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900/70">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Υπόλοιπο</p>
            <p className="mt-1 text-lg font-semibold text-gray-800 dark:text-gray-100">
              {formatElNumber(selected.YP_BRANCH)}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900/70">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Δεσμευμένα</p>
            <p className="mt-1 text-lg font-semibold text-gray-800 dark:text-gray-100">
              {formatElNumber(selected.RES_BRANCH)}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900/70">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Αναμενόμενα</p>
            <p className="mt-1 text-lg font-semibold text-gray-800 dark:text-gray-100">
              {formatElNumber(selected.END_BRANCH)}
            </p>
          </div>
          <div className="rounded-xl bg-brand-50 p-3 dark:bg-brand-500/10">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-300">Ελεύθερα</p>
            <p className="mt-1 text-lg font-semibold text-brand-700 dark:text-brand-200">
              {formatElNumber(selected.FREE_AVAIL)}
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]">
        <div className="mb-3">
          <div className="px-4 pt-4 sm:px-5 sm:pt-5">
            <h3 className="font-semibold text-gray-900 dark:text-white">Ανάλυση ανά εύρος</h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Πωλήσεις, ρυθμός, απόθεμα και μερίδιο για κάθε σχέση του είδους.
            </p>
          </div>
        </div>
        <div className="overflow-hidden border-t border-gray-100 dark:border-gray-800">
          <table className="w-full table-fixed text-xs" aria-label="Ανάλυση πωλήσεων ανά εύρος είδους">
            <caption className="sr-only">
              Ιστορικό πωλήσεων, ρυθμός, τάση, διαθεσιμότητα και μερίδια ανά εύρος είδους
            </caption>
            <colgroup>
              <col className="w-[7%]" />
              <col className="w-[4%]" />
              <col className="w-[5%]" />
              <col className="w-[37%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="hidden w-[8.5%] lg:table-column" />
              <col className="hidden w-[8.5%] lg:table-column" />
              <col className="hidden w-[9%] lg:table-column" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-gray-50 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-2 py-2.5 text-left">Εύρος</th>
                <th scope="col" className="px-1 py-2.5 text-right">Είδη</th>
                <th scope="col" className="px-1 py-2.5 text-right">
                  <span className="block">Πωλ.</span>
                  <span className="block normal-case tracking-normal">{salesPeriodLabel(days)}</span>
                </th>
                <th scope="col" className="px-2 py-2.5 text-left">Ιστορικό πωλήσεων</th>
                <th scope="col" className="px-1 py-2.5 text-right">
                  <span className="block">Ρυθμός</span>
                  <span className="block normal-case tracking-normal">μήνα</span>
                </th>
                <th scope="col" className="px-1 py-2.5 text-center">Τάση</th>
                <th scope="col" className="px-1 py-2.5 text-right">Διαθέσιμα</th>
                <th scope="col" className="hidden px-1 py-2.5 text-right lg:table-cell">
                  <span className="block">Μερίδιο</span>
                  <span className="block normal-case tracking-normal">{currentYear}</span>
                </th>
                <th scope="col" className="hidden px-1 py-2.5 text-right lg:table-cell">
                  <span className="block">Μερίδιο</span>
                  <span className="block normal-case tracking-normal">{currentYear - 1}</span>
                </th>
                <th scope="col" className="hidden px-2 py-2.5 text-right lg:table-cell">
                  <span className="block">Μερίδιο</span>
                  <span className="block normal-case tracking-normal">stock</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((row) => (
                <tr
                  key={`${row.SORT}-${row.SCOPE}`}
                  className="text-gray-600 odd:bg-white even:bg-gray-50/60 hover:bg-brand-50/40 dark:text-gray-300 dark:odd:bg-transparent dark:even:bg-white/[0.025] dark:hover:bg-brand-500/[0.06]"
                >
                  <th scope="row" className="px-2 py-2.5 text-left">
                    <span className={`inline-flex max-w-full truncate rounded-full px-2 py-1 text-[10px] font-semibold ${scopeBadgeClassName(row.SCOPE)}`}>
                      {scopeLabel(row.SCOPE)}
                    </span>
                  </th>
                  <td className="px-1 py-2.5 text-right font-medium tabular-nums">{formatElNumber(row.ITEMS)}</td>
                  <td className="px-1 py-2.5 text-right font-semibold tabular-nums text-gray-900 dark:text-white">
                    {formatElNumber(row.QTY_WIN)}
                  </td>
                  <td className="px-2 py-2 align-middle">
                    <div className="grid grid-cols-5 gap-1">
                      {SALES_HISTORY_FIELDS.map(({ sales, monthlyRate }, historyIndex) => {
                        const year = currentYear - historyIndex;

                        return (
                          <div
                            key={sales}
                            className="min-w-0 rounded-md border border-gray-100 bg-white px-1 py-1.5 text-center shadow-theme-xs dark:border-gray-700 dark:bg-gray-800/80"
                            title={`${sales}-${year} · ${monthlyRate}-${currentMonth}`}
                          >
                            <p className="truncate text-[9px] font-medium leading-tight text-gray-400 dark:text-gray-500">
                              {year}
                            </p>
                            <p className="mt-0.5 truncate text-xs font-semibold tabular-nums leading-tight text-gray-800 dark:text-gray-100">
                              {formatElNumber(row[sales])}
                            </p>
                            <p className="mt-1 truncate text-[9px] font-medium leading-tight text-gray-400 dark:text-gray-500">
                              {currentMonth}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] font-medium tabular-nums leading-tight text-gray-600 dark:text-gray-300">
                              {formatElNumber(row[monthlyRate])}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-1 py-2.5 text-right font-medium tabular-nums text-gray-800 dark:text-gray-100">
                    {formatElNumber(row.RYTHMOS_MINA)}
                  </td>
                  <td className="px-1 py-2.5 text-center">
                    <span className={`inline-flex max-w-full truncate rounded-full px-1.5 py-1 text-[9px] font-semibold ${trendClassName(row.TASI_WIN)}`}>
                      {row.TASI_WIN || "—"}
                    </span>
                  </td>
                  <td className="px-1 py-2.5 text-right font-semibold tabular-nums text-gray-900 dark:text-white">
                    {formatElNumber(row.AVAIL)}
                  </td>
                  <td className="hidden px-1 py-2.5 text-right tabular-nums lg:table-cell">
                    <span className="inline-flex rounded-md bg-gray-100 px-1.5 py-1 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                      {formatElNumber(row.MERIDIO_FETOS)}%
                    </span>
                  </td>
                  <td className="hidden px-1 py-2.5 text-right tabular-nums lg:table-cell">
                    <span className="inline-flex rounded-md bg-gray-100 px-1.5 py-1 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                      {formatElNumber(row.MERIDIO_PERSI)}%
                    </span>
                  </td>
                  <td className="hidden px-2 py-2.5 text-right tabular-nums lg:table-cell">
                    <span className="inline-flex rounded-md bg-gray-100 px-1.5 py-1 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                      {formatElNumber(row.MERIDIO_STOK)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function DrawerLoading() {
  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
      <div className="flex h-72 items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
          Φόρτωση ιστορικού πωλήσεων…
        </div>
      </div>
    </div>
  );
}

export default function ItemForensicsDrawer({
  item,
  days,
  branch,
  onClose,
}: ItemForensicsDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const {
    data,
    error,
    isPending,
    mutate,
  } = useFetchItemForensicsMutation();

  useEffect(() => {
    mutate({ mtrl: item.MTRL, days, branch });
  }, [branch, days, item.MTRL, mutate]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const rows = useMemo(
    () =>
      [...(data?.rows ?? [])].sort(
        (first, second) => numberValue(first.SORT) - numberValue(second.SORT)
      ),
    [data?.rows]
  );

  const retry = () => mutate({ mtrl: item.MTRL, days, branch });
  const errorMessage = error instanceof Error ? error.message : "Αποτυχία φόρτωσης ιστορικού πωλήσεων.";

  return (
    <div className="fixed inset-0 z-99999" role="dialog" aria-modal="true" aria-labelledby="forensics-title">
      <button
        type="button"
        className="absolute inset-0 h-full w-full bg-gray-950/35 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Κλείσιμο ιστορικού πωλήσεων"
      />
      <aside className="absolute inset-y-0 right-0 flex w-full flex-col bg-gray-50 shadow-2xl dark:bg-gray-950 sm:w-[96vw] sm:max-w-[1500px]">
        <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-4 pr-16 dark:border-gray-800 dark:bg-gray-900 sm:px-6 sm:py-5 sm:pr-20">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
              <ChartColumn className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 id="forensics-title" className="text-lg font-semibold text-gray-900 dark:text-white sm:text-xl">
                Ιστορική απόδοση είδους
              </h2>
              <p className="mt-1 break-words text-sm font-medium text-gray-800 dark:text-gray-200">
                {item.NAME || "—"}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                <span>CODE: <strong className="text-gray-700 dark:text-gray-300">{item.CODE || "—"}</strong></span>
                <span>MTRL: <strong className="text-gray-700 dark:text-gray-300">{item.MTRL || "—"}</strong></span>
                <span>Εύρος: <strong className="text-gray-700 dark:text-gray-300">{branch === "ALL" ? "Εταιρεία" : `Κατάστημα ${branch}`}</strong></span>
              </div>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white sm:right-6 sm:top-5"
            aria-label="Κλείσιμο"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isPending ? (
            <DrawerLoading />
          ) : error ? (
            <div className="p-4 sm:p-6">
              <div className="flex items-start gap-3 rounded-2xl border border-error-200 bg-error-50 p-5 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Δεν ήταν δυνατή η φόρτωση</p>
                  <p className="mt-1">{errorMessage}</p>
                  <button type="button" onClick={retry} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-error-600 px-3 font-semibold text-white transition hover:bg-error-700">
                    <RefreshCw className="h-4 w-4" />
                    Νέα προσπάθεια
                  </button>
                </div>
              </div>
            </div>
          ) : rows.length === 0 ? (
            <DataTableEmptyState
              className="min-h-[420px]"
              icon={<PackageSearch className="h-7 w-7" />}
              title="Δεν υπάρχουν δεδομένα forensics"
              description="Η υπηρεσία δεν επέστρεψε αναγνωρίσιμα δεδομένα για το επιλεγμένο είδος."
            />
          ) : (
            <ItemForensicsContent rows={rows} days={days} branch={branch} />
          )}
        </div>
      </aside>
    </div>
  );
}
