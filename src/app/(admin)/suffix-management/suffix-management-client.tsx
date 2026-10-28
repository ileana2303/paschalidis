"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import SuffixEditModal from "@/components/suffix-management/suffix-edit-modal";
import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import DataTable from "@/components/ui/data-table/data-table";
import DataTableEmptyState from "@/components/ui/data-table/data-table-empty-state";
import DataTableHeader from "@/components/ui/data-table/data-table-header";
import {
  useSaveSuffixMutation,
  useSuffixListQuery,
} from "@/hooks/queries/useSuffixManagementQuery";
import { useCan } from "@/hooks/usePermissions";
import {
  AlertCircle,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Table2,
} from "@/lib/icons/lucide";
import type {
  SuffixB2B,
  SuffixGroup,
  SuffixListFilters,
  SuffixRow,
} from "@/lib/suffix-management/types";
import { getSuffixSaveOutcome } from "@/lib/suffix-management/save-result";

const selectClassName =
  "h-10 min-w-0 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200";

function compactFilters(filters: SuffixListFilters): SuffixListFilters {
  const search = filters.search?.trim();
  const sosufix = Array.isArray(filters.sosufix)
    ? filters.sosufix.map((value) => value.trim()).filter(Boolean)
    : filters.sosufix?.trim();

  return {
    ...(sosufix && (typeof sosufix === "string" || sosufix.length > 0)
      ? { sosufix }
      : {}),
    ...(search ? { search } : {}),
    ...(filters.zgroupId ? { zgroupId: filters.zgroupId } : {}),
    ...(filters.zb2bId ? { zb2bId: filters.zb2bId } : {}),
    ...(filters.needsExtra === 1 ? { needsExtra: 1 } : {}),
  };
}

function filtersMatch(first: SuffixListFilters, second: SuffixListFilters) {
  return JSON.stringify(compactFilters(first)) === JSON.stringify(compactFilters(second));
}

