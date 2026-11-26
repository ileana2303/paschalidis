"use client";

import { useEffect, useState } from "react";
import {
  PickingListPrintView,
  PickingOrderCard,
  PickingSortControls,
  type PickingOrderSort,
} from "../picking-list/picking-list-client";
import OrderTypePicker from "@/components/picking-list/order-type-picker";
import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import DataTable from "@/components/ui/data-table/data-table";
import DataTableEmptyState from "@/components/ui/data-table/data-table-empty-state";
import DataTableHeader from "@/components/ui/data-table/data-table-header";
import DataTableSearchBar from "@/components/ui/data-table/data-table-search-bar";
import { isPickingListUnauthorized, usePickingListStatusQuery } from "@/hooks/queries/usePickingListQueries";
import { useSessionState } from "@/hooks/useSessionState";
import { formatBranchLabel } from "@/lib/auth/branches";
import { canAccessPath, PICKING_LIST_STATUS_PATH } from "@/lib/auth/permissions";
import { ClipboardList, FileText, ListChevronsDownUp, ListChevronsUpDown, Loader2 } from "@/lib/icons/lucide";
import {
  getPickingOrderType,
  matchesPickingOrderSearch,
  PICKING_STATUS_FILTERS,
  sortPickingOrders,
  type PickingListOrder,
  type PickingOrderType,
  type PickingOrderTypeFilter,
  type PickingStatusFilter,
} from "@/lib/picking-list";
import { useAuthStore } from "@/stores/authStore";

const title = "Κατάσταση Picking List";
const emptyOrders: PickingListOrder[] = [];
const filterClass = "flex h-10 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300";
const selectClass = "min-w-0 border-0 bg-transparent text-xs font-semibold text-gray-700 dark:text-gray-200";

export default function PickingListStatusClient() {
  const canView = useAuthStore((state) => canAccessPath(state.permissions, PICKING_LIST_STATUS_PATH));
  const { data, error, isLoading, isFetching, refetch } = usePickingListStatusQuery(canView);
  const [search, setSearch] = useSessionState("picking-list-status-search", "");
  const [branch, setBranch] = useState("");
  const [status, setStatus] = useState<PickingStatusFilter>("ALL");
  const [type, setType] = useState<PickingOrderTypeFilter>("ALL");
  const [sort, setSort] = useState<PickingOrderSort>({ key: "date", direction: "desc" });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  if (!canView) return null;

  const orders = isPickingListUnauthorized(error) ? emptyOrders : data ?? emptyOrders;
  const branches = [...new Set(orders.map((order) => order.branch).filter(Boolean))].sort();
  const filtered = orders.filter((order) =>
    (!branch || order.branch === branch) &&
    (status === "ALL" || order.status === status) &&
    matchesPickingOrderSearch(order, search)
  );
  const counts: Record<PickingOrderType, number> = {
    WHOLESALE: 0,
    RETAIL: 0,
    REPLENISHMENT: 0,
    INTERNAL_TRANSFER: 0,
    PRIORITY: 0,
    OTHER: 0,
  };
  for (const order of filtered) counts[getPickingOrderType(order)] += 1;
  const visible = sortPickingOrders(
    type === "ALL" ? filtered : filtered.filter((order) => getPickingOrderType(order) === type),
    sort.key,
    sort.direction
  );
  const allExpanded = visible.length > 0 && visible.every(({ findoc }) => expanded.has(findoc));

  return (
    <>
      <div className="print:hidden">
        <PageBreadcrumb pageTitle={title} />
      </div>
      <DataTable className="mt-4 print:hidden">
        <DataTableHeader
          title={title}
          description="Παρακολούθηση της κατάστασης παραγγελιών από όλα τα καταστήματα."
          count={visible.length}
          action={
            <div className="flex w-full flex-wrap items-center gap-2 lg:justify-end">
              <label className={filterClass}>
                Κατάστημα
                <select value={branch} onChange={(event) => setBranch(event.target.value)} className={selectClass}>
                  <option value="">Όλα</option>
                  {branches.map((code) => <option key={code} value={code}>{formatBranchLabel(code)}</option>)}
                </select>
              </label>
              <label className={filterClass}>
                Status
                <select value={status} onChange={(event) => setStatus(event.target.value as PickingStatusFilter)} className={selectClass}>
                  {PICKING_STATUS_FILTERS.map(({ value, label }) => (
                    <option key={value} value={value}>{value === "ALL" ? "Όλα" : label}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => window.print()}
                disabled={visible.length === 0}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 hover:border-brand-300 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                <FileText aria-hidden="true" className="size-4" />
                Εξαγωγή PDF
              </button>
              <DataTableSearchBar
                value={search}
                onChange={setSearch}
                onRefresh={() => void refetch()}
                isRefreshing={isFetching}
                refreshDisabled={isFetching}
                placeholder="Παραστατικό, πελάτης, κωδικός..."
              />
            </div>
          }
        />
        <OrderTypePicker selectedType={type} counts={counts} onSelect={setType} />
        {error && (
          <p role="alert" className="px-4 py-3 text-sm text-red-700 dark:text-red-300">{error.message}</p>
        )}
        {isLoading ? (
          <div className="flex items-center justify-center px-5 py-16 text-gray-500 dark:text-gray-400">
            <Loader2 className="mr-2 size-4 animate-spin" /> Φόρτωση Picking List...
          </div>
        ) : visible.length === 0 ? (
          <DataTableEmptyState
            icon={<ClipboardList className="size-7" />}
            title="Δεν βρέθηκαν παραγγελίες"
            description="Δεν υπάρχουν παραγγελίες για τα φίλτρα που επιλέξατε."
          />
        ) : (
          <div className="flex flex-col gap-3 p-3 sm:p-4 xl:gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-950">
              <PickingSortControls
                sort={sort}
                onSort={(key) => setSort((current) => ({
                  key,
                  direction: current.key === key ? (current.direction === "asc" ? "desc" : "asc") : key === "date" ? "desc" : "asc",
                }))}
              />
              <button
                type="button"
                aria-label={allExpanded ? "Κλείσιμο λεπτομερειών" : "Άνοιγμα λεπτομερειών"}
                onClick={() => setExpanded(allExpanded ? new Set() : new Set(visible.map(({ findoc }) => findoc)))}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                {allExpanded ? <ListChevronsDownUp className="size-3.5" /> : <ListChevronsUpDown className="size-3.5" />}
                Είδη
              </button>
            </div>
            {visible.map((order) => (
              <PickingOrderCard
                key={order.findoc}
                order={order}
                expanded={expanded.has(order.findoc)}
                nowMs={nowMs}
                onToggleExpanded={({ findoc }, open) => setExpanded((current) => {
                  const next = new Set(current);
                  if (open) next.add(findoc);
                  else next.delete(findoc);
                  return next;
                })}
              />
            ))}
          </div>
        )}
      </DataTable>
      <PickingListPrintView orders={visible} activeBranch={branch} nowMs={nowMs} />
    </>
  );
}
