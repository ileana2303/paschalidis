"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ApexOptions } from "apexcharts";
import DataTableEmptyState from "@/components/ui/data-table/data-table-empty-state";
import { useFetchItemForensicsMutation } from "@/hooks/queries/useApiMutations";
import type { ICompanyStockRow, IItemForensicsRow } from "@/lib/interface";
import {
  AlertCircle,
  ChartColumn,
  ChevronDown,
  Loader2,
  PackageSearch,
  RefreshCw,
  X,
} from "@/lib/icons/lucide";
import {
  formatElNumber,
  formatEuro,
  parseSoftOneNumber,
} from "@/lib/utils/number";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface ItemForensicsDrawerProps {
  item: ICompanyStockRow;
  onClose: () => void;
}

interface NumericForensicsRow {
  period: string;
  year: number;
  month: number;
  qtySelf: number;
  qtySimilar: number;
  qtyTotal: number;
  qtyGroup: number;
  qtyB2b: number;
  valSelf: number;
  valSimilar: number;
  valTotal: number;
  valGroup: number;
  valB2b: number;
}

interface YearSummary {
  year: number;
  rows: NumericForensicsRow[];
  qtyTotal: number;
  qtyB2b: number;
  qtyGroup: number;
  valTotal: number;
}

const monthFormatter = new Intl.DateTimeFormat("el-GR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const shortMonthFormatter = new Intl.DateTimeFormat("el-GR", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const monthOnlyFormatter = new Intl.DateTimeFormat("el-GR", {
  month: "short",
  timeZone: "UTC",
});
const MONTH_LABELS = Array.from({ length: 12 }, (_, month) =>
  monthOnlyFormatter.format(new Date(Date.UTC(2020, month, 1)))
);

function numberValue(value: unknown) {
  return parseSoftOneNumber(value) ?? 0;
}

function parsePeriod(periodValue: unknown) {
  const period = String(periodValue ?? "").trim();
  const match = /^(\d{4})(0[1-9]|1[0-2])$/.exec(period);

  if (!match) return null;

  return {
    period,
    year: Number(match[1]),
    month: Number(match[2]),
  };
}

function normalizeRow(row: IItemForensicsRow): NumericForensicsRow | null {
  const parsedPeriod = parsePeriod(row.PERIOD);

  if (!parsedPeriod) return null;

  return {
    ...parsedPeriod,
    qtySelf: numberValue(row.QTY_SELF),
    qtySimilar: numberValue(row.QTY_SIMILAR),
    qtyTotal: numberValue(row.QTY_TOTAL),
    qtyGroup: numberValue(row.QTY_GROUP),
    qtyB2b: numberValue(row.QTY_B2B),
    valSelf: numberValue(row.VAL_SELF),
    valSimilar: numberValue(row.VAL_SIMILAR),
    valTotal: numberValue(row.VAL_TOTAL),
    valGroup: numberValue(row.VAL_GROUP),
    valB2b: numberValue(row.VAL_B2B),
  };
}

function formatPeriod(row: Pick<NumericForensicsRow, "year" | "month">) {
  const label = monthFormatter.format(new Date(Date.UTC(row.year, row.month - 1, 1)));
  return label.charAt(0).toLocaleUpperCase("el-GR") + label.slice(1);
}

function formatShortPeriod(row: Pick<NumericForensicsRow, "year" | "month">) {
  return shortMonthFormatter.format(new Date(Date.UTC(row.year, row.month - 1, 1)));
}

function formatShortMonth(row: Pick<NumericForensicsRow, "year" | "month">) {
  return monthOnlyFormatter.format(new Date(Date.UTC(row.year, row.month - 1, 1)));
}

function sum(rows: NumericForensicsRow[], field: keyof NumericForensicsRow) {
  return rows.reduce((total, row) => total + Number(row[field]), 0);
}

