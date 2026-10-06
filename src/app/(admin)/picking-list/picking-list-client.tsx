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
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardList,
  ListChevronsDownUp,
  ListChevronsUpDown,
  Loader2,
} from "@/lib/icons/lucide";
import {
  useFetchPickingListMutation,
  useUpdatePickingListOrderMutation,
} from "@/hooks/queries/useApiMutations";
import { useSessionState } from "@/hooks/useSessionState";
import { useAuthStore } from "@/stores/authStore";
import {
  formatBranchLabel,
  getKnownBranchOptions,
  normalizeBranchCode,
  resolveBranchName,
} from "@/lib/auth/branches";
import { formatDateTimeEl, formatMinutesAgoEl } from "@/lib/utils/date";
import {
  getAutomaticPickingStatus,
  getFirstInteractionStatus,
  getNextPickingStatus,
  groupPickingListRows,
  matchesPickingOrderSearch,
  PICKER_COMMENT_SUGGESTIONS,
  PICKING_STATUSES,
  PICKING_STATUS_FILTERS,
  type PickingListOrder,
  type PickingListUpdatePayload,
  type PickingStatus,
  type PickingStatusFilter,
} from "@/lib/picking-list";

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

type PickingStatusProgressProps = {
  status: PickingStatus;
  updating: boolean;
  onAdvance: () => void;
};