function displayValue(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

function groupOptionLabel(group: SuffixGroup) {
  const code = group.ZGROUP_CODE.trim();
  const name = group.ZGROUP_NAME.trim();

  if (code && name && code !== name) {
    return `${code} — ${name}`;
  }

  return displayValue(name || code);
}

function b2bOptionLabel(entry: SuffixB2B) {
  const code = entry.ZB2B_CODE.trim();
  const name = entry.ZB2B_NAME.trim();

  if (code && name && code !== name) {
    return `${code} — ${name}`;
  }

  return displayValue(name || code);
}

function TableSkeleton() {
  return (
    <div className="animate-pulse divide-y divide-gray-100 dark:divide-gray-800">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex gap-4 px-5 py-4">
          <div className="h-8 w-16 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="h-8 min-w-48 flex-1 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="h-8 w-24 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="h-8 w-24 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="h-8 w-28 rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      ))}
    </div>
  );
}

export default function SuffixManagementClient() {
  const canEdit = useCan()("edit-suffix");
  const [searchInput, setSearchInput] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [b2bCode, setB2bCode] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [suggestedTraderName, setSuggestedTraderName] = useState("");
  const [filters, setFilters] = useState<SuffixListFilters>({});
  const [editingSuffix, setEditingSuffix] = useState<SuffixRow | null>(null);
  const [updatingSuffix, setUpdatingSuffix] = useState("");
  const query = useSuffixListQuery(filters);
  const { mutateAsync: saveSuffix } = useSaveSuffixMutation();
  const errorMessage =
    query.error instanceof Error ? query.error.message : "Αποτυχία φόρτωσης των suffix.";

  useEffect(() => {
    if (query.isError) {
      toast.error(errorMessage);
    }
  }, [errorMessage, query.isError]);

  const groups = useMemo(
    () =>
      (query.data?.groups ?? []).filter(
        (group) => group.ZGROUP_ID !== 0 && group.ZGROUP_CODE.trim()
      ),
    [query.data?.groups]
  );
  const b2bEntries = useMemo(
    () =>
      (query.data?.b2b ?? []).filter(
        (entry) => entry.ZB2B_ID !== 0 && entry.ZB2B_CODE.trim()
      ),
    [query.data?.b2b]
  );

  const nextFilters = useMemo(
    () => {
      const selectedGroup = groups.find(
        (group) => group.ZGROUP_CODE.trim() === groupCode
      );
      const selectedB2B = b2bEntries.find(
        (entry) => entry.ZB2B_CODE.trim() === b2bCode
      );

      return compactFilters({
        search: searchInput,
        zgroupId: selectedGroup?.ZGROUP_ID,
        zb2bId: selectedB2B?.ZB2B_ID,
      });
    },
    [b2bCode, b2bEntries, groupCode, groups, searchInput]
  );

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (filtersMatch(filters, nextFilters)) {
      void query.refetch();
      return;
    }

    setFilters(nextFilters);
  };

  const applySelectFilters = (
    nextGroupCode: string,
    nextB2bCode: string
  ) => {
    const selectedGroup = groups.find(
      (group) => group.ZGROUP_CODE.trim() === nextGroupCode
    );
    const selectedB2B = b2bEntries.find(
      (entry) => entry.ZB2B_CODE.trim() === nextB2bCode
    );

    setFilters(
      compactFilters({
        search: searchInput,
        zgroupId: selectedGroup?.ZGROUP_ID,
        zb2bId: selectedB2B?.ZB2B_ID,
      })
    );
  };

  const handleRefresh = () => {
    if (filtersMatch(filters, nextFilters)) {
      void query.refetch();
      return;
    }

    setFilters(nextFilters);
  };

  const toggleSuffixActive = async (row: SuffixRow) => {
    if (updatingSuffix) return;

    const nextActive = row.ISACTIVE === 1 ? 0 : 1;
    const action = nextActive === 1 ? "ενεργοποιήσετε" : "απενεργοποιήσετε";

    if (!window.confirm(`Θέλετε να ${action} το suffix ${row.SOSUFIX};`)) {
      return;
    }

    setUpdatingSuffix(row.SOSUFIX);

    try {
      const response = await saveSuffix({
        rows: [{ SOSUFIX: row.SOSUFIX, IS_ACTIVE: nextActive }],
      });
      const outcome = getSuffixSaveOutcome(response);

      if (outcome.saved > 0) {
        await query.refetch();
      }

      if (outcome.completed) {
        toast.success(
          nextActive === 1
            ? `Το suffix ${row.SOSUFIX} ενεργοποιήθηκε.`
            : `Το suffix ${row.SOSUFIX} απενεργοποιήθηκε.`
        );
      } else {
        toast.error(outcome.message);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Η αλλαγή κατάστασης δεν ολοκληρώθηκε."
      );
    } finally {
      setUpdatingSuffix("");
    }
  };

  const rows = useMemo(() => query.data?.sufix ?? [], [query.data?.sufix]);
  const counts = query.data?.counts;
  const supplierNames = useMemo(
    () =>
      Array.from(
        new Set(
          (query.data?.sufix ?? [])
            .map((row) => row.SUPPLIER_NAME.trim())
            .filter(Boolean)
        )
      ).sort((first, second) => first.localeCompare(second, "el")),
    [query.data?.sufix]
  );
  const suggestedTraderNames = useMemo(
    () =>
      Array.from(
        new Set(
          (query.data?.sufix ?? [])
            .map((row) => row.SUGGESTED_TRDR_NAME.trim())
            .filter(Boolean)
        )
      ).sort((first, second) => first.localeCompare(second, "el")),
    [query.data?.sufix]
  );
  const visibleRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          (!groupCode || row.ZGROUP_CODE.trim() === groupCode) &&
          (!b2bCode || row.ZB2B_CODE.trim() === b2bCode) &&
          (!supplierName || row.SUPPLIER_NAME.trim() === supplierName) &&
          (!suggestedTraderName ||
            row.SUGGESTED_TRDR_NAME.trim() === suggestedTraderName)
      ),
    [b2bCode, groupCode, rows, suggestedTraderName, supplierName]
  );
  const hasActiveFilters =
    Object.keys(filters).length > 0 ||
    Boolean(groupCode || b2bCode || supplierName || suggestedTraderName);

  return (
    <div className="min-w-0 max-w-full">
      <PageBreadcrumb pageTitle="Διαχείριση Suffix" />

      {query.isError ? (
        <div className="mb-4 flex gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Δεν ήταν δυνατή η φόρτωση δεδομένων</p>
            <p className="mt-1">{errorMessage}</p>
          </div>
        </div>
      ) : null}

      <DataTable>
        <DataTableHeader
          title="Suffix"
          description="Διαχείριση των suffix που επιστρέφει το Soft1"
          count={
            counts ? (
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                Suffix: {counts.sufix}
              </span>
            ) : undefined
          }
        />

        <form
          onSubmit={submitSearch}
          className="border-b border-gray-100 bg-gray-50/50 px-5 py-4 dark:border-gray-800 dark:bg-gray-900/20"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[minmax(220px,1.2fr)_repeat(4,minmax(130px,0.7fr))_auto]">
            <label className="min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                Αναζήτηση
              </span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Suffix, όνομα ή προμηθευτής"
                  className={`${selectClassName} w-full pl-9`}
                />
              </span>
            </label>

            <label className="min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                Group
              </span>
              <select
                value={groupCode}
                onChange={(event) => {
                  const value = event.target.value;
                  setGroupCode(value);
                  applySelectFilters(value, b2bCode);
                }}
                className={`${selectClassName} w-full`}
              >
                <option value="">Όλα τα Groups</option>
                {groups.map((group) => (
                  <option key={group.ZGROUP_ID} value={group.ZGROUP_CODE.trim()}>
                    {groupOptionLabel(group)}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                B2B
              </span>
              <select
                value={b2bCode}
                onChange={(event) => {
                  const value = event.target.value;
                  setB2bCode(value);
                  applySelectFilters(groupCode, value);
                }}
                className={`${selectClassName} w-full`}
              >
                <option value="">Όλα τα B2B</option>
                {b2bEntries.map((entry) => (
                  <option key={entry.ZB2B_ID} value={entry.ZB2B_CODE.trim()}>
                    {b2bOptionLabel(entry)}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                Όνομα Προμηθευτή
              </span>
              <select
                value={supplierName}
                onChange={(event) => setSupplierName(event.target.value)}
                className={`${selectClassName} w-full`}
              >
                <option value="">Όλοι οι προμηθευτές</option>
                {supplierNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                Προτεινόμενος προμηθευτής
              </span>
              <select
                value={suggestedTraderName}
                onChange={(event) => setSuggestedTraderName(event.target.value)}
                className={`${selectClassName} w-full`}
              >
                <option value="">Όλοι οι προτεινόμενοι</option>
                {suggestedTraderNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end gap-2 md:col-span-2 xl:col-span-1">
              <button
                type="submit"
                disabled={query.isFetching}
                className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-3 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50 xl:flex-none"
              >
                <Search className="h-3.5 w-3.5" />
                Αναζήτηση
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={query.isFetching}
                className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 xl:flex-none"
              >
                {query.isFetching ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Ανανέωση
              </button>
            </div>
          </div>
        </form>

        {query.isPending ? (
          <TableSkeleton />
        ) : query.isError && !query.data ? (
          <DataTableEmptyState
            icon={<AlertCircle className="h-7 w-7" />}
            title="Αποτυχία φόρτωσης"
            description={errorMessage}
            action={
              <button
                type="button"
                onClick={() => void query.refetch()}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                <RefreshCw className="h-4 w-4" />
                Δοκιμή ξανά
              </button>
            }
          />
        ) : visibleRows.length === 0 ? (
          <DataTableEmptyState
            icon={<Table2 className="h-7 w-7" />}
            title="Δεν βρέθηκαν εγγραφές"
            description={
              hasActiveFilters
                ? "Δεν υπάρχουν εγγραφές που να ταιριάζουν με τα επιλεγμένα φίλτρα."
                : "Το Soft1 δεν επέστρεψε εγγραφές Suffix."
            }
          />
        ) : (
          <div className="max-h-[70vh] max-w-full overflow-auto overscroll-contain">
            <table className="w-full min-w-[2040px] table-fixed divide-y divide-gray-100 text-left text-xs dark:divide-gray-800 [&_td]:!px-2 [&_td]:!py-2 [&_th]:!px-2 [&_th]:!py-2.5">
              <thead className="bg-gray-50 text-[10px] uppercase tracking-normal text-gray-500 shadow-sm dark:bg-gray-900 dark:text-gray-400 [&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-gray-50 dark:[&_th]:bg-gray-900">
                <tr>
                  <th className="!sticky !left-0 !z-30 w-[62px] bg-gray-50 px-4 py-3 font-semibold dark:bg-gray-900">
                    SOSUFIX
                  </th>
                  <th className="!sticky !left-[62px] !z-30 w-[150px] border-r border-gray-200 bg-gray-50 px-4 py-3 font-semibold shadow-[8px_0_12px_-12px_rgba(16,24,40,0.45)] dark:border-gray-700 dark:bg-gray-900">
                    NAME
                  </th>
                  <th className="w-[62px] text-right font-semibold">PERCNT01</th>
                  <th className="w-[62px] text-right font-semibold">PERCNT02</th>
                  <th className="w-[62px] text-right font-semibold">PERCNT03</th>
                  <th className="w-[62px] text-right font-semibold">PERCNT04</th>
                  <th className="w-[62px] text-right font-semibold">PERCNT05</th>
                  <th className="w-[72px] font-semibold">ISACTIVE</th>
                  <th className="w-[60px] !px-1.5 font-semibold leading-3">
                    ZGROUP_<wbr />ID
                  </th>
                  <th className="w-[78px] !px-1.5 font-semibold leading-3">
                    ZGROUP_<wbr />CODE
                  </th>
                  <th className="w-[56px] !px-1.5 font-semibold leading-3">
                    ZB2B_<wbr />ID
                  </th>
                  <th className="w-[78px] !px-1.5 font-semibold leading-3">
                    ZB2B_<wbr />CODE
                  </th>
                  <th className="w-[90px] !px-1.5 font-semibold leading-3">
                    SUPPLIER_<wbr />CODE
                  </th>
                  <th className="w-[130px] !px-1.5 font-semibold leading-3">
                    SUPPLIER_<wbr />NAME
                  </th>
                  <th className="w-[180px] font-semibold">REMARKS</th>
                  <th className="w-[150px] font-semibold">NOTES</th>
                  <th className="w-[90px] font-semibold leading-3">
                    SUGGESTED_<wbr />TRDR
                  </th>
                  <th className="w-[110px] font-semibold leading-3">
                    SUGGESTED_<wbr />TRDR_CODE
                  </th>
                  <th className="w-[160px] font-semibold leading-3">
                    SUGGESTED_<wbr />TRDR_NAME
                  </th>
                  <th className="w-[80px] font-semibold leading-3">
                    EXTRA_<wbr />ACTIVE
                  </th>
                  <th className="w-[96px] font-semibold">NEEDS_EXTRA</th>
                  {canEdit && (
                  <th className="!sticky !right-0 !z-30 w-[86px] border-l border-gray-200 bg-gray-50 !px-1.5 text-right font-semibold shadow-[-8px_0_12px_-12px_rgba(16,24,40,0.45)] dark:border-gray-700 dark:bg-gray-900">
                    ΕΝΕΡΓΕΙΕΣ
                  </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700 dark:divide-gray-800 dark:text-gray-300">
                {visibleRows.map((row, index) => (
                    <tr
                      key={`${row.SOSUFIX}-${index}`}
                      className="group transition hover:bg-gray-50/80 dark:hover:bg-white/[0.02]"
                    >
                      <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-3 font-mono font-semibold text-gray-900 transition group-hover:bg-gray-50 dark:bg-gray-950 dark:text-white dark:group-hover:bg-gray-900">
                        {row.SOSUFIX}
                      </td>
                      <td className="sticky left-[62px] z-10 max-w-64 border-r border-gray-200 bg-white px-4 py-3 shadow-[8px_0_12px_-12px_rgba(16,24,40,0.45)] transition group-hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:group-hover:bg-gray-900">
                        <span className="block truncate" title={row.NAME || undefined}>
                          {displayValue(row.NAME)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-right tabular-nums">
                        {displayValue(row.PERCNT01)}
                      </td>
                      <td className="whitespace-nowrap text-right tabular-nums">
                        {displayValue(row.PERCNT02)}
                      </td>
                      <td className="whitespace-nowrap text-right tabular-nums">
                        {displayValue(row.PERCNT03)}
                      </td>
                      <td className="whitespace-nowrap text-right tabular-nums">
                        {displayValue(row.PERCNT04)}
                      </td>
                      <td className="whitespace-nowrap text-right tabular-nums">
                        {displayValue(row.PERCNT05)}
                      </td>
                      <td className="whitespace-nowrap">
                        <span
                          className={[
                            "inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold",
                            row.ISACTIVE === 1
                              ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
                          ].join(" ")}
                        >
                          {row.ISACTIVE === 1 ? "Ενεργό" : "Ανενεργό"}
                        </span>
                      </td>
                      <td className="!px-1.5 tabular-nums">
                        <span
                          className="block truncate"
                          title={
                            row.ZGROUP_ID === 0
                              ? "Μη αντιστοιχισμένο"
                              : String(row.ZGROUP_ID)
                          }
                        >
                          {row.ZGROUP_ID === 0
                            ? "Μη αντιστοιχισμένο"
                            : row.ZGROUP_ID}
                        </span>
                      </td>
                      <td className="!px-1.5">
                        <span
                          className="block truncate"
                          title={row.ZGROUP_CODE || undefined}
                        >
                          {displayValue(row.ZGROUP_CODE)}
                        </span>
                      </td>
                      <td className="!px-1.5 tabular-nums">
                        <span
                          className="block truncate"
                          title={
                            row.ZB2B_ID === 0
                              ? "Μη αντιστοιχισμένο"
                              : String(row.ZB2B_ID)
                          }
                        >
                          {row.ZB2B_ID === 0
                            ? "Μη αντιστοιχισμένο"
                            : row.ZB2B_ID}
                        </span>
                      </td>
                      <td className="!px-1.5">
                        <span
                          className="block truncate"
                          title={row.ZB2B_CODE || undefined}
                        >
                          {displayValue(row.ZB2B_CODE)}
                        </span>
                      </td>
                      <td className="!px-1.5">
                        <span
                          className="block truncate"
                          title={row.SUPPLIER_CODE || undefined}
                        >
                          {displayValue(row.SUPPLIER_CODE)}
                        </span>
                      </td>
                      <td className="!px-1.5">
                        <span
                          className="block truncate"
                          title={row.SUPPLIER_NAME || undefined}
                        >
                          {displayValue(row.SUPPLIER_NAME)}
                        </span>
                      </td>
                      <td>
                        <span
                          className="block truncate"
                          title={row.REMARKS || undefined}
                        >
                          {displayValue(row.REMARKS)}
                        </span>
                      </td>
                      <td>
                        <span
                          className="block truncate"
                          title={row.NOTES || undefined}
                        >
                          {displayValue(row.NOTES)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap tabular-nums">
                        {displayValue(row.SUGGESTED_TRDR)}
                      </td>
                      <td>
                        <span
                          className="block truncate"
                          title={row.SUGGESTED_TRDR_CODE || undefined}
                        >
                          {displayValue(row.SUGGESTED_TRDR_CODE)}
                        </span>
                      </td>
                      <td>
                        <span
                          className="block truncate"
                          title={row.SUGGESTED_TRDR_NAME || undefined}
                        >
                          {displayValue(row.SUGGESTED_TRDR_NAME)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        <span
                          className={[
                            "inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold",
                            row.EXTRA_ACTIVE === 1
                              ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
                          ].join(" ")}
                        >
                          {row.EXTRA_ACTIVE === 1 ? "Ενεργό" : "Ανενεργό"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        {row.NEEDS_EXTRA === 1 ? (
                          <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                            Προς συμπλήρωση
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      {canEdit && (
                      <td className="sticky right-0 z-10 whitespace-nowrap border-l border-gray-200 bg-white !px-1.5 text-right shadow-[-8px_0_12px_-12px_rgba(16,24,40,0.45)] transition group-hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:group-hover:bg-gray-900">
                        <div className="inline-flex items-center overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
                          <button
                            type="button"
                            onClick={() => setEditingSuffix(row)}
                            disabled={Boolean(updatingSuffix)}
                            title="Επεξεργασία"
                            aria-label={`Επεξεργασία suffix ${row.SOSUFIX}`}
                            className="flex h-8 w-8 items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-brand-600 disabled:opacity-40 dark:hover:bg-gray-800"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
                          <button
                            type="button"
                            onClick={() => void toggleSuffixActive(row)}
                            disabled={Boolean(updatingSuffix)}
                            className={`flex h-8 min-w-12 items-center justify-center px-1.5 text-[10px] font-semibold disabled:opacity-40 ${
                              row.ISACTIVE === 1
                                ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                                : "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                            }`}
                          >
                            {updatingSuffix === row.SOSUFIX ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : row.ISACTIVE === 1 ? (
                              "Disable"
                            ) : (
                              "Enable"
                            )}
                          </button>
                        </div>
                      </td>
                      )}
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataTable>

      {editingSuffix ? (
        <SuffixEditModal
          isOpen
          record={editingSuffix}
          groups={groups}
          b2b={b2bEntries}
          onClose={() => setEditingSuffix(null)}
          onSaved={() => query.refetch()}
        />
      ) : null}
    </div>
  );
}
