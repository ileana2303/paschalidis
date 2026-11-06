"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import toast from "react-hot-toast";
import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import OrderTypePicker from "@/components/picking-list/order-type-picker";
import DataTable from "@/components/ui/data-table/data-table";
import DataTableEmptyState from "@/components/ui/data-table/data-table-empty-state";
import DataTableHeader from "@/components/ui/data-table/data-table-header";
import DataTableSearchBar from "@/components/ui/data-table/data-table-search-bar";
import DataTableSelectionCheckbox from "@/components/ui/data-table/data-table-selection-checkbox";
import NumberBadge from "@/components/ui/data-table/number-badge";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ClipboardList,
  Clock3,
  FileText,
  ListChevronsDownUp,
  ListChevronsUpDown,
  Loader2,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
  X,
} from "@/lib/icons/lucide";
import {
  useDeletePickingListOrderMutation,
  usePickingListIntervalNotifications,
  usePickingListQuery,
  useUpdatePickingListOrderMutation,
} from "@/hooks/queries/usePickingListQueries";
import { useSessionState } from "@/hooks/useSessionState";
import { useCan } from "@/hooks/usePermissions";
import { useAuthStore } from "@/stores/authStore";
import {
  formatBranchLabel,
  getUserBranchOptions,
  normalizeBranchCode,
} from "@/lib/auth/branches";
import { formatDateTimeEl, formatMinutesAgoEl } from "@/lib/utils/date";
import {
  formatPickingOrderComments,
  getAutomaticPickingStatus,
  getFirstInteractionStatus,
  getNextPickingStatus,
  getPickingOrderType,
  getPickingOrderTypeOption,
  getPickingPositionsForBranch,
  matchesPickingOrderSearch,
  PICKER_COMMENT_SUGGESTIONS,
  PICKING_STATUS_FILTERS,
  sortPickingOrders,
  shouldShowRetailCustomerName,
  type PickingListOrder,
  type PickingListUpdatePayload,
  type PickingOrderSortDirection,
  type PickingOrderSortKey,
  type PickingOrderType,
  type PickingOrderTypeFilter,
  type PickingStatusFilter,
} from "@/lib/picking-list";

const EMPTY_PICKING_ORDERS: PickingListOrder[] = [];

type PickingOrderSort = {
  key: PickingOrderSortKey;
  direction: PickingOrderSortDirection;
};

function PickingOrderTypeBadge({ order }: { order: PickingListOrder }) {
  const option = getPickingOrderTypeOption(getPickingOrderType(order));

  return (
    <span
      className={[
        "inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset",
        option.tone,
      ].join(" ")}
    >
      {option.label}
    </span>
  );
}

const PICKING_SORT_OPTIONS: ReadonlyArray<{
  key: PickingOrderSortKey;
  label: string;
}> = [
  { key: "date", label: "ΗΜΕΡΟΜΗΝΙΑ" },
  { key: "customerName", label: "ΠΕΛΑΤΗΣ" },
  { key: "orderType", label: "ΤΥΠΟΣ" },
];

