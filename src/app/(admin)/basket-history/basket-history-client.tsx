"use client";

import { useId, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, History, Loader2 } from "lucide-react";
import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import { OrderTypeFilterPicker } from "@/components/picking-list/order-type-picker";
import DataTable from "@/components/ui/data-table/data-table";
import DataTableEmptyState from "@/components/ui/data-table/data-table-empty-state";
import DataTableHeader from "@/components/ui/data-table/data-table-header";
import DataTableSearchBar from "@/components/ui/data-table/data-table-search-bar";
import { formatBranchLabel } from "@/lib/auth/branches";
import {
  BASKET_HISTORY_ERROR,
  BASKET_HISTORY_PATH,
  type BasketHistoryResponse,
  type BasketHistoryRow,
} from "@/lib/basket-history";
import { getPickingOrderTypeOption } from "@/lib/picking-list";
import { formatDateEl, formatDateTimeEl } from "@/lib/utils/date";
import BasketHistoryOrderDetails from "./basket-history-order-details";

const title = "Ιστορικό Καλαθιών";
const emptyRows: BasketHistoryRow[] = [];
const unspecifiedSource = "Χωρίς πηγή";

function sourceLabel(source: string) {
  return source || unspecifiedSource;
}

function sourceStyle(source: string) {
  switch (source) {
    case "ΕΝΔΟΔΙΑΚΙΝΗΣΗ":
      return getPickingOrderTypeOption("INTERNAL_TRANSFER");
    case "ΑΝΑΤΡΟΦΟΔΟΣΙΑ":
      return getPickingOrderTypeOption("REPLENISHMENT");
    case "ΚΑΛΑΘΙ ΠΕΛΑΤΗ":
      return getPickingOrderTypeOption("WHOLESALE");
    default:
      return getPickingOrderTypeOption("OTHER");
  }
}

async function fetchBasketHistory(signal: AbortSignal) {
  const response = await fetch(`/api${BASKET_HISTORY_PATH}`, { signal });
  const data = (await response.json()) as BasketHistoryResponse;

  if (!response.ok || !data.success) {
    throw new Error(data.message || BASKET_HISTORY_ERROR);
  }

  return data.rows;
}