function PickingStatusProgress({
  status,
  updating,
  onAdvance,
}: PickingStatusProgressProps) {
  const currentIndex = PICKING_STATUSES.indexOf(status);
  const nextStatus = getNextPickingStatus(status);

  return (
    <div
      aria-label={`Πρόοδος picking: ${status}`}
      className="flex flex-wrap items-center gap-1.5"
      role="group"
    >
      {PICKING_STATUSES.map((step, index) => {
        const isAchieved = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const isNext = step === nextStatus;
        const isAutomaticTarget = status === "S1" && step === "LOADED";
        const badgeClassName = [
          "inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-full border border-transparent px-2.5 text-[11px] font-semibold ring-1 ring-inset ring-gray-200/70 transition dark:ring-white/10",
          isNext
            ? "cursor-pointer bg-white text-brand-600 shadow-sm hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 disabled:cursor-wait disabled:opacity-60 dark:bg-gray-900 dark:text-brand-300 dark:hover:bg-brand-500/10"
            : step === "S1" && isAchieved
              ? "bg-warning-100 text-warning-800 dark:bg-warning-500/20 dark:text-warning-300"
              : step === "PICKED_IT_UP" && isAchieved
                ? "bg-success-100 text-success-800 dark:bg-success-500/20 dark:text-success-300"
                : (step === "LOADED" || step === "SEEN") && isCurrent
                  ? "bg-blue-light-100 text-blue-light-800 dark:bg-blue-light-500/20 dark:text-blue-light-300"
                  : (step === "LOADED" || step === "SEEN") && isAchieved
                    ? "bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-500/10 dark:text-blue-light-400"
                : isCurrent
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                  : isAchieved
                    ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
                    : "bg-gray-50 text-gray-400 dark:bg-gray-800/60 dark:text-gray-500",
        ].join(" ");
        const statusContent = (
          <>
            {isAchieved ? (
              <Check aria-hidden="true" className="size-3.5" />
            ) : (isNext || isAutomaticTarget) && updating ? (
              <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
            ) : null}
            {step}
            <span className="sr-only">
              {isCurrent
                ? ", τρέχουσα και ολοκληρωμένη"
                : isAchieved
                  ? ", ολοκληρωμένη"
                  : isNext
                    ? ", επόμενο διαθέσιμο βήμα"
                    : ", απομένει"}
            </span>
          </>
        );

        return (
          <Fragment key={step}>
            {index > 0 ? (
              <ArrowRight
                aria-hidden="true"
                className={[
                  "size-3.5 shrink-0",
                  isAchieved
                    ? step === "LOADED" || step === "SEEN"
                      ? "text-blue-light-500"
                      : "text-success-500"
                    : "text-gray-300 dark:text-gray-700",
                ].join(" ")}
              />
            ) : null}
            {isNext ? (
              <button
                type="button"
                className={badgeClassName}
                disabled={updating}
                onClick={onAdvance}
                title={`Μετάβαση σε ${step}`}
              >
                {statusContent}
              </button>
            ) : (
              <span
                aria-current={isCurrent ? "step" : undefined}
                className={badgeClassName}
                title={
                  isCurrent
                    ? "Τρέχουσα κατάσταση — ολοκληρώθηκε"
                    : isAchieved
                      ? "Ολοκληρώθηκε"
                      : isAutomaticTarget
                        ? "Αυτόματη μετάβαση σε LOADED"
                        : "Απομένει"
                }
              >
                {statusContent}
              </span>
            )}
          </Fragment>
        );
      })}
    </div>
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
          <p className="break-words text-sm font-semibold text-gray-900 dark:text-white">
            {order.parastatiko || order.fincode || "—"}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span>FINDOC</span>
            <NumberBadge value={order.findoc} />
          </div>
        </td>

        <td className="px-3 py-3 align-top">
          <p className="break-words text-sm font-medium text-gray-800 dark:text-white/90">
            {order.customerName || "—"}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Κωδικός: {order.customerCode || "—"} · ΑΦΜ: {order.afm || "—"}
          </p>
        </td>

        <td className="px-3 py-3 align-top text-sm text-gray-600 dark:text-gray-300">
          <p className="font-medium text-gray-700 dark:text-gray-200">
            {formatDateTimeEl(order.submittedAt || order.transactionDate)}
          </p>
          {submittedMinutesAgo && (
            <p className="mt-1 text-xs font-medium text-brand-600 dark:text-brand-400">
              {submittedMinutesAgo}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {formatBranchLabel(order.branch)}
          </p>
        </td>

        <td className="px-3 py-3 align-top text-sm text-gray-600 dark:text-gray-300">
          <p className="line-clamp-3 break-words" title={order.comments}>
            {order.comments || "—"}
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
          <div className="min-w-[390px]">
            <PickingStatusProgress
              status={order.status}
              updating={updating}
              onAdvance={() => onAdvanceStatus(order)}
            />
          </div>
        </td>
      </tr>

      {expanded && (
        <tr id={detailsId} className="bg-gray-50/80 dark:bg-gray-950/60">
          <td colSpan={8} className="border-t border-brand-100 px-4 py-4 dark:border-brand-500/20">
            <div className="ml-0 rounded-xl border border-gray-200 bg-white shadow-sm sm:ml-10 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Είδη παραγγελίας
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {order.details.length} {order.details.length === 1 ? "γραμμή" : "γραμμές"}
                  </p>
                </div>
              </div>

              {order.details.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  Δεν υπάρχουν διαθέσιμες γραμμές ειδών.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[900px] w-full divide-y divide-gray-100 dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-950">
                      <tr>
                        <th className="w-[90px] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          Γραμμή
                        </th>
                        <th className="w-[180px] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          Κωδικός
                        </th>
                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          Είδος
                        </th>
                        <th className="w-[90px] px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          Ποσότητα
                        </th>
                        <th className="w-[310px] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          Θέσεις
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {order.details.map((detail, index) => (
                        <tr key={`${detail.lineNumber}-${detail.code}-${index}`}>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {detail.lineNumber || index + 1}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-100">
                            {detail.code || "—"}
                          </td>
                          <td className="break-words px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                            {detail.description || "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-200">
                            <NumberBadge value={detail.quantity || "0"} variant="brand" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {detail.positions.length > 0 ? (
                                detail.positions.map((position, positionIndex) => (
                                  <span
                                    key={`${position}-${positionIndex}`}
                                    className="inline-flex rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                                  >
                                    {position}
                                  </span>
                                ))
                              ) : (
                                <span className="text-sm text-gray-400">—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
  const { mutateAsync: fetchPickingList } = useFetchPickingListMutation();
  const { mutateAsync: updatePickingListOrder } =
    useUpdatePickingListOrderMutation();

  const [orders, setOrders] = useState<PickingListOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<PickingStatusFilter>("ALL");
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
  const [nowMs, setNowMs] = useState(() => Date.now());
  const inFlightFindocs = useRef(new Set<string>());
  const automaticLoadAttemptedFindocs = useRef(new Set<string>());

  const currentBranch = normalizeBranchCode(user?.mainBranch);

  const loadOrders = useCallback(async () => {
    automaticLoadAttemptedFindocs.current.clear();
    setLoading(true);

    try {
      const requestedStatus = statusFilter === "ALL" ? undefined : statusFilter;
      const data = await fetchPickingList(requestedStatus);
      const nextOrders = groupPickingListRows(
        data.rows ?? [],
        requestedStatus ?? "S1"
      );
      const nextFindocs = new Set(nextOrders.map((order) => order.findoc));

      setOrders(nextOrders);
      setSelectedFindocs(
        (current) =>
          new Set(Array.from(current).filter((findoc) => nextFindocs.has(findoc)))
      );
      setExpandedFindocs(
        (current) =>
          new Set(Array.from(current).filter((findoc) => nextFindocs.has(findoc)))
      );
    } catch (error) {
      setOrders([]);
      setSelectedFindocs(new Set());
      setExpandedFindocs(new Set());
      toast.error(
        error instanceof Error
          ? error.message
          : "Αποτυχία φόρτωσης Picking List."
      );
    } finally {
      setLoading(false);
    }
  }, [fetchPickingList, statusFilter]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (selectedBranch) return;

    if (currentBranch) {
      setSelectedBranch(currentBranch);
      return;
    }

    const firstOrderBranch = orders.find((order) => order.branch)?.branch;
    if (firstOrderBranch) {
      setSelectedBranch(firstOrderBranch);
      return;
    }

    if (!loading) {
      setSelectedBranch(getKnownBranchOptions()[0]?.code ?? "");
    }
  }, [currentBranch, loading, orders, selectedBranch]);

  const branchOptions = useMemo(() => {
    const options = new Map<string, string>();
    const addBranch = (value: unknown, label?: string) => {
      const code = normalizeBranchCode(value as string | number | undefined);
      if (!code || options.has(code)) return;
      options.set(code, label || resolveBranchName(code));
    };

    getKnownBranchOptions().forEach((branch) =>
      addBranch(branch.code, branch.label)
    );
    permissions?.branches.forEach((branch) => addBranch(branch));
    orders.forEach((order) => addBranch(order.branch));
    addBranch(currentBranch);

    return Array.from(options, ([code, label]) => ({ code, label }));
  }, [currentBranch, orders, permissions?.branches]);

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
  const selectedVisibleCount = visibleFindocs.filter((findoc) =>
    selectedFindocs.has(findoc)
  ).length;
  const allVisibleSelected =
    visibleFindocs.length > 0 &&
    selectedVisibleCount === visibleFindocs.length;
  const someVisibleSelected =
    selectedVisibleCount > 0 && !allVisibleSelected;
  const allVisibleExpanded =
    visibleFindocs.length > 0 &&
    visibleFindocs.every((findoc) => expandedFindocs.has(findoc));

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

        setOrders((current) =>
          current.map((order) =>
            order.findoc === findoc
              ? {
                  ...order,
                  ...(payload.pickerComment !== undefined
                    ? { pickerComment: payload.pickerComment.trim() }
                    : {}),
                  ...(payload.status ? { status: payload.status } : {}),
                }
              : order
          )
        );

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
    if (loading || !selectedBranch) return;

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
  }, [loading, orders, persistOrderUpdate, selectedBranch]);

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
      if (!status) return;

      void persistOrderUpdate(
        { findoc: order.findoc, status },
        `Η κατάσταση ενημερώθηκε σε ${status}.`
      );
    },
    [persistOrderUpdate]
  );

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
    <div>
      <PageBreadcrumb pageTitle="Picking List" />

      <DataTable className="mt-4">
        <DataTableHeader
          title="Picking List"
          description="Παραγγελίες που έχουν αποσταλεί στο SoftOne, ανά κατάστημα και κατάσταση συλλογής."
          count={visibleOrders.length}
          action={
            <div className="flex w-full flex-wrap items-center gap-2 lg:justify-end">
              <label className="flex h-10 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                Κατάστημα
                <select
                  value={selectedBranch}
                  onChange={(event) => {
                    setSelectedBranch(normalizeBranchCode(event.target.value));
                    setSelectedFindocs(new Set());
                    setExpandedFindocs(new Set());
                  }}
                  disabled={loading}
                  className="min-w-[140px] border-0 bg-transparent text-xs font-semibold text-gray-700 outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-200"
                >
                  {branchOptions.map((branch) => (
                    <option key={branch.code} value={branch.code}>
                      {branch.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex h-10 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                Status
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as PickingStatusFilter);
                    setSelectedFindocs(new Set());
                    setExpandedFindocs(new Set());
                  }}
                  disabled={loading}
                  className="min-w-[120px] border-0 bg-transparent text-xs font-semibold text-gray-700 outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-200"
                >
                  {PICKING_STATUS_FILTERS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>

              <DataTableSearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                onRefresh={() => void loadOrders()}
                isRefreshing={loading}
                refreshDisabled={loading}
                placeholder="Παραστατικό, πελάτης, κωδικός..."
              />
            </div>
          }
        />

        {loading ? (
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
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1700px] table-fixed divide-y divide-gray-100 dark:divide-gray-800">
              <colgroup>
                <col className="w-[48px]" />
                <col className="w-[48px]" />
                <col className="w-[180px]" />
                <col className="w-[270px]" />
                <col className="w-[180px]" />
                <col className="w-[250px]" />
                <col className="w-[280px]" />
                <col className="w-[390px]" />
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
                    Παραστατικό
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                    Πελάτης
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                    Υποβολή / Κατάστημα
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                    Σχόλια παραγγελίας
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
        )}

        {!loading && visibleOrders.length > 0 && (
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
