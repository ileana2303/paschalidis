"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import DataTable from "@/components/ui/data-table/data-table";
import DataTableEmptyState from "@/components/ui/data-table/data-table-empty-state";
import DataTableHeader from "@/components/ui/data-table/data-table-header";
import DataTableSearchBar from "@/components/ui/data-table/data-table-search-bar";
import DataTableSelectionCheckbox from "@/components/ui/data-table/data-table-selection-checkbox";
import NumberBadge from "@/components/ui/data-table/number-badge";
import {
  Check,
  ChevronDown,
  ClipboardList,
  Clock3,
  ListChevronsDownUp,
  ListChevronsUpDown,
  Loader2,
} from "@/lib/icons/lucide";
import {
  usePickingListIntervalNotifications,
  usePickingListQuery,
  useUpdatePickingListOrderMutation,
} from "@/hooks/queries/usePickingListQueries";
import { useSessionState } from "@/hooks/useSessionState";
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
  matchesPickingOrderSearch,
  PICKER_COMMENT_SUGGESTIONS,
  PICKING_STATUS_FILTERS,
  shouldShowRetailCustomerName,
  type PickingListOrder,
  type PickingListUpdatePayload,
  type PickingStatusFilter,
} from "@/lib/picking-list";

const EMPTY_PICKING_ORDERS: PickingListOrder[] = [];

function setsEqual(left: Set<string>, right: Set<string>) {
  if (left.size !== right.size) return false;

  for (const value of left) {
    if (!right.has(value)) return false;
  }

  return true;
}

function pruneFindocSet(current: Set<string>, allowedFindocs: Set<string>) {
  const next = new Set(
    Array.from(current).filter((findoc) => allowedFindocs.has(findoc))
  );

  return setsEqual(current, next) ? current : next;
}

