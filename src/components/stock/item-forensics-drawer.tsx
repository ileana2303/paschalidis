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
  ChevronDown,
  Loader2,
  PackageSearch,
  RefreshCw,
  X,
} from "@/lib/icons/lucide";
import {
  formatElNumber,
  parseSoftOneNumber,
} from "@/lib/utils/number";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface ItemForensicsDrawerProps {
  item: {
    MTRL: string;
    CODE: string;
    NAME: string;
  };
  days: number;
  onClose: () => void;
}

function numberValue(value: unknown) {
  return parseSoftOneNumber(value) ?? 0;
}

function salesPeriodLabel(days: number) {
  return days === 0 ? "Σήμερα" : `${days}ημ.`;
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

const RELATIONSHIP_ORDER = ["ΤΟ ΙΔΙΟ", "ΟΜΟΙΟ + ΙΔΙΟ B2B", "ΟΜΟΙΟ"];

function relationshipClassName(relationship: string) {
  if (relationship === "ΤΟ ΙΔΙΟ") {
    return "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300";
  }

  if (relationship.includes("B2B")) {
    return "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400";
  }

  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
}

function RelatedItemsGroup({
  relationship,
  rows,
  days,
  initiallyOpen,
}: {
  relationship: string;
  rows: IItemForensicsRow[];
  days: number;
  initiallyOpen: boolean;
}) {
  const currentYear = new Date().getFullYear();

  return (
    <details
      open={initiallyOpen}
      className="group overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 marker:content-none sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${relationshipClassName(relationship)}`}>
            {relationship}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {rows.length} {rows.length === 1 ? "είδος" : "είδη"}
          </span>
        </div>
        <ChevronDown className="h-5 w-5 shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
      </summary>

      <div className="overflow-x-auto border-t border-gray-100 dark:border-gray-800">
        <table className="w-full min-w-[880px] text-xs">
          <thead className="bg-gray-50 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900/80 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2.5 text-left">Είδος</th>
              <th className="px-3 py-2.5 text-left">Group / B2B</th>
              <th className="px-3 py-2.5 text-right">Πωλ. {salesPeriodLabel(days)}</th>
              <th className="px-3 py-2.5 text-right">{currentYear}</th>
              <th className="px-3 py-2.5 text-right">{currentYear - 1}</th>
              <th className="px-3 py-2.5 text-right">Ongoing</th>
              <th className="px-4 py-2.5 text-right">Διαθέσιμα</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((row) => (
              <tr key={`${row.MTRL}-${row.RN}`} className="text-gray-600 dark:text-gray-300">
                <td className="px-4 py-3">
                  <p className="max-w-md break-words font-medium text-gray-900 dark:text-white">
                    {row.NAME || "—"}
                  </p>
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    {row.CODE || "—"} · MTRL {row.MTRL || "—"}
                  </p>
                </td>
                <td className="px-3 py-3">
                  <p>{row.ZGROUP_CODE || "—"}</p>
                  <p className="mt-1 text-[11px] text-gray-400">{row.ZB2B_CODE || "—"}</p>
                </td>
                <td className="px-3 py-3 text-right font-semibold tabular-nums text-gray-900 dark:text-white">
                  {formatElNumber(row.QTY_SOLD)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{formatElNumber(row.CY)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatElNumber(row.CY_1)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatElNumber(row.ONGOING)}</td>
                <td className="px-4 py-3 text-right font-medium tabular-nums text-gray-800 dark:text-gray-100">
                  {formatElNumber(row.TOTAL_AVAIL)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function ItemForensicsContent({
  rows,
  days,
}: {
  rows: IItemForensicsRow[];
  days: number;
}) {
  const currentYear = new Date().getFullYear();
  const selected = rows.find((row) => row.IS_SELF === "1") ?? rows[0];
  const relationshipGroups = useMemo(() => {
    const groups = new Map<string, IItemForensicsRow[]>();

    for (const row of rows) {
      const relationship = row.SXESI?.trim() || "ΛΟΙΠΑ";
      const groupRows = groups.get(relationship) ?? [];
      groupRows.push(row);
      groups.set(relationship, groupRows);
    }

    return [...groups.entries()].sort(([first], [second]) => {
      const firstIndex = RELATIONSHIP_ORDER.indexOf(first);
      const secondIndex = RELATIONSHIP_ORDER.indexOf(second);
      return (firstIndex < 0 ? 99 : firstIndex) - (secondIndex < 0 ? 99 : secondIndex);
    });
  }, [rows]);

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

  const comparisonOptions = useMemo<ApexOptions>(() => ({
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
      categories: ["Είδος", "Οικογένεια", "Group", "B2B"],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { min: 0, labels: { formatter: (value: number) => formatElNumber(value) } },
  }), []);

  if (!selected) return null;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <section aria-label="Σύνοψη forensics">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <KpiCard label={`Πωλήσεις ${salesPeriodLabel(days)}`} value={formatElNumber(selected.QTY_SOLD)} />
          <KpiCard label={`${currentYear} ποσότητα`} value={formatElNumber(selected.CY)} />
          <KpiCard label={`${currentYear - 1} ποσότητα`} value={formatElNumber(selected.CY_1)} />
          <KpiCard label="Διαθέσιμα" value={formatElNumber(selected.TOTAL_AVAIL)} />
          <KpiCard label="Ongoing" value={formatElNumber(selected.ONGOING)} />
          <KpiCard label="Είδη οικογένειας" value={formatElNumber(selected.FAM_ITEMS)} />
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
                data: [selected.CY_4, selected.CY_3, selected.CY_2, selected.CY_1, selected.CY].map(numberValue),
              }]}
              type="bar"
              height={270}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Πλαίσιο είδους και οικογένειας"
          description="Σύγκριση τρέχοντος και προηγούμενου έτους για είδος, οικογένεια, Group και B2B."
        >
          <div className="px-3 py-2">
            <Chart
              options={comparisonOptions}
              series={[
                {
                  name: String(currentYear),
                  data: [selected.CY, selected.FAM_CY, selected.GRP_CY, selected.B2B_CY].map(numberValue),
                },
                {
                  name: String(currentYear - 1),
                  data: [selected.CY_1, selected.FAM_CY_1, selected.GRP_CY_1, selected.B2B_CY_1].map(numberValue),
                },
              ]}
              type="bar"
              height={270}
            />
          </div>
        </ChartCard>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.02] sm:p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900/70">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Οικογένεια</p>
            <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">{formatElNumber(selected.FAM_ITEMS)} είδη</p>
            <p className="mt-1 text-xs text-gray-500">Διαθέσιμα: {formatElNumber(selected.FAM_AVAIL)}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900/70">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Group · {selected.SELECTED_GROUP || "—"}</p>
            <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">{formatElNumber(selected.GRP_ITEMS)} είδη</p>
            <p className="mt-1 text-xs text-gray-500">Διαθέσιμα: {formatElNumber(selected.GRP_AVAIL)}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900/70">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">B2B · {selected.SELECTED_B2B || "—"}</p>
            <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">{formatElNumber(selected.B2B_ITEMS)} είδη</p>
            <p className="mt-1 text-xs text-gray-500">Διαθέσιμα: {formatElNumber(selected.B2B_AVAIL)}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="related-items-title" className="space-y-3">
        <div>
          <h3 id="related-items-title" className="font-semibold text-gray-900 dark:text-white">
            Ανάλυση σχετικών ειδών
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Τα {rows.length} είδη ομαδοποιούνται με βάση τη σχέση τους με το επιλεγμένο είδος.
          </p>
        </div>
        {relationshipGroups.map(([relationship, groupRows], index) => (
          <RelatedItemsGroup
            key={relationship}
            relationship={relationship}
            rows={groupRows}
            days={days}
            initiallyOpen={index === 0}
          />
        ))}
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

export default function ItemForensicsDrawer({ item, days, onClose }: ItemForensicsDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const {
    data,
    error,
    isPending,
    mutate,
  } = useFetchItemForensicsMutation();

  useEffect(() => {
    mutate({ mtrl: item.MTRL, days });
  }, [days, item.MTRL, mutate]);

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
    () => [...(data?.rows ?? [])]
      .sort((first, second) => numberValue(first.RN) - numberValue(second.RN)),
    [data?.rows]
  );

  const retry = () => mutate({ mtrl: item.MTRL, days });
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
              title="Δεν υπάρχουν δεδομένα forensics"
              description="Η υπηρεσία δεν επέστρεψε αναγνωρίσιμα δεδομένα για το επιλεγμένο είδος."
            />
          ) : (
            <ItemForensicsContent rows={rows} days={days} />
          )}
        </div>
      </aside>
    </div>
  );
}
