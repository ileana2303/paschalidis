"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import ReferenceEditModal, {
  type ReferenceEditRecord,
} from "@/components/suffix-management/reference-edit-modal";
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
  Plus,
  RefreshCw,
  Search,
  Table2,
} from "@/lib/icons/lucide";
import { getSuffixSaveOutcome } from "@/lib/suffix-management/save-result";

type ReferenceKind = "groups" | "b2b";
type ActiveFilter = "" | "1" | "0";

type ReferenceManagementClientProps = {
  kind: ReferenceKind;
};

const inputClassName =
  "h-10 min-w-0 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200";

function TableSkeleton() {
  return (
    <div className="animate-pulse divide-y divide-gray-100 dark:divide-gray-800">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex gap-4 px-5 py-3">
          <div className="h-7 w-24 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="h-7 min-w-48 flex-1 rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      ))}
    </div>
  );
}

export default function ReferenceManagementClient({
  kind,
}: ReferenceManagementClientProps) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("");
  const [creating, setCreating] = useState(false);
  const [editingRecord, setEditingRecord] =
    useState<ReferenceEditRecord | null>(null);
  const [updatingCode, setUpdatingCode] = useState("");
  const query = useSuffixListQuery({});
  const { mutateAsync: saveRows } = useSaveSuffixMutation();
  const isGroup = kind === "groups";
  const canEdit = useCan()(isGroup ? "edit-group" : "edit-b2b");
  const title = isGroup ? "Διαχείριση Group" : "Διαχείριση B2B";
  const idLabel = isGroup ? "ZGROUP_ID" : "ZB2B_ID";
  const codeLabel = isGroup ? "ZGROUP_CODE" : "ZB2B_CODE";
  const errorMessage =
    query.error instanceof Error
      ? query.error.message
      : `Αποτυχία φόρτωσης των ${isGroup ? "Groups" : "B2B"}.`;

  useEffect(() => {
    if (query.isError) toast.error(errorMessage);
  }, [errorMessage, query.isError]);

  const toggleActive = async (entry: ReferenceEditRecord) => {
    if (updatingCode) return;

    const nextActive = entry.isActive === 1 ? 0 : 1;
    const action = nextActive === 1 ? "ενεργοποιήσετε" : "απενεργοποιήσετε";

    if (!window.confirm(`Θέλετε να ${action} το ${entry.code};`)) return;

    setUpdatingCode(entry.code);

    try {
      const response = isGroup
        ? await saveRows({
            kind: "GROUP",
            rows: [
              { ZGROUP_CODE: entry.code, IS_ACTIVE: nextActive },
            ],
          })
        : await saveRows({
            kind: "B2B",
            rows: [{ ZB2B_CODE: entry.code, IS_ACTIVE: nextActive }],
          });
      const outcome = getSuffixSaveOutcome(response);

      if (outcome.saved > 0) await query.refetch();

      if (outcome.completed) toast.success(outcome.message);
      else toast.error(outcome.message);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Η αλλαγή κατάστασης δεν ολοκληρώθηκε."
      );
    } finally {
      setUpdatingCode("");
    }
  };

  const entries = useMemo(() => {
    const normalized: ReferenceEditRecord[] = isGroup
      ? (query.data?.groups ?? [])
          .filter((entry) => entry.ZGROUP_ID !== 0)
          .map((entry) => ({
            id: entry.ZGROUP_ID,
            code: entry.ZGROUP_CODE,
            name: entry.ZGROUP_NAME,
            description: entry.DESCR,
            sortOrder: entry.SORT_ORDER,
            isActive: entry.IS_ACTIVE,
          }))
      : (query.data?.b2b ?? [])
          .filter((entry) => entry.ZB2B_ID !== 0)
          .map((entry) => ({
            id: entry.ZB2B_ID,
            code: entry.ZB2B_CODE,
            name: entry.ZB2B_NAME,
            description: entry.DESCR,
            sortOrder: entry.SORT_ORDER,
            isActive: entry.IS_ACTIVE,
          }));
    const term = search.trim().toLocaleLowerCase("el");

    return normalized.filter((entry) => {
      if (activeFilter && entry.isActive !== Number(activeFilter)) {
        return false;
      }
      if (!term) return true;

      return [
        entry.id,
        entry.code,
        entry.name,
        entry.description,
        entry.sortOrder,
        entry.isActive,
      ].some((value) =>
        String(value ?? "")
          .toLocaleLowerCase("el")
          .includes(term)
      );
    });
  }, [activeFilter, isGroup, query.data, search]);

  const count = isGroup ? query.data?.counts.groups : query.data?.counts.b2b;

  return (
    <div className="min-w-0 max-w-full">
      <PageBreadcrumb pageTitle={title} />

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
          title={isGroup ? "Groups" : "B2B"}
          description={`Λίστα ${isGroup ? "Groups" : "B2B"} που επιστρέφει το Soft1`}
          count={
            count !== undefined ? (
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                {isGroup ? "Groups" : "B2B"}: {count}
              </span>
            ) : undefined
          }
          action={
            canEdit && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              <Plus className="h-4 w-4" />
              Νέο {isGroup ? "Group" : "B2B"}
            </button>
            )
          }
        />

        <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-4 dark:border-gray-800 dark:bg-gray-900/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1">
              <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                Αναζήτηση
              </span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ID, code, name ή description"
                  className={`${inputClassName} w-full pl-9`}
                />
              </span>
            </label>
            <label className="min-w-0 sm:w-64">
              <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                Κατάσταση
              </span>
              <select
                value={activeFilter}
                onChange={(event) =>
                  setActiveFilter(event.target.value as ActiveFilter)
                }
                className={`${inputClassName} w-full`}
              >
                <option value="">Όλα</option>
                <option value="1">Ενεργά</option>
                <option value="0">Ανενεργά</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
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
        ) : entries.length === 0 ? (
          <DataTableEmptyState
            icon={<Table2 className="h-7 w-7" />}
            title="Δεν βρέθηκαν εγγραφές"
            description={
              search.trim() || activeFilter
                ? "Δεν υπάρχουν εγγραφές που να ταιριάζουν με την αναζήτηση."
                : `Το Soft1 δεν επέστρεψε εγγραφές ${isGroup ? "Group" : "B2B"}.`
            }
          />
        ) : (
          <div className="max-h-[70vh] max-w-full overflow-auto overscroll-contain">
            <table className="w-full min-w-[860px] table-fixed divide-y divide-gray-100 text-left text-xs dark:divide-gray-800">
              <thead className="bg-gray-50 text-[10px] uppercase tracking-normal text-gray-500 shadow-sm dark:bg-gray-900 dark:text-gray-400 [&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-gray-50 dark:[&_th]:bg-gray-900">
                <tr>
                  <th className="w-32 px-3 py-2.5 font-semibold">{idLabel}</th>
                  <th className="w-32 px-3 py-2.5 font-semibold">
                    {codeLabel}
                  </th>
                  <th className="w-40 px-3 py-2.5 font-semibold">
                    {isGroup ? "ZGROUP_NAME" : "ZB2B_NAME"}
                  </th>
                  <th className="px-3 py-2.5 font-semibold">DESCR</th>
                  <th className="w-28 px-3 py-2.5 text-right font-semibold">
                    SORT_ORDER
                  </th>
                  <th className="w-24 px-3 py-2.5 font-semibold">IS_ACTIVE</th>
                  {canEdit && (
                    <th className="w-24 px-3 py-2.5 text-right font-semibold">
                      ΕΝΕΡΓΕΙΕΣ
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700 dark:divide-gray-800 dark:text-gray-300">
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="transition hover:bg-gray-50/80 dark:hover:bg-white/[0.02]"
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-mono font-semibold text-gray-900 dark:text-white">
                      {entry.id}
                    </td>
                    <td className="px-3 py-2">
                      <span className="block truncate" title={entry.code || undefined}>
                        {entry.code || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="block truncate"
                        title={entry.name || undefined}
                      >
                        {entry.name || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="block truncate"
                        title={entry.description || undefined}
                      >
                        {entry.description || "—"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      {entry.sortOrder ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                          entry.isActive === 1
                            ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {entry.isActive === 1 ? "Ενεργό" : "Ανενεργό"}
                      </span>
                    </td>
                    {canEdit && (
                    <td className="whitespace-nowrap px-2 py-2 text-right">
                      <div className="inline-flex items-center overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
                        <button
                          type="button"
                          onClick={() => setEditingRecord(entry)}
                          disabled={Boolean(updatingCode)}
                          title="Επεξεργασία"
                          aria-label={`Επεξεργασία ${entry.code}`}
                          className="flex h-8 w-8 items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-brand-600 disabled:opacity-40 dark:hover:bg-gray-800"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
                        <button
                          type="button"
                          onClick={() => void toggleActive(entry)}
                          disabled={Boolean(updatingCode)}
                          className={`flex h-8 min-w-12 items-center justify-center px-1.5 text-[10px] font-semibold disabled:opacity-40 ${
                            entry.isActive === 1
                              ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                              : "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                          }`}
                        >
                          {updatingCode === entry.code ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : entry.isActive === 1 ? (
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

      {creating || editingRecord ? (
        <ReferenceEditModal
          key={editingRecord ? `${kind}-${editingRecord.code}` : `${kind}-new`}
          kind={kind}
          record={editingRecord ?? undefined}
          onClose={() => {
            setCreating(false);
            setEditingRecord(null);
          }}
          onSaved={() => query.refetch()}
        />
      ) : null}
    </div>
  );
}