function BasketHistoryCard({ row }: { row: BasketHistoryRow }) {
  const style = sourceStyle(row.PIGI);
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const hasFindoc = /^\d+$/.test(row.S1_FINDOC);

  return (
    <article className={`grid min-w-0 gap-3 break-words rounded-xl border border-l-4 border-gray-200 bg-white p-4 shadow-theme-xs md:grid-cols-2 xl:grid-cols-[1fr_1fr_2fr] dark:border-gray-800 dark:bg-gray-900 ${style.borderTone}`}>
      <div className="min-w-0 space-y-1">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {hasFindoc ? (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={detailsId}
              onClick={() => setOpen((current) => !current)}
              className="inline-flex items-center gap-1 rounded text-brand-600 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-brand-400"
            >
              {row.S1_FINDOC}
              <ChevronDown
                aria-hidden="true"
                className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
          ) : (
            row.S1_FINDOC || "—"
          )}
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          {[...new Set([row.PARASTATIKO, row.SEIRA, row.SEIRA_PERIGRAFI].filter(Boolean))].join(" · ") || "—"}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Ημερομηνία παραστατικού {formatDateEl(row.IMEROMINIA)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {[
            row.TRDR && `Συναλλασσόμενος ${row.TRDR}`,
            row.TRDBRANCH && `Υποκατάστημα συναλλασσόμενου ${row.TRDBRANCH}`,
          ].filter(Boolean).join(" · ")}
        </p>
      </div>

      <div className="min-w-0 space-y-1 text-xs text-gray-600 dark:text-gray-300">
        <p className="font-semibold">{formatBranchLabel(row.BRANCH)}</p>
        <p title={row.DATE_DELETED}>
          Διαγραφή: {formatDateTimeEl(row.DATE_DELETED, true)}
        </p>
        {row.KATASTASI && <p>{row.KATASTASI}</p>}
      </div>

      <div className="min-w-0 space-y-2 md:col-span-2 xl:col-span-1">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${style.tone}`}>
          {sourceLabel(row.PIGI)}
        </span>
        {row.COMMENTS && (
          <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
            {row.COMMENTS}
          </p>
        )}
        {row.REMARKS && (
          <p className="whitespace-pre-wrap rounded-md bg-gray-50 px-2.5 py-1.5 text-xs text-gray-600 dark:bg-gray-950 dark:text-gray-300">
            <span className="font-semibold">Παρατηρήσεις</span> {row.REMARKS}
          </p>
        )}
      </div>
      {hasFindoc && (
        <div
          id={detailsId}
          hidden={!open}
          className="col-span-full min-w-0 rounded-lg border border-gray-200 bg-gray-50 p-3 text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
        >
          {open && <BasketHistoryOrderDetails findoc={row.S1_FINDOC} source={row.PIGI} />}
        </div>
      )}
    </article>
  );
}

export default function BasketHistoryClient() {
  const [branch, setBranch] = useState("");
  const [source, setSource] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { data: rows = emptyRows, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["basket-history"],
    queryFn: ({ signal }) => fetchBasketHistory(signal),
  });

  const branches = useMemo(
    () => Array.from(new Set(rows.map((row) => row.BRANCH).filter(Boolean))).sort(),
    [rows]
  );

  const entries = useMemo(
    () => rows.map((row, index) => ({ row, index }))
      .sort((a, b) => b.row.DATE_DELETED.localeCompare(a.row.DATE_DELETED)),
    [rows]
  );

  const searchTerm = search.trim().toLocaleLowerCase("el-GR");
  const matchingEntries = entries.filter(({ row }) =>
    (!branch || row.BRANCH === branch) &&
    (!searchTerm ||
      [...Object.values(row), formatBranchLabel(row.BRANCH)].some((field) =>
        field.toLocaleLowerCase("el-GR").includes(searchTerm)
      ))
  );

  const counts = new Map<string, number>();
  for (const { row } of matchingEntries) {
    counts.set(row.PIGI, (counts.get(row.PIGI) ?? 0) + 1);
  }
  const sources = Array.from(new Set(rows.map((row) => row.PIGI)))
    .sort((a, b) => sourceLabel(a).localeCompare(sourceLabel(b), "el-GR"));
  const options = sources.map((value) => ({
    ...sourceStyle(value),
    value,
    label: sourceLabel(value),
    count: counts.get(value) ?? 0,
  }));
  const activeSource = source !== null && sources.includes(source) ? source : null;
  const visibleEntries = matchingEntries.filter(
    ({ row }) => activeSource === null || row.PIGI === activeSource
  );

  return (
    <div className="min-w-0">
      <PageBreadcrumb pageTitle={title} />
      <DataTable className="mt-4">
        <DataTableHeader
          title={title}
          description="Ιστορικό ολοκληρωμένων παραγγελιών από όλα τα καταστήματα."
          count={visibleEntries.length}
          action={
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
              <label className="flex min-h-10 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                Επιλογή καταστήματος
                <select
                  value={branch}
                  onChange={(event) => setBranch(event.target.value)}
                  className="min-w-0 flex-1 border-0 bg-transparent text-xs font-semibold text-gray-700 focus:ring-0 dark:text-gray-200"
                >
                  <option value="">Όλα τα καταστήματα</option>
                  {branch && !branches.includes(branch) && (
                    <option value={branch}>{formatBranchLabel(branch)}</option>
                  )}
                  {branches.map((code) => (
                    <option key={code} value={code}>{formatBranchLabel(code)}</option>
                  ))}
                </select>
              </label>
              <DataTableSearchBar
                value={search}
                onChange={setSearch}
                onRefresh={() => void refetch()}
                isRefreshing={isFetching}
                refreshDisabled={isFetching}
                placeholder="Παραστατικό, κατάστημα, σχόλια…"
              />
            </div>
          }
        />
        <OrderTypeFilterPicker
          title="Πηγή καλαθιού"
          description="Φιλτράρετε τις εγγραφές ανά πηγή καλαθιού."
          selectedType={activeSource}
          options={options}
          totalCount={matchingEntries.length}
          onSelect={setSource}
        />
        {isLoading && (
          <div role="status" className="flex items-center justify-center gap-2 px-5 py-16 text-gray-500 dark:text-gray-400">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Φόρτωση ιστορικού καλαθιών…
          </div>
        )}
        {error && (
          <p role="alert" className="px-5 py-4 text-sm text-red-700 dark:text-red-400">
            {error.message}
          </p>
        )}
        {visibleEntries.length > 0 ? (
          <div className="flex flex-col gap-3 p-3 sm:p-4">
            {visibleEntries.map(({ row, index }) => (
              <BasketHistoryCard key={`${row.S1_FINDOC}-${index}`} row={row} />
            ))}
          </div>
        ) : !isLoading && !error && (
          <DataTableEmptyState
            icon={<History className="size-7" />}
            title="Δεν βρέθηκαν εγγραφές"
            description="Δεν υπάρχουν εγγραφές ιστορικού για τα επιλεγμένα φίλτρα."
          />
        )}
      </DataTable>
    </div>
  );
}