type PickingOrderRowProps = {
  order: PickingListOrder;
  expanded: boolean;
  selected: boolean;
  updating: boolean;
  nowMs: number;
  onToggleExpanded: (order: PickingListOrder, expanded: boolean) => void;
  onToggleSelected: (findoc: string) => void;
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
  const completed = order.status === "PICKED_IT_UP";
  const canComplete = getNextPickingStatus(order.status) === "PICKED_IT_UP";
  const orderLabel = order.parastatiko || order.fincode || order.findoc;

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

function PickingOrderDetailsPanel({ order }: { order: PickingListOrder }) {
  const parastatikoLabel = order.parastatiko || order.fincode;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Είδη παραγγελίας
            {parastatikoLabel ? (
              <span className="ml-2 font-medium text-brand-600 dark:text-brand-400">
                · {parastatikoLabel}
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {order.details.length}{" "}
            {order.details.length === 1 ? "γραμμή" : "γραμμές"}
          </p>
        </div>
      </div>

      {order.details.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Δεν υπάρχουν διαθέσιμες γραμμές ειδών.
        </p>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800 lg:hidden">
          {order.details.map((detail, index) => (
            <div
              key={`${detail.lineNumber}-${detail.code}-${index}-mobile`}
              className="space-y-2 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 flex-1 text-sm font-medium text-gray-900 dark:text-white">
                  {detail.description || "—"}
                </p>
                <NumberBadge value={detail.quantity || "0"} variant="brand" />
              </div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-200">
                {detail.code || "—"}
              </p>
              {detail.positions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {detail.positions.map((position, positionIndex) => (
                    <span
                      key={`${position}-${positionIndex}`}
                      className="inline-block max-w-full break-all rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {position}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {order.details.length > 0 ? (
        <div className="hidden w-full lg:block">
          <table className="w-full table-fixed divide-y divide-gray-100 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-950">
              <tr>
                <th className="w-[90px] px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500 sm:px-4">
                  Ποσότητα
                </th>
                <th className="w-[32%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 sm:px-4">
                  Θέση
                </th>
                <th className="w-[20%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 sm:px-4">
                  Κωδικός
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 sm:px-4">
                  Περιγραφή
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {order.details.map((detail, index) => (
                <tr key={`${detail.lineNumber}-${detail.code}-${index}`}>
                  <td className="px-3 py-3 text-right text-sm text-gray-700 sm:px-4 dark:text-gray-200">
                    <NumberBadge value={detail.quantity || "0"} variant="brand" />
                  </td>
                  <td className="px-3 py-3 sm:px-4">
                    <div className="flex flex-wrap gap-1.5">
                      {detail.positions.length > 0 ? (
                        detail.positions.map((position, positionIndex) => (
                          <span
                            key={`${position}-${positionIndex}`}
                            className="inline-block max-w-full break-all rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                          >
                            {position}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="break-all px-3 py-3 text-sm font-medium text-gray-800 sm:px-4 dark:text-gray-100">
                    {detail.code || "—"}
                  </td>
                  <td className="break-words px-3 py-3 text-sm text-gray-700 sm:px-4 dark:text-gray-200">
                    {detail.description || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

type PickingOrderCardProps = PickingOrderRowProps;

function PickingOrderCard({
  order,
  expanded,
  selected,
  updating,
  nowMs,
  onToggleExpanded,
  onToggleSelected,
  onSaveComment,
  onAdvanceStatus,
}: PickingOrderCardProps) {
  const [draftComment, setDraftComment] = useState(order.pickerComment);
  const hasCommentChange = draftComment.trim() !== order.pickerComment;
  const safeFindoc = order.findoc.replace(/[^a-zA-Z0-9_-]/g, "-");
  const suggestionListId = `picker-comments-mobile-${safeFindoc}`;
  const detailsId = `picking-list-details-mobile-${safeFindoc}`;
  const submittedMinutesAgo = formatMinutesAgoEl(order.submittedAt, nowMs);
  const parastatikoLabel = order.parastatiko || order.fincode;
  const showRetailCustomerName = shouldShowRetailCustomerName(order);
  const displayedComments = formatPickingOrderComments(order.comments);

  return (
    <article
      className={[
        "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/80",
        expanded ? "ring-2 ring-brand-500/20" : "",
      ].join(" ")}
    >
      <div className="flex items-start gap-2">
        <DataTableSelectionCheckbox
          ariaLabel={`Επιλογή παραγγελίας ${parastatikoLabel || order.findoc}`}
          checked={selected}
          onCheckedChange={() => onToggleSelected(order.findoc)}
          disabled={updating}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-base font-semibold text-gray-900 dark:text-white">
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
              aria-label={`${expanded ? "Σύμπτυξη" : "Ανάπτυξη"} ειδών παραγγελίας`}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            >
              <ChevronDown
                strokeWidth={2.25}
                className={`h-5 w-5 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          <div className="mt-3 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
            <ElapsedTimeBadge label={submittedMinutesAgo} />
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
              {formatDateTimeEl(order.submittedAt || order.transactionDate)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatBranchLabel(order.branch)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Πωλητής: {order.submittedBy || "—"}
            </p>
          </div>

          {order.comments ? (
            <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-gray-950 dark:text-gray-300">
              {displayedComments}
            </p>
          ) : null}

          {order.remarks ? (
            <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-950">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Παρατηρήσεις
              </p>
              <p className="mt-1 break-words text-sm text-gray-600 dark:text-gray-300">
                {order.remarks}
              </p>
            </div>
          ) : null}

          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              list={suggestionListId}
              value={draftComment}
              onChange={(event) => setDraftComment(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && hasCommentChange && !updating) {
                  event.preventDefault();
                  onSaveComment(order, draftComment);
                }
              }}
              disabled={updating}
              placeholder="Σχόλιο picker..."
              aria-label={`Σχόλιο picker για ${parastatikoLabel || order.findoc}`}
              className="h-10 min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            />
            <datalist id={suggestionListId}>
              {PICKER_COMMENT_SUGGESTIONS.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
            <button
              type="button"
              onClick={() => onSaveComment(order, draftComment)}
              disabled={!hasCommentChange || updating}
              title="Αποθήκευση σχολίου"
              aria-label={`Αποθήκευση σχολίου για ${parastatikoLabel || order.findoc}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-200 bg-brand-50 text-brand-600 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-300 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300"
            >
              {updating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="mt-3">
            <PickingCompletionButton
              order={order}
              updating={updating}
              onComplete={() => onAdvanceStatus(order)}
            />
          </div>
        </div>
      </div>

      {expanded ? (
        <div id={detailsId} className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
          <PickingOrderDetailsPanel order={order} />
        </div>
      ) : null}
    </article>
  );
}

function PickingOrderRow({
  order,
  expanded,
  selected,
  updating,
  nowMs,
  onToggleExpanded,
  onToggleSelected,
  onSaveComment,
  onAdvanceStatus,
}: PickingOrderRowProps) {
  const [draftComment, setDraftComment] = useState(order.pickerComment);
  const hasCommentChange = draftComment.trim() !== order.pickerComment;
  const safeFindoc = order.findoc.replace(/[^a-zA-Z0-9_-]/g, "-");
  const suggestionListId = `picker-comments-${safeFindoc}`;
  const detailsId = `picking-list-details-${safeFindoc}`;
  const submittedMinutesAgo = formatMinutesAgoEl(order.submittedAt, nowMs);
  const showRetailCustomerName = shouldShowRetailCustomerName(order);
  const displayedComments = formatPickingOrderComments(order.comments);

  return (
    <Fragment>
      <tr
        className={[
          "transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04]",
          expanded ? "bg-brand-25/60 dark:bg-brand-500/[0.04]" : "",
        ].join(" ")}
      >
        <td className="px-3 py-3 align-top">
          <DataTableSelectionCheckbox
            ariaLabel={`Επιλογή παραγγελίας ${order.parastatiko || order.findoc}`}
            checked={selected}
            onCheckedChange={() => onToggleSelected(order.findoc)}
            disabled={updating}
          />
        </td>

        <td className="px-2 py-3 align-top">
          <button
            type="button"
            onClick={() => onToggleExpanded(order, !expanded)}
            aria-expanded={expanded}
            aria-controls={detailsId}
            aria-label={`${expanded ? "Σύμπτυξη" : "Ανάπτυξη"} παραγγελίας ${order.parastatiko || order.findoc}`}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <ChevronDown
              strokeWidth={2.25}
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        </td>

        <td className="px-3 py-3 align-top">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="break-words text-sm font-medium text-gray-800 dark:text-white/90">
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
        </td>

        <td className="px-3 py-3 align-top text-sm text-gray-600 dark:text-gray-300">
          <ElapsedTimeBadge label={submittedMinutesAgo} />
          <p className="mt-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
            {formatDateTimeEl(order.submittedAt || order.transactionDate)}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {formatBranchLabel(order.branch)}
          </p>
        </td>

        <td className="px-3 py-3 align-top text-sm text-gray-600 dark:text-gray-300">
          <p className="break-words font-medium text-gray-700 dark:text-gray-200">
            {order.submittedBy || "—"}
          </p>
        </td>

        <td className="px-3 py-3 align-top text-sm text-gray-600 dark:text-gray-300">
          <p className="line-clamp-3 break-words" title={displayedComments}>
            {displayedComments || "—"}
          </p>
        </td>

        <td className="px-3 py-3 align-top text-sm text-gray-600 dark:text-gray-300">
          <p className="line-clamp-3 break-words" title={order.remarks}>
            {order.remarks || "—"}
          </p>
        </td>

        <td className="px-3 py-3 align-top">
          <div className="flex min-w-[230px] items-center gap-2">
            <input
              type="text"
              list={suggestionListId}
              value={draftComment}
              onChange={(event) => setDraftComment(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && hasCommentChange && !updating) {
                  event.preventDefault();
                  onSaveComment(order, draftComment);
                }
              }}
              disabled={updating}
              placeholder="Σχόλιο picker..."
              aria-label={`Σχόλιο picker για ${order.parastatiko || order.findoc}`}
              className="h-9 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-2.5 text-sm text-gray-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            />
            <datalist id={suggestionListId}>
              {PICKER_COMMENT_SUGGESTIONS.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
            <button
              type="button"
              onClick={() => onSaveComment(order, draftComment)}
              disabled={!hasCommentChange || updating}
              title="Αποθήκευση σχολίου"
              aria-label={`Αποθήκευση σχολίου για ${order.parastatiko || order.findoc}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-600 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-300 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300 dark:disabled:border-gray-700 dark:disabled:bg-gray-800 dark:disabled:text-gray-600"
            >
              {updating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </button>
          </div>
        </td>

        <td className="px-3 py-3 align-top">
          <div className="min-w-[170px]">
            <PickingCompletionButton
              order={order}
              updating={updating}
              onComplete={() => onAdvanceStatus(order)}
            />
          </div>
        </td>
      </tr>

      {expanded && (
        <tr id={detailsId} className="bg-gray-50/80 dark:bg-gray-950/60">
          <td colSpan={9} className="border-t border-brand-100 px-4 py-4 dark:border-brand-500/20">
            <div className="ml-0 sm:ml-10">
              <PickingOrderDetailsPanel order={order} />
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}

export default function PickingListClient() {
  const user = useAuthStore((state) => state.user);
  const permissions = useAuthStore((state) => state.permissions);
  const setAuth = useAuthStore((state) => state.setAuth);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<PickingStatusFilter>("ALL");
  const { data, isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = usePickingListQuery(statusFilter);
  const orders = data ?? EMPTY_PICKING_ORDERS;
  const { mutateAsync: updatePickingListOrder } =
    useUpdatePickingListOrderMutation(statusFilter);
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
  const [updatingFindocs, setUpdatingFindocs] = useState<Set<string>>(
    new Set()
  );
  const [bulkUpdating, setBulkUpdating] = useState(false);
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

  useEffect(() => {
    automaticLoadAttemptedFindocs.current.clear();
  }, [statusFilter]);

  useEffect(() => {
    if (!isError || !error) return;

    toast.error(
      error instanceof Error ? error.message : "Αποτυχία φόρτωσης Picking List."
    );
  }, [error, isError]);

  const orderFindocsKey = useMemo(
    () => orders.map((order) => order.findoc).join("\u0000"),
    [orders]
  );

  useEffect(() => {
    const allowedFindocs = new Set(
      orderFindocsKey ? orderFindocsKey.split("\u0000") : []
    );

    setSelectedFindocs((current) => pruneFindocSet(current, allowedFindocs));
    setExpandedFindocs((current) => pruneFindocSet(current, allowedFindocs));
  }, [orderFindocsKey]);

  usePickingListIntervalNotifications({
    branch: selectedBranch,
    enabled: !isLoading && Boolean(selectedBranch),
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

  const branchOptions = useMemo(
    () => getUserBranchOptions(user, permissions),
    [permissions, user]
  );

  useEffect(() => {
    if (branchOptions.length === 0) return;

    const validCodes = new Set(branchOptions.map((branch) => branch.code));
    if (selectedBranch && validCodes.has(selectedBranch)) return;

    const nextBranch =
      currentBranch && validCodes.has(currentBranch)
        ? currentBranch
        : branchOptions[0].code;

    setSelectedBranch(nextBranch);
  }, [branchOptions, currentBranch, selectedBranch]);

  const visibleOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.branch === selectedBranch &&
          (statusFilter === "ALL" || order.status === statusFilter) &&
          matchesPickingOrderSearch(order, searchTerm)
      ),
    [orders, searchTerm, selectedBranch, statusFilter]
  );

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
        toast.error(
          error instanceof Error
            ? error.message
            : "Αποτυχία ενημέρωσης Picking List."
        );
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

      void persistOrderUpdate({ findoc: order.findoc, status }, false);
    },
    [persistOrderUpdate]
  );

  useEffect(() => {
    if (isLoading || !selectedBranch) return;

    const ordersToLoad = orders.flatMap((order) => {
      const status = getAutomaticPickingStatus(order.status);

      if (
        order.branch !== selectedBranch ||
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
            status,
          },
          false
        )
      )
    );
  }, [isLoading, orders, persistOrderUpdate, selectedBranch]);

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
          { findoc: order.findoc, status },
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
            { findoc: order.findoc, status: "PICKED_IT_UP" },
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

  const toggleSelected = useCallback((findoc: string) => {
    setSelectedFindocs((current) => {
      const next = new Set(current);
      if (next.has(findoc)) next.delete(findoc);
      else next.add(findoc);
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
    <div className="flex min-h-0 flex-col md:block">
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
              </div>

              <div className="flex h-10 w-full items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 sm:w-auto dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                Κατάστημα
                {branchOptions.length <= 1 ? (
                  <span
                    className="min-w-0 flex-1 truncate text-xs font-semibold normal-case text-gray-700 sm:min-w-[140px] sm:flex-none dark:text-gray-200"
                    title={formatBranchLabel(selectedBranch)}
                  >
                    {formatBranchLabel(selectedBranch)}
                  </span>
                ) : (
                  <label className="min-w-0 flex-1 sm:min-w-[140px] sm:flex-none">
                    <span className="sr-only">Επιλογή καταστήματος</span>
                    <select
                      value={selectedBranch}
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
          <div className="flex flex-col gap-3 p-4 lg:hidden">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-950">
              <DataTableSelectionCheckbox
                ariaLabel="Επιλογή όλων των ορατών παραγγελιών"
                checked={allVisibleSelected}
                indeterminate={someVisibleSelected}
                onCheckedChange={toggleAllVisible}
              />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {selectedVisibleCount} / {visibleOrders.length} επιλεγμένες
              </span>
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
                key={`mobile-${order.findoc}-${order.pickerComment}`}
                order={order}
                expanded={expandedFindocs.has(order.findoc)}
                selected={selectedFindocs.has(order.findoc)}
                updating={updatingFindocs.has(order.findoc)}
                nowMs={nowMs}
                onToggleExpanded={handleToggleExpanded}
                onToggleSelected={toggleSelected}
                onSaveComment={handleSaveComment}
                onAdvanceStatus={handleAdvanceStatus}
              />
            ))}
          </div>

          <div className="hidden w-full overflow-x-auto lg:block">
            <table className="w-full min-w-[1730px] table-fixed divide-y divide-gray-100 dark:divide-gray-800">
              <colgroup>
                <col className="w-[48px]" />
                <col className="w-[48px]" />
                <col className="w-[270px]" />
                <col className="w-[180px]" />
                <col className="w-[190px]" />
                <col className="w-[250px]" />
                <col className="w-[220px]" />
                <col className="w-[280px]" />
                <col className="w-[190px]" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-950">
                <tr>
                  <th className="px-3 py-3 text-left">
                    <DataTableSelectionCheckbox
                      ariaLabel="Επιλογή όλων των ορατών παραγγελιών"
                      checked={allVisibleSelected}
                      indeterminate={someVisibleSelected}
                      onCheckedChange={toggleAllVisible}
                    />
                  </th>
                  <th className="w-14 px-2 py-3 text-center">
                    <button
                      type="button"
                      onClick={toggleAllExpanded}
                      disabled={visibleOrders.length === 0}
                      aria-label={
                        allVisibleExpanded
                          ? "Κλείσιμο λεπτομερειών"
                          : "Άνοιγμα λεπτομερειών"
                      }
                      title={
                        allVisibleExpanded
                          ? "Κλείσιμο λεπτομερειών"
                          : "Άνοιγμα λεπτομερειών"
                      }
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:border-brand-500 dark:hover:text-brand-400"
                    >
                      {allVisibleExpanded ? (
                        <ListChevronsDownUp className="h-4 w-4" />
                      ) : (
                        <ListChevronsUpDown className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                    Πελάτης
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                    Υποβολή / Κατάστημα
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                    Πωλητής
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                    Τύπος παραγγελίας
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                    Παρατηρήσεις
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                    Σχόλιο picker
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                    Κατάσταση
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {visibleOrders.map((order) => (
                  <PickingOrderRow
                    key={`${order.findoc}-${order.pickerComment}`}
                    order={order}
                    expanded={expandedFindocs.has(order.findoc)}
                    selected={selectedFindocs.has(order.findoc)}
                    updating={updatingFindocs.has(order.findoc)}
                    nowMs={nowMs}
                    onToggleExpanded={handleToggleExpanded}
                    onToggleSelected={toggleSelected}
                    onSaveComment={handleSaveComment}
                    onAdvanceStatus={handleAdvanceStatus}
                  />
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}

        {!isLoading && visibleOrders.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-5 py-3 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <span>
              {visibleOrders.length} παραγγελίες · {selectedVisibleCount} επιλεγμένες
            </span>
            <span>{formatBranchLabel(selectedBranch)}</span>
          </div>
        )}
      </DataTable>
    </div>
  );
}