function buildYearSummaries(rows: NumericForensicsRow[]) {
  const grouped = new Map<number, NumericForensicsRow[]>();

  for (const row of rows) {
    const yearRows = grouped.get(row.year) ?? [];
    yearRows.push(row);
    grouped.set(row.year, yearRows);
  }

  return [...grouped.entries()]
    .sort(([firstYear], [secondYear]) => secondYear - firstYear)
    .map(([year, yearRows]): YearSummary => ({
      year,
      rows: [...yearRows].sort((first, second) => first.month - second.month),
      qtyTotal: sum(yearRows, "qtyTotal"),
      qtyB2b: sum(yearRows, "qtyB2b"),
      qtyGroup: sum(yearRows, "qtyGroup"),
      valTotal: sum(yearRows, "valTotal"),
    }));
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

function ContextBars({
  title,
  years,
  field,
  colorClass,
}: {
  title: string;
  years: YearSummary[];
  field: "qtyB2b" | "qtyGroup";
  colorClass: string;
}) {
  const max = Math.max(...years.map((year) => year[field]), 0);

  return (
    <div className="rounded-xl bg-gray-50 p-3.5 dark:bg-gray-900/70">
      <div className="mb-3 flex items-end justify-between gap-3">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{title}</p>
        <p className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
          {formatElNumber(years.reduce((total, year) => total + year[field], 0))}
        </p>
      </div>
      <div className="space-y-2">
        {years.map((year) => (
          <div key={year.year} className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 text-[11px]">
            <span className="font-medium text-gray-500 dark:text-gray-400">{year.year}</span>
            <span className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
              <span
                className={`block h-full rounded-full ${colorClass}`}
                style={{
                  width: `${
                    max > 0 && year[field] > 0
                      ? Math.max(2, (year[field] / max) * 100)
                      : 0
                  }%`,
                }}
              />
            </span>
            <span className="min-w-10 text-right tabular-nums text-gray-600 dark:text-gray-300">
              {formatElNumber(year[field])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function YearDetails({ summary, initiallyOpen }: { summary: YearSummary; initiallyOpen: boolean }) {
  return (
    <details
      open={initiallyOpen}
      className="group overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]"
    >
      <summary className="flex cursor-pointer list-none flex-col gap-3 px-4 py-4 marker:content-none sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            {summary.year}
          </span>
          <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-xs sm:grid-cols-4">
            <span className="text-gray-500 dark:text-gray-400">
              Σύνολο: <strong className="tabular-nums text-gray-800 dark:text-gray-200">{formatElNumber(summary.qtyTotal)}</strong>
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              B2B: <strong className="tabular-nums text-gray-800 dark:text-gray-200">{formatElNumber(summary.qtyB2b)}</strong>
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              Group: <strong className="tabular-nums text-gray-800 dark:text-gray-200">{formatElNumber(summary.qtyGroup)}</strong>
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              Αξία: <strong className="whitespace-nowrap tabular-nums text-gray-800 dark:text-gray-200">{formatEuro(summary.valTotal)}</strong>
            </span>
          </div>
        </div>
        <ChevronDown className="h-5 w-5 shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
      </summary>

      <div className="overflow-x-auto border-t border-gray-100 dark:border-gray-800">
        <table className="w-full min-w-[720px] text-xs">
          <thead className="bg-gray-50 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900/80 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2.5 text-left">Μήνας</th>
              <th className="px-3 py-2.5 text-right">Qty Total</th>
              <th className="px-3 py-2.5 text-right">Qty Self</th>
              <th className="px-3 py-2.5 text-right">Qty Similar</th>
              <th className="px-3 py-2.5 text-right">B2B</th>
              <th className="px-3 py-2.5 text-right">Group</th>
              <th className="px-4 py-2.5 text-right">Value Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {summary.rows.map((row) => (
              <tr key={row.period} className="text-gray-600 dark:text-gray-300">
                <td className="whitespace-nowrap px-4 py-2.5 font-medium text-gray-800 dark:text-gray-100">
                  {formatPeriod(row)}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-gray-900 dark:text-white">{formatElNumber(row.qtyTotal)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatElNumber(row.qtySelf)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatElNumber(row.qtySimilar)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatElNumber(row.qtyB2b)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatElNumber(row.qtyGroup)}</td>
                <td
                  className="whitespace-nowrap px-4 py-2.5 text-right font-medium tabular-nums text-gray-800 dark:text-gray-100"
                  title={`Self: ${formatEuro(row.valSelf)} · Similar: ${formatEuro(row.valSimilar)} · B2B: ${formatEuro(row.valB2b)} · Group: ${formatEuro(row.valGroup)}`}
                >
                  {formatEuro(row.valTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
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

export default function ItemForensicsDrawer({ item, onClose }: ItemForensicsDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [trendYear, setTrendYear] = useState<"all" | number>("all");
  const {
    data,
    error,
    isPending,
    mutate,
  } = useFetchItemForensicsMutation();

  useEffect(() => {
    mutate({ mtrl: item.MTRL });
  }, [item.MTRL, mutate]);

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
    () => (data?.rows ?? [])
      .map(normalizeRow)
      .filter((row): row is NumericForensicsRow => row !== null)
      .sort((first, second) => first.period.localeCompare(second.period)),
    [data?.rows]
  );
  const years = useMemo(() => buildYearSummaries(rows), [rows]);
  const trendRows = useMemo(
    () => trendYear === "all" ? rows : rows.filter((row) => row.year === trendYear),
    [rows, trendYear]
  );
  const currentYear = new Date().getFullYear();
  const totalQty = sum(rows, "qtyTotal");
  const currentYearQty = sum(rows.filter((row) => row.year === currentYear), "qtyTotal");
  const previousYearQty = sum(rows.filter((row) => row.year === currentYear - 1), "qtyTotal");
  const b2bQty = sum(rows, "qtyB2b");
  const latest = rows.at(-1);
  const trendSeries = useMemo(
    () => {
      if (trendYear === "all") {
        return years.map((year) => ({
          name: String(year.year),
          data: Array.from({ length: 12 }, (_, monthIndex) =>
            year.rows.find((row) => row.month === monthIndex + 1)?.qtyTotal ?? null
          ),
        }));
      }

      return [
        { name: "Qty Total", data: trendRows.map((row) => row.qtyTotal) },
        { name: "Qty Self", data: trendRows.map((row) => row.qtySelf) },
        { name: "Qty Similar", data: trendRows.map((row) => row.qtySimilar) },
      ];
    },
    [trendRows, trendYear, years]
  );

  const trendOptions = useMemo<ApexOptions>(() => ({
    chart: {
      fontFamily: "Google Sans, sans-serif",
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: [
      "#465fff",
      "#12b76a",
      "#f79009",
      "#7a5af8",
      "#06aed4",
      "#ee46bc",
      "#6172f3",
      "#f04438",
      "#15b79e",
      "#93370d",
    ],
    dataLabels: { enabled: false },
    grid: { borderColor: "#e4e7ec", strokeDashArray: 4 },
    legend: {
      position: "top",
      horizontalAlign: "left",
      fontSize: "12px",
    },
    markers: { size: 0, hover: { size: 5 } },
    stroke: {
      curve: "smooth",
      width: trendYear === "all" ? 2.5 : [3, 1.5, 1.5],
      dashArray: trendYear === "all" ? 0 : [0, 5, 5],
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: (value: number) => `${formatElNumber(value)} τεμ.` },
    },
    xaxis: {
      categories: trendYear === "all"
        ? MONTH_LABELS
        : trendRows.map(formatShortMonth),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { rotate: -45, hideOverlappingLabels: true, trim: true },
    },
    yaxis: {
      min: 0,
      labels: { formatter: (value: number) => formatElNumber(value) },
    },
  }), [trendRows, trendYear]);

  const yearChartRows = useMemo(() => [...years].reverse(), [years]);
  const yearOptions = useMemo<ApexOptions>(() => ({
    chart: { fontFamily: "Google Sans, sans-serif", toolbar: { show: false } },
    colors: ["#465fff"],
    dataLabels: { enabled: false },
    grid: { borderColor: "#e4e7ec", strokeDashArray: 4 },
    plotOptions: {
      bar: { borderRadius: 5, columnWidth: "48%", borderRadiusApplication: "end" },
    },
    tooltip: { y: { formatter: (value: number) => `${formatElNumber(value)} τεμ.` } },
    xaxis: {
      categories: yearChartRows.map((year) => String(year.year)),
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { min: 0, labels: { formatter: (value: number) => formatElNumber(value) } },
  }), [yearChartRows]);

  const retry = () => mutate({ mtrl: item.MTRL });
  const errorMessage = error instanceof Error ? error.message : "Αποτυχία φόρτωσης ιστορικού πωλήσεων.";

  return (
    <div className="fixed inset-0 z-99999" role="dialog" aria-modal="true" aria-labelledby="forensics-title">
      <button
        type="button"
        className="absolute inset-0 h-full w-full bg-gray-950/35 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Κλείσιμο ιστορικού πωλήσεων"
      />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[1120px] flex-col bg-gray-50 shadow-2xl dark:bg-gray-950">
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
              title="Δεν υπάρχει ιστορικό πωλήσεων"
              description="Δεν βρέθηκαν μηνιαία δεδομένα για το επιλεγμένο είδος."
            />
          ) : (
            <div className="space-y-5 p-4 sm:p-6">
              <section aria-label="Σύνοψη πωλήσεων">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                  <KpiCard label="Συνολική ποσότητα" value={formatElNumber(totalQty)} />
                  <KpiCard label={`${currentYear} ποσότητα`} value={formatElNumber(currentYearQty)} />
                  <KpiCard label={`${currentYear - 1} ποσότητα`} value={formatElNumber(previousYearQty)} />
                  <KpiCard label="Μηνιαίος μ.ό." value={formatElNumber(totalQty / rows.length)} />
                  <KpiCard label="B2B ποσότητα" value={formatElNumber(b2bQty)} />
                  <KpiCard label={latest ? `Τελευταίος · ${formatShortPeriod(latest)}` : "Τελευταίος μήνας"} value={formatElNumber(latest?.qtyTotal ?? 0)} />
                </div>
              </section>

              <ChartCard
                title="Μηνιαία πορεία πωλήσεων"
                description={trendYear === "all"
                  ? "Κάθε γραμμή δείχνει το QTY_TOTAL ενός έτους, ώστε να συγκρίνονται άμεσα οι εποχικές καμπύλες."
                  : `Ανάλυση ${trendYear}: QTY_TOTAL με Self και Similar ως δευτερεύουσες σειρές.`}
                action={(
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Έτος
                    <select
                      value={trendYear}
                      onChange={(event) => {
                        const value = event.target.value;
                        setTrendYear(value === "all" ? "all" : Number(value));
                      }}
                      aria-label="Επιλογή έτους για τη μηνιαία πορεία πωλήσεων"
                      className="h-9 min-w-32 rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                    >
                      <option value="all">Όλα τα έτη</option>
                      {years.map((year) => (
                        <option key={year.year} value={year.year}>
                          {year.year}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              >
                <div className="overflow-x-auto px-2 pb-2 pt-3 sm:px-4">
                  <div className="min-w-[720px]">
                    <Chart
                      options={trendOptions}
                      series={trendSeries}
                      type="line"
                      height={300}
                    />
                  </div>
                </div>
              </ChartCard>

              <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                <ChartCard
                  title="Σύγκριση ανά έτος"
                  description="Συνολική ποσότητα πωλήσεων για κάθε έτος."
                >
                  <div className="px-3 py-2">
                    <Chart
                      options={yearOptions}
                      series={[{ name: "Qty Total", data: yearChartRows.map((year) => year.qtyTotal) }]}
                      type="bar"
                      height={245}
                    />
                  </div>
                </ChartCard>

                <ChartCard
                  title="B2B / Group πλαίσιο"
                  description="Ξεχωριστές κλίμακες ώστε οι μεγάλες τιμές Group να μην κρύβουν τις B2B διαφορές."
                >
                  <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <ContextBars title="B2B ποσότητα" years={years} field="qtyB2b" colorClass="bg-success-500" />
                    <ContextBars title="Group ποσότητα" years={years} field="qtyGroup" colorClass="bg-orange-400" />
                  </div>
                </ChartCard>
              </div>

              <section aria-labelledby="monthly-details-title" className="space-y-3">
                <div>
                  <h3 id="monthly-details-title" className="font-semibold text-gray-900 dark:text-white">
                    Μηνιαίες λεπτομέρειες
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Τα έτη εμφανίζονται από το πιο πρόσφατο. Αναπτύξτε ένα έτος για τις ακριβείς τιμές.
                  </p>
                </div>
                {years.map((summary, index) => (
                  <YearDetails key={summary.year} summary={summary} initiallyOpen={index === 0} />
                ))}
              </section>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
