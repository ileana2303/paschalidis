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

type CategoryFilter = "all" | "sufix" | "groups" | "b2b";

type ManagementListItem =
  | { category: "sufix"; key: string; suffix: SuffixRow }
  | { category: "groups"; key: string; group: SuffixGroup }
  | { category: "b2b"; key: string; b2b: SuffixB2B };

function compactFilters(filters: SuffixListFilters): SuffixListFilters {
  const search = filters.search?.trim();

  return {
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
  return displayValue(group.ZGROUP_CODE);
}

function b2bOptionLabel(entry: SuffixB2B) {
  return displayValue(entry.ZB2B_CODE);
}

function CategoryBadge({ category }: { category: Exclude<CategoryFilter, "all"> }) {
  const label =
    category === "sufix" ? "Suffix" : category === "groups" ? "Group" : "B2B";
  const colorClass =
    category === "sufix"
      ? "bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
      : category === "groups"
        ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
        : "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300";

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold ${colorClass}`}
    >
      {label}
    </span>
  );
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
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [groupId, setGroupId] = useState("");
  const [b2bId, setB2bId] = useState("");
  const [needsExtra, setNeedsExtra] = useState(false);
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

  const nextFilters = useMemo(
    () =>
      compactFilters({
        search: searchInput,
        zgroupId: groupId ? Number(groupId) : undefined,
        zb2bId: b2bId ? Number(b2bId) : undefined,
        needsExtra: needsExtra ? 1 : undefined,
      }),
    [b2bId, groupId, needsExtra, searchInput]
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
    nextGroupId: string,
    nextB2bId: string,
    nextNeedsExtra: boolean
  ) => {
    setFilters(
      compactFilters({
        search: searchInput,
        zgroupId: nextGroupId ? Number(nextGroupId) : undefined,
        zb2bId: nextB2bId ? Number(nextB2bId) : undefined,
        needsExtra: nextNeedsExtra ? 1 : undefined,
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

  const groups = (query.data?.groups ?? []).filter((group) => group.ZGROUP_ID !== 0);
  const b2bEntries = (query.data?.b2b ?? []).filter((entry) => entry.ZB2B_ID !== 0);
  const rows = query.data?.sufix ?? [];
  const counts = query.data?.counts;
  const hasActiveFilters = Object.keys(filters).length > 0;
  const listItems: ManagementListItem[] = [
    ...rows.map((suffix, index) => ({
      category: "sufix" as const,
      key: `sufix-${suffix.SOSUFIX}-${index}`,
      suffix,
    })),
    ...groups.map((group) => ({
      category: "groups" as const,
      key: `group-${group.ZGROUP_ID}`,
      group,
    })),
    ...b2bEntries.map((b2b) => ({
      category: "b2b" as const,
      key: `b2b-${b2b.ZB2B_ID}`,
      b2b,
    })),
  ];
  const visibleItems =
    category === "all"
      ? listItems
      : listItems.filter((item) => item.category === category);

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
          title="Suffix / Groups / B2B"
          description="Ενιαία προβολή των τριών λιστών που επιστρέφει το Soft1"
          count={
            counts ? (
              <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                  Suffix: {counts.sufix}
                </span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  Groups: {counts.groups}
                </span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  B2B: {counts.b2b}
                </span>
              </div>
            ) : undefined
          }
        />

        <form
          onSubmit={submitSearch}
          className="border-b border-gray-100 bg-gray-50/50 px-5 py-4 dark:border-gray-800 dark:bg-gray-900/20"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.3fr)_minmax(140px,0.7fr)_minmax(140px,0.7fr)_minmax(140px,0.7fr)_minmax(140px,0.7fr)_auto]">
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
                Κατηγορία
              </span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as CategoryFilter)}
                className={`${selectClassName} w-full`}
              >
                <option value="all">Όλες</option>
                <option value="sufix">Suffix</option>
                <option value="groups">Groups</option>
                <option value="b2b">B2B</option>
              </select>
            </label>

            <label className="min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                Group
              </span>
              <select
                value={groupId}
                onChange={(event) => {
                  const value = event.target.value;
                  setGroupId(value);
                  applySelectFilters(value, b2bId, needsExtra);
                }}
                className={`${selectClassName} w-full`}
              >
                <option value="">Όλα τα Groups</option>
                {groups.map((group) => (
                  <option key={group.ZGROUP_ID} value={group.ZGROUP_ID}>
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
                value={b2bId}
                onChange={(event) => {
                  const value = event.target.value;
                  setB2bId(value);
                  applySelectFilters(groupId, value, needsExtra);
                }}
                className={`${selectClassName} w-full`}
              >
                <option value="">Όλα τα B2B</option>
                {b2bEntries.map((entry) => (
                  <option key={entry.ZB2B_ID} value={entry.ZB2B_ID}>
                    {b2bOptionLabel(entry)}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                Needs Extra
              </span>
              <select
                value={needsExtra ? "1" : ""}
                onChange={(event) => {
                  const value = event.target.value === "1";
                  setNeedsExtra(value);
                  applySelectFilters(groupId, b2bId, value);
                }}
                className={`${selectClassName} w-full`}
              >
                <option value="">Όλα</option>
                <option value="1">Προς συμπλήρωση</option>
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
        ) : visibleItems.length === 0 ? (
          <DataTableEmptyState
            icon={<Table2 className="h-7 w-7" />}
            title="Δεν βρέθηκαν εγγραφές"
            description={
              category !== "all"
                ? "Δεν υπάρχουν εγγραφές στην επιλεγμένη κατηγορία."
                : hasActiveFilters
                ? "Δεν υπάρχουν εγγραφές που να ταιριάζουν με τα επιλεγμένα φίλτρα."
                : "Το Soft1 δεν επέστρεψε εγγραφές Suffix, Groups ή B2B."
            }
          />
        ) : (
          <div className="max-h-[70vh] max-w-full overflow-auto overscroll-contain">
            <table className="w-full min-w-[1240px] table-fixed divide-y divide-gray-100 text-left text-xs dark:divide-gray-800 [&_td]:!px-2 [&_td]:!py-2 [&_th]:!px-2 [&_th]:!py-2.5">
              <thead className="bg-gray-50 text-[10px] uppercase tracking-normal text-gray-500 shadow-sm dark:bg-gray-900 dark:text-gray-400 [&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-gray-50 dark:[&_th]:bg-gray-900">
                <tr>
                  <th className="w-[76px] px-4 py-3 font-semibold">Κατηγορία</th>
                  <th className="w-[62px] px-4 py-3 font-semibold">SOSUFIX</th>
                  <th className="w-[132px] px-4 py-3 font-semibold">NAME</th>
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
                  <th className="w-[104px] !px-1.5 font-semibold leading-3">
                    SUPPLIER_<wbr />NAME
                  </th>
                  <th className="w-[62px] px-3 py-3 text-right font-semibold">PERCNT01</th>
                  <th className="w-[62px] px-3 py-3 text-right font-semibold">PERCNT02</th>
                  <th className="w-[62px] px-3 py-3 text-right font-semibold">PERCNT03</th>
                  <th className="w-[62px] px-3 py-3 text-right font-semibold">PERCNT04</th>
                  <th className="w-[62px] px-3 py-3 text-right font-semibold">PERCNT05</th>
                  <th className="w-[72px] px-4 py-3 font-semibold">ISACTIVE</th>
                  <th className="w-[96px] px-4 py-3 font-semibold">NEEDS_EXTRA</th>
                  <th className="w-[86px] !px-1.5 text-right font-semibold">ΕΝΕΡΓΕΙΕΣ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700 dark:divide-gray-800 dark:text-gray-300">
                {visibleItems.map((item) => {
                  if (item.category === "groups") {
                    return (
                      <tr
                        key={item.key}
                        className="transition hover:bg-gray-50/80 dark:hover:bg-white/[0.02]"
                      >
                        <td className="whitespace-nowrap px-4 py-3">
                          <CategoryBadge category="groups" />
                        </td>
                        <td className="px-4 py-3 text-gray-400">—</td>
                        <td className="px-4 py-3 text-gray-400">—</td>
                        <td className="whitespace-nowrap !px-1.5 font-mono font-semibold text-gray-900 dark:text-white">
                          {item.group.ZGROUP_ID}
                        </td>
                        <td className="!px-1.5">
                          <span
                            className="block truncate"
                            title={groupOptionLabel(item.group)}
                          >
                            {groupOptionLabel(item.group)}
                          </span>
                        </td>
                        <td className="!px-1.5 text-gray-400">—</td>
                        <td className="!px-1.5 text-gray-400">—</td>
                        <td colSpan={9} className="px-4 py-3 text-gray-400">
                          —
                        </td>
                      </tr>
                    );
                  }

                  if (item.category === "b2b") {
                    return (
                      <tr
                        key={item.key}
                        className="transition hover:bg-gray-50/80 dark:hover:bg-white/[0.02]"
                      >
                        <td className="whitespace-nowrap px-4 py-3">
                          <CategoryBadge category="b2b" />
                        </td>
                        <td className="!px-1.5 text-gray-400">—</td>
                        <td className="!px-1.5 text-gray-400">—</td>
                        <td className="!px-1.5 text-gray-400">—</td>
                        <td className="!px-1.5 text-gray-400">—</td>
                        <td className="whitespace-nowrap !px-1.5 font-mono font-semibold text-gray-900 dark:text-white">
                          {item.b2b.ZB2B_ID}
                        </td>
                        <td className="!px-1.5">
                          <span
                            className="block truncate"
                            title={b2bOptionLabel(item.b2b)}
                          >
                            {b2bOptionLabel(item.b2b)}
                          </span>
                        </td>
                        <td colSpan={9} className="px-4 py-3 text-gray-400">
                          —
                        </td>
                      </tr>
                    );
                  }

                  const row = item.suffix;

                  return (
                    <tr
                      key={item.key}
                      className="transition hover:bg-gray-50/80 dark:hover:bg-white/[0.02]"
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <CategoryBadge category="sufix" />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold text-gray-900 dark:text-white">
                        {row.SOSUFIX}
                      </td>
                      <td className="max-w-64 px-4 py-3">
                        <span className="block truncate" title={row.NAME || undefined}>
                          {displayValue(row.NAME)}
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
                      <td className="max-w-56 !px-1.5">
                        <span
                          className="block truncate"
                          title={row.SUPPLIER_NAME || undefined}
                        >
                          {displayValue(row.SUPPLIER_NAME)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{displayValue(row.PERCNT01)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{displayValue(row.PERCNT02)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{displayValue(row.PERCNT03)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{displayValue(row.PERCNT04)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{displayValue(row.PERCNT05)}</td>
                      <td className="whitespace-nowrap px-4 py-3">
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
                      <td className="whitespace-nowrap px-4 py-3">
                        {row.NEEDS_EXTRA === 1 ? (
                          <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                            Προς συμπλήρωση
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap !px-1.5 text-right">
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
                    </tr>
                  );
                })}
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