function PickingSortControls({
  sort,
  onSort,
}: {
  sort: PickingOrderSort;
  onSort: (key: PickingOrderSortKey) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Ταξινόμηση παραγγελιών"
      className="flex flex-wrap items-center gap-1.5"
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        ΤΑΞΙΝΟΜΗΣΗ
      </span>
      {PICKING_SORT_OPTIONS.map((option) => {
        const active = sort.key === option.key;
        const directionLabel =
          sort.direction === "asc" ? "αύξουσα" : "φθίνουσα";

        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onSort(option.key)}
            aria-pressed={active}
            title={
              active
                ? `Ταξινόμηση: ${option.label} (${directionLabel})`
                : `Ταξινόμηση: ${option.label}`
            }
            className={[
              "inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-semibold tracking-wide ring-1 ring-inset transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
              active
                ? "bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/30"
                : "bg-white text-gray-600 ring-gray-200 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-800",
            ].join(" ")}
          >
            {option.label}
            {active ? (
              sort.direction === "asc" ? (
                <ArrowUp aria-hidden="true" className="size-3.5" />
              ) : (
                <ArrowDown aria-hidden="true" className="size-3.5" />
              )
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

type PickingOrderCardProps = {
  order: PickingListOrder;
  activeBranch: string;
  expanded: boolean;
  selected: boolean;
  pickedDetailKeys: ReadonlySet<string>;
  updating: boolean;
  nowMs: number;
  onToggleExpanded: (order: PickingListOrder, expanded: boolean) => void;
  onToggleSelected: (findoc: string) => void;
  onToggleDetailPicked: (detailKey: string) => void;
  onSaveComment: (order: PickingListOrder, comment: string) => void;
  onAdvanceStatus: (order: PickingListOrder) => void;
};

type PickingCompletionButtonProps = {
  order: PickingListOrder;
  updating: boolean;
  onComplete: () => void;
};

function PickingCompletionButton({
  order,
  updating,
  onComplete,
}: PickingCompletionButtonProps) {
  const can = useCan();
  const completed = order.status === "PICKED_IT_UP";
  const canComplete = getNextPickingStatus(order.status) === "PICKED_IT_UP";
  const orderLabel = order.parastatiko || order.fincode || order.findoc;

  if (!can("picked-it-up")) {
    return completed ? (
      <span className="inline-flex h-9 w-full min-w-[150px] items-center justify-center gap-1.5 rounded-lg bg-success-50 px-3 text-xs font-semibold text-success-700 ring-1 ring-inset ring-success-200 dark:bg-success-500/10 dark:text-success-400 dark:ring-success-500/30">
        <Check aria-hidden="true" className="size-4" />
        PICKED IT UP
      </span>
    ) : null;
  }

  return (
    <button
      type="button"
      onClick={onComplete}
      disabled={!canComplete || updating}
      aria-label={`Σήμανση παραγγελίας ${orderLabel} ως PICKED IT UP`}
      title={
        completed
          ? "Η παραγγελία έχει ολοκληρωθεί."
          : canComplete
            ? "Σήμανση παραγγελίας ως PICKED IT UP"
            : "Η παραγγελία δεν είναι ακόμη έτοιμη για ολοκλήρωση."
      }
      className={[
        "inline-flex h-9 w-full min-w-[150px] items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
        completed
          ? "cursor-default bg-success-50 text-success-700 ring-1 ring-inset ring-success-200 dark:bg-success-500/10 dark:text-success-400 dark:ring-success-500/30"
          : canComplete
            ? "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:cursor-wait disabled:opacity-60"
            : "cursor-not-allowed bg-gray-100 text-gray-400 ring-1 ring-inset ring-gray-200 dark:bg-gray-800/60 dark:text-gray-500 dark:ring-gray-700",
      ].join(" ")}
    >
      {updating ? (
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
      ) : (
        <Check aria-hidden="true" className="size-4" />
      )}
      PICKED IT UP
    </button>
  );
}

function ElapsedTimeBadge({ label }: { label: string | null }) {
  if (!label) return null;

  return (
    <span
      className="inline-flex w-fit items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700 ring-1 ring-inset ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700"
      title="Χρόνος από την υποβολή"
    >
      <Clock3 aria-hidden="true" className="size-3.5 shrink-0" />
      {label}
    </span>
  );
}

function getPickingDetailKey(
  findoc: string,
  lineNumber: string,
  code: string,
  index: number
) {
  return `${findoc}:${lineNumber}:${code}:${index}`;
}

function PickingLineCheckbox({
  checked,
  ariaLabel,
  onToggle,
}: {
  checked: boolean;
  ariaLabel: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className={[
        "inline-flex size-6 shrink-0 items-center justify-center rounded border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 print:size-5 print:rounded-none print:border-black print:bg-white print:text-black",
        checked
          ? "border-success-500 bg-success-500 text-white"
          : "border-gray-300 bg-white text-transparent hover:border-gray-400 dark:border-gray-600 dark:bg-gray-900",
      ].join(" ")}
    >
      {checked ? <Check aria-hidden="true" className="size-4" /> : null}
    </button>
  );
}

const PICKING_DETAIL_GRID =
  "grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-3 sm:grid-cols-[1.75rem_minmax(8rem,12rem)_3.5rem_minmax(8rem,13rem)_minmax(0,1fr)]";

function PickingOrderDetailsPanel({
  order,
  activeBranch,
  pickedDetailKeys,
  onToggleDetailPicked,
  footerAction,
  insetClassName = "px-3",
}: {
  order: PickingListOrder;
  activeBranch: string;
  pickedDetailKeys: ReadonlySet<string>;
  onToggleDetailPicked: (detailKey: string) => void;
  footerAction?: ReactNode;
  /** Horizontal padding for every band, so backgrounds run edge to edge. */
  insetClassName?: string;
}) {
  if (order.details.length === 0) {
    return (
      <p
        className={`border-t border-gray-200 bg-white py-3 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 ${insetClassName}`}
      >
        Δεν υπάρχουν διαθέσιμες γραμμές ειδών.
      </p>
    );
  }

  const lines = order.details.map((detail, index) => ({
    detail,
    index,
    detailKey: getPickingDetailKey(
      order.findoc,
      detail.lineNumber,
      detail.code,
      index
    ),
  }));
  const pickedCount = lines.filter(({ detailKey }) =>
    pickedDetailKeys.has(detailKey)
  ).length;
  const progressLabel = `${pickedCount}/${lines.length}`;
  const allPicked = pickedCount === lines.length;

  return (
    <div className="bg-white dark:bg-gray-900">
      <div
        className={`${PICKING_DETAIL_GRID} ${insetClassName} border-y border-gray-200 bg-gray-50 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400`}
      >
        <span
          className="text-center tabular-nums text-gray-700 dark:text-gray-200"
          title="Συλλεγμένες / σύνολο γραμμών"
        >
          {progressLabel}
        </span>
        <span className="hidden sm:block">ΚΩΔΙΚΟΣ</span>
        <span className="hidden text-right sm:block">ΠΟΣ</span>
        <span className="hidden sm:block">ΘΕΣΗ</span>
        <span className="hidden sm:block">ΠΕΡΙΓΡΑΦΗ</span>
        <span className="col-span-2 sm:hidden">
          ΚΩΔΙΚΟΣ · ΘΕΣΗ · ΠΟΣ
        </span>
      </div>

      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {lines.map(({ detail, index, detailKey }) => {
          const positions = getPickingPositionsForBranch(detail, activeBranch);
          const picked = pickedDetailKeys.has(detailKey);
          const detailLabel =
            detail.description || detail.code || `${index + 1}`;

          return (
            <li
              key={`${detail.lineNumber}-${detail.code}-${index}`}
              onClick={() => {
                if (window.getSelection()?.toString()) return;
                onToggleDetailPicked(detailKey);
              }}
              className={[
                PICKING_DETAIL_GRID,
                insetClassName,
                "cursor-pointer gap-y-1 py-2 transition-colors",
                picked
                  ? "bg-success-25 dark:bg-success-500/[0.06]"
                  : "hover:bg-gray-50 dark:hover:bg-white/[0.03]",
              ].join(" ")}
            >
              <PickingLineCheckbox
                checked={picked}
                ariaLabel={`Σήμανση είδους ${detailLabel} ως συλλεγμένο`}
                onToggle={() => onToggleDetailPicked(detailKey)}
              />

              <span
                className={[
                  "break-all font-mono text-sm font-bold",
                  picked
                    ? "text-gray-400 line-through dark:text-gray-500"
                    : "text-gray-900 dark:text-white",
                ].join(" ")}
              >
                {detail.code || "—"}
              </span>

              <span
                className={[
                  "text-right text-base font-bold tabular-nums",
                  picked
                    ? "text-gray-400 dark:text-gray-500"
                    : "text-brand-700 dark:text-brand-300",
                ].join(" ")}
              >
                {detail.quantity || "0"}
              </span>

              <div
                className={[
                  "col-span-2 col-start-2 flex flex-wrap gap-1 sm:col-span-1 sm:col-start-auto",
                  picked ? "opacity-50" : "",
                ].join(" ")}
              >
                {positions.length > 0 ? (
                  positions.map((position, positionIndex) => (
                    <span
                      key={`${position}-${positionIndex}`}
                      className="inline-block max-w-full break-all rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs font-bold tracking-wide text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                    >
                      {position}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </div>

              <p
                className={[
                  "col-span-2 col-start-2 break-words text-xs leading-5 sm:col-span-1 sm:col-start-auto sm:text-sm",
                  picked
                    ? "text-gray-400 dark:text-gray-500"
                    : "text-gray-600 dark:text-gray-300",
                ].join(" ")}
              >
                {detail.description || "—"}
              </p>
            </li>
          );
        })}
      </ul>

      {footerAction ? (
        <div
          className={[
            insetClassName,
            "flex flex-col gap-2 border-t py-2 sm:flex-row sm:items-center sm:justify-between",
            allPicked
              ? "border-success-200 bg-success-50 dark:border-success-500/30 dark:bg-success-500/[0.08]"
              : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950",
          ].join(" ")}
        >
          <p
            className={[
              "text-xs font-semibold",
              allPicked
                ? "text-success-700 dark:text-success-400"
                : "text-gray-600 dark:text-gray-300",
            ].join(" ")}
          >
            {allPicked
              ? "Όλα τα είδη συλλέχθηκαν"
              : `Συλλέχθηκαν ${pickedCount} από ${lines.length} είδη`}
          </p>
          <div className="sm:w-56 sm:shrink-0">{footerAction}</div>
        </div>
      ) : null}
    </div>
  );
}

function PickingListPrintView({
  orders,
  activeBranch,
  pickedDetailKeys,
  nowMs,
}: {
  orders: PickingListOrder[];
  activeBranch: string;
  pickedDetailKeys: ReadonlySet<string>;
  nowMs: number;
}) {
  return (
    <section className="hidden bg-white text-black print:block">
      <style>{`@page { size: A4 landscape; margin: 10mm; }`}</style>

      <header className="mb-5 border-b-2 border-black pb-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Picking List</h1>
            <p className="mt-1 text-sm font-semibold">
              {formatBranchLabel(activeBranch)}
            </p>
          </div>
          <div className="text-right text-xs">
            <p>{orders.length} παραγγελίες</p>
            <p>{formatDateTimeEl(new Date(nowMs).toISOString())}</p>
          </div>
        </div>
      </header>

      <div className="space-y-5">
        {orders.map((order, orderIndex) => {
          const parastatikoLabel =
            order.parastatiko || order.fincode || order.findoc;
          const retailCustomerName = shouldShowRetailCustomerName(order)
            ? order.retailCustomerName
            : "";
          const orderTypeLabel = getPickingOrderTypeOption(
            getPickingOrderType(order)
          ).label;
          const printLines = order.details.map((detail, detailIndex) => ({
            detail,
            detailKey: getPickingDetailKey(
              order.findoc,
              detail.lineNumber,
              detail.code,
              detailIndex
            ),
          }));
          const pickedCount = printLines.filter(({ detailKey }) =>
            pickedDetailKeys.has(detailKey)
          ).length;

          return (
            <article
              key={`print-${order.findoc}`}
              className="border border-black"
            >
              <div className="break-inside-avoid border-b border-black px-3 py-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold">
                      {orderIndex + 1}. {parastatikoLabel}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold">
                      {order.customerName || "—"}
                      {retailCustomerName
                        ? ` · ${retailCustomerName}`
                        : ""}
                    </p>
                  </div>
                  <div className="text-right text-[10px] leading-4">
                    <p>
                      Υποβολή:{" "}
                      {formatDateTimeEl(
                        order.submittedAt || order.transactionDate
                      )}
                    </p>
                    <p>{formatBranchLabel(order.branch)}</p>
                    <p>Πωλητής: {order.submittedBy || "—"}</p>
                  </div>
                </div>
                <div className="mt-1.5 text-[10px] leading-4">
                  <p>
                    <span className="mr-1.5 inline-block border border-black px-1.5 font-bold uppercase">
                      {orderTypeLabel}
                    </span>
                    {order.comments
                      ? formatPickingOrderComments(order.comments)
                      : null}
                  </p>
                  {order.remarks ? (
                    <p className="mt-0.5">
                      <span className="font-bold">ΠΑΡΑΤ.:</span> {order.remarks}
                    </p>
                  ) : null}
                </div>
              </div>

              <table className="w-full table-fixed border-collapse text-[10px]">
                <thead>
                  <tr className="break-inside-avoid border-b border-black">
                    <th className="w-[6%] px-2 py-1.5 text-center tabular-nums">
                      {pickedCount}/{printLines.length}
                    </th>
                    <th className="w-[20%] px-2 py-1.5 text-left">ΚΩΔΙΚΟΣ</th>
                    <th className="w-[8%] px-2 py-1.5 text-right">ΠΟΣ</th>
                    <th className="w-[22%] px-2 py-1.5 text-left">ΘΕΣΗ</th>
                    <th className="px-2 py-1.5 text-left">ΠΕΡΙΓΡΑΦΗ</th>
                  </tr>
                </thead>
                <tbody>
                  {printLines.length > 0 ? (
                    printLines.map(({ detail, detailKey }) => {
                      const picked = pickedDetailKeys.has(detailKey);
                      const positions = getPickingPositionsForBranch(
                        detail,
                        activeBranch
                      );

                      return (
                        <tr
                          key={`print-${detailKey}`}
                          className="break-inside-avoid border-b border-gray-400 last:border-b-0"
                        >
                          <td className="px-2 py-2 text-center align-top">
                            <span className="inline-flex size-4 items-center justify-center border-2 border-black text-xs font-bold leading-none">
                              {picked ? "✓" : ""}
                            </span>
                          </td>
                          <td
                            className={[
                              "break-all px-2 py-2 align-top font-mono text-[11px] font-bold",
                              picked ? "line-through" : "",
                            ].join(" ")}
                          >
                            {detail.code || "—"}
                          </td>
                          <td className="px-2 py-2 text-right align-top text-[12px] font-bold tabular-nums">
                            {detail.quantity || "0"}
                          </td>
                          <td className="px-2 py-2 align-top font-mono font-bold">
                            {positions.join(" · ") || "—"}
                          </td>
                          <td className="break-words px-2 py-2 align-top">
                            {detail.description || "—"}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center">
                        Δεν υπάρχουν διαθέσιμες γραμμές ειδών.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {printLines.length > 0 ? (
                <p className="break-inside-avoid border-t border-black px-3 py-1.5 text-[10px] font-semibold">
                  {pickedCount === printLines.length
                    ? "Όλα τα είδη συλλέχθηκαν"
                    : `Συλλέχθηκαν ${pickedCount} από ${printLines.length} είδη`}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PickerCommentField({
  order,
  updating,
  onSaveComment,
}: {
  order: PickingListOrder;
  updating: boolean;
  onSaveComment: (order: PickingListOrder, comment: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(order.pickerComment);
  const hasChange = draft.trim() !== order.pickerComment;
  const orderLabel = order.parastatiko || order.fincode || order.findoc;
  const suggestionListId = `picker-comments-${order.findoc.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  const startEditing = () => {
    setDraft(order.pickerComment);
    setEditing(true);
  };
  const save = () => {
    if (!hasChange || updating) return;
    onSaveComment(order, draft);
    setEditing(false);
  };

  // Collapsed: a compact chip, so an empty comment doesn't take a full-width input.
  if (!editing) {
    return order.pickerComment ? (
      <button
        type="button"
        onClick={startEditing}
        disabled={updating}
        title={`Σχόλιο picker: ${order.pickerComment} (πατήστε για αλλαγή)`}
        aria-label={`Αλλαγή σχολίου picker για ${orderLabel}`}
        className="inline-flex h-9 min-w-0 max-w-full items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200 transition hover:bg-amber-100 disabled:opacity-60 sm:max-w-[16rem] dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30 dark:hover:bg-amber-500/20"
      >
        <StickyNote aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="truncate">{order.pickerComment}</span>
        <Pencil aria-hidden="true" className="size-3 shrink-0 opacity-60" />
      </button>
    ) : (
      <button
        type="button"
        onClick={startEditing}
        disabled={updating}
        aria-label={`Προσθήκη σχολίου picker για ${orderLabel}`}
        className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-gray-500 ring-1 ring-inset ring-gray-200 transition hover:bg-gray-50 hover:text-gray-700 disabled:opacity-60 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
      >
        <Plus aria-hidden="true" className="size-3.5" />
        Σχόλιο
      </button>
    );
  }

  return (
    <div className="flex min-w-[12rem] flex-1 items-center gap-1.5">
      <input
        type="text"
        autoFocus
        list={suggestionListId}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            save();
          } else if (event.key === "Escape") {
            setEditing(false);
          }
        }}
        disabled={updating}
        placeholder="Σχόλιο picker..."
        aria-label={`Σχόλιο picker για ${orderLabel}`}
        className="h-9 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
      />
      <datalist id={suggestionListId}>
        {PICKER_COMMENT_SUGGESTIONS.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
      <button
        type="button"
        onClick={save}
        disabled={!hasChange || updating}
        title="Αποθήκευση σχολίου"
        aria-label={`Αποθήκευση σχολίου για ${orderLabel}`}
        className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-600 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-300 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300 dark:disabled:border-gray-700 dark:disabled:bg-gray-800 dark:disabled:text-gray-600"
      >
        {updating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        title="Ακύρωση"
        aria-label="Ακύρωση επεξεργασίας σχολίου"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function PickingOrderCard({
  order,
  activeBranch,
  expanded,
  selected,
  pickedDetailKeys,
  updating,
  nowMs,
  onToggleExpanded,
  onToggleSelected,
  onToggleDetailPicked,
  onSaveComment,
  onAdvanceStatus,
}: PickingOrderCardProps) {
  const safeFindoc = order.findoc.replace(/[^a-zA-Z0-9_-]/g, "-");
  const detailsId = `picking-list-details-${safeFindoc}`;
  const submittedMinutesAgo = formatMinutesAgoEl(order.submittedAt, nowMs);
  const parastatikoLabel = order.parastatiko || order.fincode;
  const showRetailCustomerName = shouldShowRetailCustomerName(order);
  const displayedComments = formatPickingOrderComments(order.comments);
  const orderTypeOption = getPickingOrderTypeOption(getPickingOrderType(order));

  return (
    <article
      className={[
        "overflow-hidden rounded-xl border border-l-4 border-gray-200 bg-white shadow-theme-xs transition-shadow dark:border-gray-800 dark:bg-gray-900",
        orderTypeOption.borderTone,
        expanded
          ? "shadow-theme-md ring-1 ring-brand-500/25 dark:ring-brand-500/30"
          : "hover:shadow-theme-sm",
      ].join(" ")}
    >
      {/* Mobile/tablet: stacked. xl+: one row (checkbox · chevron · customer · submission · type · actions). */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-3 p-4 xl:grid-cols-[auto_auto_minmax(0,1.1fr)_minmax(0,0.75fr)_minmax(0,1.25fr)_minmax(0,1.6fr)] xl:items-center xl:gap-x-5 xl:py-3">
        <div className="order-1 pt-0.5 xl:pt-0">
          <DataTableSelectionCheckbox
            ariaLabel={`Επιλογή παραγγελίας ${parastatikoLabel || order.findoc}`}
            checked={selected}
            onCheckedChange={() => onToggleSelected(order.findoc)}
            disabled={updating}
          />
        </div>

        <div className="order-2 min-w-0 xl:order-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="break-words text-base font-semibold text-gray-900 xl:text-sm dark:text-white">
              {order.customerName || "—"}
            </p>
            {showRetailCustomerName ? (
              <span className="inline-flex max-w-full rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold text-brand-700 ring-1 ring-inset ring-brand-200 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-500/25">
                {order.retailCustomerName}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Κωδικός: {order.customerCode || "—"} · ΑΦΜ: {order.afm || "—"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onToggleExpanded(order, !expanded)}
          aria-expanded={expanded}
          aria-controls={detailsId}
          aria-label={`${expanded ? "Σύμπτυξη" : "Ανάπτυξη"} ειδών παραγγελίας ${parastatikoLabel || order.findoc}`}
          className={[
            "order-3 inline-flex size-9 shrink-0 items-center justify-center rounded-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 xl:order-2",
            expanded
              ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300",
          ].join(" ")}
        >
          <ChevronDown
            strokeWidth={2.25}
            className={`size-5 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>

        {/* On xl the wrapper dissolves so both blocks become grid columns. */}
        <div className="order-4 col-span-full grid gap-3 md:col-span-2 md:col-start-2 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] xl:contents">
          <div className="space-y-1 xl:order-4">
            <ElapsedTimeBadge label={submittedMinutesAgo} />
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
              {formatDateTimeEl(order.submittedAt || order.transactionDate)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatBranchLabel(order.branch)}
            </p>
            <p className="break-words text-xs text-gray-500 dark:text-gray-400">
              Πωλητής:{" "}
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {order.submittedBy || "—"}
              </span>
            </p>
          </div>

          <div className="min-w-0 space-y-1.5 xl:order-5">
            <PickingOrderTypeBadge order={order} />
            {order.comments ? (
              <p
                className="break-words text-sm text-gray-600 dark:text-gray-300"
              >
                {displayedComments}
              </p>
            ) : null}
            {order.remarks ? (
              <p
                className="break-words rounded-md bg-gray-50 px-2.5 py-1.5 text-xs text-gray-600 xl:line-clamp-2 dark:bg-gray-950 dark:text-gray-300"
                title={order.remarks}
              >
                <span className="font-semibold text-gray-500 dark:text-gray-400">
                  ΠΑΡΑΤ.:
                </span>{" "}
                {order.remarks}
              </p>
            ) : null}
          </div>
        </div>

        <div className="order-5 col-span-full flex flex-wrap items-center gap-2 md:col-span-2 md:col-start-2 xl:order-6 xl:col-span-1 xl:col-start-auto">
          <PickerCommentField
            order={order}
            updating={updating}
            onSaveComment={onSaveComment}
          />
          <div className="w-full sm:ml-auto sm:w-52 sm:shrink-0">
            <PickingCompletionButton
              order={order}
              updating={updating}
              onComplete={() => onAdvanceStatus(order)}
            />
          </div>
        </div>
      </div>

      {expanded ? (
        <div id={detailsId}>
          <PickingOrderDetailsPanel
            insetClassName="px-4"
            order={order}
            activeBranch={activeBranch}
            pickedDetailKeys={pickedDetailKeys}
            onToggleDetailPicked={onToggleDetailPicked}
            footerAction={
              <PickingCompletionButton
                order={order}
                updating={updating}
                onComplete={() => onAdvanceStatus(order)}
              />
            }
          />
        </div>
      ) : null}
    </article>
  );
}

export default function PickingListClient() {
  const user = useAuthStore((state) => state.user);
  const can = useCan();
  const permissions = useAuthStore((state) => state.permissions);
  const setAuth = useAuthStore((state) => state.setAuth);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<PickingStatusFilter>("ALL");
  const [orderTypeFilter, setOrderTypeFilter] =
    useState<PickingOrderTypeFilter>("ALL");
  const [sort, setSort] = useState<PickingOrderSort>({
    key: "date",
    direction: "desc",
  });
  const { data, isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = usePickingListQuery(statusFilter);
  const orders = data ?? EMPTY_PICKING_ORDERS;
  const { mutateAsync: updatePickingListOrder } =
    useUpdatePickingListOrderMutation(statusFilter);
  const { mutateAsync: deletePickingListOrder } =
    useDeletePickingListOrderMutation(statusFilter);
  const [searchTerm, setSearchTerm] = useSessionState(
    "picking-list-search",
    ""
  );
  const [expandedFindocs, setExpandedFindocs] = useState<Set<string>>(
    new Set()
  );
  const [selectedFindocs, setSelectedFindocs] = useState<Set<string>>(
    new Set()
  );
  const [pickedDetailKeys, setPickedDetailKeys] = useState<Set<string>>(
    new Set()
  );
  const [updatingFindocs, setUpdatingFindocs] = useState<Set<string>>(
    new Set()
  );
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const inFlightFindocs = useRef(new Set<string>());
  const automaticLoadAttemptedFindocs = useRef(new Set<string>());

  const currentBranch = useMemo(
    () => normalizeBranchCode(user?.mainBranch),
    [user?.mainBranch]
  );
  const syncedTopbarBranchRef = useRef<string | null>(null);

  const handleRefresh = useCallback(() => {
    automaticLoadAttemptedFindocs.current.clear();
    void refetch();
  }, [refetch]);

  const handleExportPdf = useCallback(() => {
    window.print();
  }, []);

  useEffect(() => {
    automaticLoadAttemptedFindocs.current.clear();
  }, [statusFilter]);

  useEffect(() => {
    if (!isError || !error) return;

    toast.error(
      error instanceof Error ? error.message : "Αποτυχία φόρτωσης Picking List."
    );
  }, [error, isError]);

  const branchOptions = useMemo(
    () => getUserBranchOptions(user, permissions),
    [permissions, user]
  );
  const activeBranch = useMemo(() => {
    const validCodes = new Set(branchOptions.map((branch) => branch.code));

    if (selectedBranch && validCodes.has(selectedBranch)) {
      return selectedBranch;
    }

    if (currentBranch && validCodes.has(currentBranch)) {
      return currentBranch;
    }

    return branchOptions[0]?.code ?? "";
  }, [branchOptions, currentBranch, selectedBranch]);

  usePickingListIntervalNotifications({
    branch: activeBranch,
    enabled: !isLoading && Boolean(activeBranch),
    orders,
    refetch,
  });

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!currentBranch) return;
    if (syncedTopbarBranchRef.current === currentBranch) return;

    syncedTopbarBranchRef.current = currentBranch;
    setSelectedBranch(currentBranch);
    setSelectedFindocs(new Set());
    setExpandedFindocs(new Set());
  }, [currentBranch]);

  const ordersBeforeTypeFilter = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.branch === activeBranch &&
          (statusFilter === "ALL" || order.status === statusFilter) &&
          matchesPickingOrderSearch(order, searchTerm)
      ),
    [activeBranch, orders, searchTerm, statusFilter]
  );

  const orderTypeCounts = useMemo<Record<PickingOrderType, number>>(() => {
    const counts: Record<PickingOrderType, number> = {
      WHOLESALE: 0,
      RETAIL: 0,
      REPLENISHMENT: 0,
      INTERNAL_TRANSFER: 0,
      OTHER: 0,
    };

    ordersBeforeTypeFilter.forEach((order) => {
      counts[getPickingOrderType(order)] += 1;
    });

    return counts;
  }, [ordersBeforeTypeFilter]);

  const visibleOrders = useMemo(() => {
    const filteredOrders = orderTypeFilter === "ALL"
      ? ordersBeforeTypeFilter
      : ordersBeforeTypeFilter.filter(
          (order) => getPickingOrderType(order) === orderTypeFilter
        );

    return sortPickingOrders(filteredOrders, sort.key, sort.direction);
  }, [orderTypeFilter, ordersBeforeTypeFilter, sort]);

  const handleSelectOrderType = useCallback(
    (type: PickingOrderTypeFilter) => {
      setOrderTypeFilter(type);
      setSelectedFindocs(new Set());
      setExpandedFindocs(new Set());
    },
    []
  );

  const handleSort = useCallback((key: PickingOrderSortKey) => {
    setSort((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        key,
        direction: key === "date" ? "desc" : "asc",
      };
    });
  }, []);

  const visibleFindocs = useMemo(
    () => visibleOrders.map((order) => order.findoc),
    [visibleOrders]
  );
  const selectedVisibleOrders = useMemo(
    () => visibleOrders.filter((order) => selectedFindocs.has(order.findoc)),
    [selectedFindocs, visibleOrders]
  );
  const selectedVisibleCount = selectedVisibleOrders.length;
  const allVisibleSelected =
    visibleFindocs.length > 0 &&
    selectedVisibleCount === visibleFindocs.length;
  const someVisibleSelected =
    selectedVisibleCount > 0 && !allVisibleSelected;
  const allVisibleExpanded =
    visibleFindocs.length > 0 &&
    visibleFindocs.every((findoc) => expandedFindocs.has(findoc));
  const canCompleteSelectedOrders =
    selectedVisibleOrders.length > 0 &&
    selectedVisibleOrders.every(
      (order) =>
        getNextPickingStatus(order.status) === "PICKED_IT_UP" &&
        !updatingFindocs.has(order.findoc)
    );

  const persistOrderUpdate = useCallback(
    async (
      payload: PickingListUpdatePayload,
      successMessage?: string | false
    ) => {
      const findoc = payload.findoc.trim();
      if (!findoc || inFlightFindocs.current.has(findoc)) return false;

      inFlightFindocs.current.add(findoc);
      setUpdatingFindocs((current) => new Set(current).add(findoc));

      try {
        const response = await updatePickingListOrder(payload);

        if (
          payload.status &&
          statusFilter !== "ALL" &&
          payload.status !== statusFilter
        ) {
          setSelectedFindocs((current) => {
            const next = new Set(current);
            next.delete(findoc);
            return next;
          });
          setExpandedFindocs((current) => {
            const next = new Set(current);
            next.delete(findoc);
            return next;
          });
        }

        if (successMessage !== false) {
          toast.success(successMessage || response.message || "Η παραγγελία ενημερώθηκε.");
        }

        return true;
      } catch (error) {
        if (successMessage !== false) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Αποτυχία ενημέρωσης Picking List."
          );
        }
        return false;
      } finally {
        inFlightFindocs.current.delete(findoc);
        setUpdatingFindocs((current) => {
          const next = new Set(current);
          next.delete(findoc);
          return next;
        });
      }
    },
    [statusFilter, updatePickingListOrder]
  );

  const registerFirstInteraction = useCallback(
    (order: PickingListOrder) => {
      const status = getFirstInteractionStatus(order.status);
      if (!status) return;

      void persistOrderUpdate(
        { findoc: order.findoc, branch: order.branch, status },
        false
      );
    },
    [persistOrderUpdate]
  );

  useEffect(() => {
    if (isLoading || !activeBranch) return;

    const ordersToLoad = orders.flatMap((order) => {
      const status = getAutomaticPickingStatus(order.status);

      if (
        order.branch !== activeBranch ||
        !status ||
        automaticLoadAttemptedFindocs.current.has(order.findoc)
      ) {
        return [];
      }

      return [{ order, status }];
    });

    if (ordersToLoad.length === 0) return;

    ordersToLoad.forEach(({ order }) => {
      automaticLoadAttemptedFindocs.current.add(order.findoc);
    });

    void Promise.all(
      ordersToLoad.map(({ order, status }) =>
        persistOrderUpdate(
          {
            findoc: order.findoc,
            branch: order.branch,
            status,
          },
          false
        )
      )
    ).then((results) => {
      const failedCount = results.filter((updated) => !updated).length;
      if (failedCount === 0) return;

      toast.error(
        failedCount === 1
          ? "1 παραγγελία δεν ενημερώθηκε στο SoftOne."
          : `${failedCount} παραγγελίες δεν ενημερώθηκαν στο SoftOne.`
      );
    });
  }, [activeBranch, isLoading, orders, persistOrderUpdate]);

  const handleToggleExpanded = useCallback(
    (order: PickingListOrder, expanded: boolean) => {
      setExpandedFindocs((current) => {
        const next = new Set(current);
        if (expanded) next.add(order.findoc);
        else next.delete(order.findoc);
        return next;
      });

      registerFirstInteraction(order);
    },
    [registerFirstInteraction]
  );

  const handleSaveComment = useCallback(
    (order: PickingListOrder, pickerComment: string) => {
      const firstInteractionStatus = getFirstInteractionStatus(order.status);
      void persistOrderUpdate(
        {
          findoc: order.findoc,
          branch: order.branch,
          pickerComment,
          ...(firstInteractionStatus ? { status: firstInteractionStatus } : {}),
        },
        "Το σχόλιο picker αποθηκεύτηκε."
      );
    },
    [persistOrderUpdate]
  );

  const handleAdvanceStatus = useCallback(
    (order: PickingListOrder) => {
      const status = getNextPickingStatus(order.status);
      if (status !== "PICKED_IT_UP") return;

      void (async () => {
        const updated = await persistOrderUpdate(
          { findoc: order.findoc, branch: order.branch, status },
          "Η παραγγελία σημάνθηκε ως PICKED IT UP."
        );

        if (updated) await refetch();
      })();
    },
    [persistOrderUpdate, refetch]
  );

  const handleCompleteSelectedOrders = useCallback(async () => {
    if (
      selectedVisibleOrders.length === 0 ||
      selectedVisibleOrders.some(
        (order) => getNextPickingStatus(order.status) !== "PICKED_IT_UP"
      )
    ) {
      return;
    }

    setBulkUpdating(true);

    try {
      const results = await Promise.all(
        selectedVisibleOrders.map((order) =>
          persistOrderUpdate(
            {
              findoc: order.findoc,
              branch: order.branch,
              status: "PICKED_IT_UP",
            },
            false
          )
        )
      );
      const completedFindocs = new Set(
        selectedVisibleOrders.flatMap((order, index) =>
          results[index] ? [order.findoc] : []
        )
      );

      if (completedFindocs.size > 0) {
        setSelectedFindocs((current) => {
          const next = new Set(current);
          completedFindocs.forEach((findoc) => next.delete(findoc));
          return next;
        });

        toast.success(
          completedFindocs.size === 1
            ? "Η επιλεγμένη παραγγελία σημάνθηκε ως PICKED IT UP."
            : `${completedFindocs.size} επιλεγμένες παραγγελίες σημάνθηκαν ως PICKED IT UP.`
        );

        await refetch();
      }
    } finally {
      setBulkUpdating(false);
    }
  }, [persistOrderUpdate, refetch, selectedVisibleOrders]);

  const handleDeleteSelectedOrders = useCallback(async () => {
    if (selectedVisibleOrders.length === 0 || deletingSelected) return;

    const count = selectedVisibleOrders.length;
    const confirmed = window.confirm(
      count === 1
        ? "Διαγραφή της επιλεγμένης παραγγελίας από το SoftOne;"
        : `Διαγραφή ${count} επιλεγμένων παραγγελιών από το SoftOne;`
    );
    if (!confirmed) return;

    setDeletingSelected(true);

    try {
      const results = await Promise.allSettled(
        selectedVisibleOrders.map((order) =>
          deletePickingListOrder({
            findoc: order.findoc,
            branch: order.branch,
          })
        )
      );
      const deletedFindocs = new Set(
        selectedVisibleOrders.flatMap((order, index) =>
          results[index].status === "fulfilled" ? [order.findoc] : []
        )
      );
      const failedCount = count - deletedFindocs.size;

      if (deletedFindocs.size > 0) {
        setSelectedFindocs((current) => {
          const next = new Set(current);
          deletedFindocs.forEach((findoc) => next.delete(findoc));
          return next;
        });
        setExpandedFindocs((current) => {
          const next = new Set(current);
          deletedFindocs.forEach((findoc) => next.delete(findoc));
          return next;
        });
      }

      if (failedCount > 0) {
        toast.error(
          failedCount === 1
            ? "1 παραγγελία δεν διαγράφηκε."
            : `${failedCount} παραγγελίες δεν διαγράφηκαν.`
        );
      } else {
        toast.success(
          count === 1
            ? "Η επιλεγμένη παραγγελία διαγράφηκε."
            : `Διαγράφηκαν ${count} επιλεγμένες παραγγελίες.`
        );
      }

      await refetch();
    } finally {
      setDeletingSelected(false);
    }
  }, [
    deletePickingListOrder,
    deletingSelected,
    refetch,
    selectedVisibleOrders,
  ]);

  const toggleSelected = useCallback((findoc: string) => {
    setSelectedFindocs((current) => {
      const next = new Set(current);
      if (next.has(findoc)) next.delete(findoc);
      else next.add(findoc);
      return next;
    });
  }, []);

  const toggleDetailPicked = useCallback((detailKey: string) => {
    setPickedDetailKeys((current) => {
      const next = new Set(current);
      if (next.has(detailKey)) next.delete(detailKey);
      else next.add(detailKey);
      return next;
    });
  }, []);

  const toggleAllVisible = useCallback(() => {
    setSelectedFindocs((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        visibleFindocs.forEach((findoc) => next.delete(findoc));
      } else {
        visibleFindocs.forEach((findoc) => next.add(findoc));
      }
      return next;
    });
  }, [allVisibleSelected, visibleFindocs]);

  const toggleAllExpanded = useCallback(() => {
    if (allVisibleExpanded) {
      setExpandedFindocs(new Set());
      return;
    }

    setExpandedFindocs(new Set(visibleFindocs));
  }, [allVisibleExpanded, visibleFindocs]);

  return (
    <>
      <div className="flex min-h-0 flex-col print:hidden md:block">
        <PageBreadcrumb pageTitle="Picking List" />

      <DataTable className="mt-4 flex min-h-0 flex-1 flex-col md:block">
        <DataTableHeader
          title="Picking List"
          description="Παραγγελίες που έχουν αποσταλεί στο SoftOne, ανά κατάστημα και κατάσταση συλλογής."
          count={visibleOrders.length}
          action={
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                <button
                  type="button"
                  onClick={() => void handleDeleteSelectedOrders()}
                  disabled={
                    selectedVisibleCount === 0 ||
                    deletingSelected ||
                    bulkUpdating ||
                    isLoading
                  }
                  title={
                    selectedVisibleCount === 0
                      ? "Επιλέξτε παραγγελίες για διαγραφή."
                      : "Διαγραφή των επιλεγμένων παραγγελιών από το SoftOne"
                  }
                  className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300 sm:w-auto dark:border-red-500/30 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-500/10 dark:disabled:border-gray-700 dark:disabled:text-gray-600"
                >
                  {deletingSelected ? (
                    <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  ) : (
                    <Trash2 aria-hidden="true" className="size-4" />
                  )}
                  Διαγραφή
                  {selectedVisibleCount > 0 ? ` (${selectedVisibleCount})` : ""}
                </button>

                {can("picked-it-up") && (
                <button
                  type="button"
                  onClick={() => void handleCompleteSelectedOrders()}
                  disabled={!canCompleteSelectedOrders || bulkUpdating}
                  title={
                    selectedVisibleCount === 0
                      ? "Επιλέξτε παραγγελίες για ολοκλήρωση."
                      : canCompleteSelectedOrders
                        ? "Σήμανση των επιλεγμένων παραγγελιών ως PICKED IT UP"
                        : "Μία ή περισσότερες επιλεγμένες παραγγελίες δεν είναι ακόμη έτοιμες για ολοκλήρωση."
                  }
                  className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-3 text-xs font-semibold text-white shadow-theme-xs transition hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none sm:w-auto dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
                >
                  {bulkUpdating ? (
                    <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  ) : (
                    <Check aria-hidden="true" className="size-4" />
                  )}
                  PICKED IT UP
                  {selectedVisibleCount > 0 ? ` (${selectedVisibleCount})` : ""}
                </button>
                )}

                <label className="flex h-10 min-w-0 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 sm:w-auto dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                  Status
                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value as PickingStatusFilter);
                      setSelectedFindocs(new Set());
                      setExpandedFindocs(new Set());
                    }}
                    disabled={isLoading}
                    className="min-w-0 flex-1 border-0 bg-transparent text-xs font-semibold text-gray-700 outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[120px] sm:flex-none dark:text-gray-200"
                  >
                    {PICKING_STATUS_FILTERS.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={visibleOrders.length === 0 || isLoading}
                  title="Εκτύπωση ή αποθήκευση του Picking List ως PDF"
                  className="col-span-2 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:border-brand-300 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-1 sm:w-auto dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-brand-500 dark:hover:text-brand-400"
                >
                  <FileText aria-hidden="true" className="size-4" />
                  Εξαγωγή PDF
                </button>
              </div>

              <div className="flex h-10 w-full items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 sm:w-auto dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                Κατάστημα
                {branchOptions.length <= 1 ? (
                  <span
                    className="min-w-0 flex-1 truncate text-xs font-semibold normal-case text-gray-700 sm:min-w-[140px] sm:flex-none dark:text-gray-200"
                    title={formatBranchLabel(activeBranch)}
                  >
                    {formatBranchLabel(activeBranch)}
                  </span>
                ) : (
                  <label className="min-w-0 flex-1 sm:min-w-[140px] sm:flex-none">
                    <span className="sr-only">Επιλογή καταστήματος</span>
                    <select
                      value={activeBranch}
                      onChange={(event) => {
                        const nextBranch = normalizeBranchCode(
                          event.target.value
                        );
                        setSelectedBranch(nextBranch);
                        setSelectedFindocs(new Set());
                        setExpandedFindocs(new Set());

                        if (
                          user &&
                          permissions &&
                          nextBranch &&
                          nextBranch !== currentBranch
                        ) {
                          syncedTopbarBranchRef.current = nextBranch;
                          setAuth(
                            { ...user, mainBranch: nextBranch },
                            permissions
                          );
                        }
                      }}
                      disabled={isLoading}
                      className="w-full border-0 bg-transparent text-xs font-semibold normal-case text-gray-700 outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-200"
                    >
                      {branchOptions.map((branch) => (
                        <option key={branch.code} value={branch.code}>
                          {branch.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <DataTableSearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                onRefresh={handleRefresh}
                isRefreshing={isFetching}
                refreshDisabled={isFetching}
                placeholder="Παραστατικό, πελάτης, κωδικός..."
              />
            </div>
          }
        />

        <OrderTypePicker
          selectedType={orderTypeFilter}
          counts={orderTypeCounts}
          onSelect={handleSelectOrderType}
        />

        {isLoading ? (
          <div className="flex items-center justify-center px-5 py-16 text-gray-500 dark:text-gray-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Φόρτωση Picking List...
          </div>
        ) : visibleOrders.length === 0 ? (
          <DataTableEmptyState
            icon={<ClipboardList className="h-7 w-7" />}
            title="Δεν βρέθηκαν παραγγελίες"
            description="Δεν υπάρχουν παραγγελίες για το επιλεγμένο κατάστημα, status και κριτήριο αναζήτησης."
          />
        ) : (
          <>
          <div className="flex flex-col gap-3 p-3 sm:p-4 xl:gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-950">
              <div className="flex items-center gap-3">
                <DataTableSelectionCheckbox
                  ariaLabel="Επιλογή όλων των ορατών παραγγελιών"
                  checked={allVisibleSelected}
                  indeterminate={someVisibleSelected}
                  onCheckedChange={toggleAllVisible}
                />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {selectedVisibleCount} / {visibleOrders.length} επιλεγμένες
                </span>
              </div>
              <PickingSortControls sort={sort} onSort={handleSort} />
              <button
                type="button"
                onClick={toggleAllExpanded}
                disabled={visibleOrders.length === 0}
                aria-label={
                  allVisibleExpanded
                    ? "Κλείσιμο λεπτομερειών"
                    : "Άνοιγμα λεπτομερειών"
                }
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                {allVisibleExpanded ? (
                  <ListChevronsDownUp className="h-3.5 w-3.5" />
                ) : (
                  <ListChevronsUpDown className="h-3.5 w-3.5" />
                )}
                Είδη
              </button>
            </div>
            {visibleOrders.map((order) => (
              <PickingOrderCard
                key={`${order.findoc}-${order.pickerComment}`}
                order={order}
                activeBranch={activeBranch}
                expanded={expandedFindocs.has(order.findoc)}
                selected={selectedFindocs.has(order.findoc)}
                pickedDetailKeys={pickedDetailKeys}
                updating={updatingFindocs.has(order.findoc)}
                nowMs={nowMs}
                onToggleExpanded={handleToggleExpanded}
                onToggleSelected={toggleSelected}
                onToggleDetailPicked={toggleDetailPicked}
                onSaveComment={handleSaveComment}
                onAdvanceStatus={handleAdvanceStatus}
              />
            ))}
          </div>

          </>
        )}

        {!isLoading && visibleOrders.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-5 py-3 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <span>
              {visibleOrders.length} παραγγελίες · {selectedVisibleCount} επιλεγμένες
            </span>
            <span>{formatBranchLabel(activeBranch)}</span>
          </div>
        )}
      </DataTable>
      </div>
      <PickingListPrintView
        orders={visibleOrders}
        activeBranch={activeBranch}
        pickedDetailKeys={pickedDetailKeys}
        nowMs={nowMs}
      />
    </>
  );
}
