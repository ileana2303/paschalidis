"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import CompanyStockOrderSummary, {
  type CompanyStockBasketLine,
} from "@/components/stock/company-stock-order-summary";
import DataTable from "@/components/ui/data-table/data-table";
import DataTableEmptyState from "@/components/ui/data-table/data-table-empty-state";
import DataTableHeader from "@/components/ui/data-table/data-table-header";
import DataTableSearchBar from "@/components/ui/data-table/data-table-search-bar";
import NumberBadge from "@/components/ui/data-table/number-badge";
import QuantityControl from "@/components/ui/quantity-control";
import {
  useFetchCompanyStockMutation,
  useRequestStockQuantityMutation,
} from "@/hooks/queries/useApiMutations";
import { useSessionState } from "@/hooks/useSessionState";
import type { ICompanyStockRow } from "@/lib/interface";
import {
  AlertCircle,
  Loader2,
  Package,
  RefreshCw,
  ShoppingCart,
} from "@/lib/icons/lucide";
import {
  formatBranchLabel,
  normalizeBranchCode,
  resolveBranchName,
} from "@/lib/auth/branches";
import {
  formatNumber,
  toNumber,
} from "@/lib/utils/stock-feedback";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";

const DAY_OPTIONS = [1, 3, 7, 10] as const;
const SALES_HISTORY_FIELDS = ["CY", "CY_1", "CY_2", "CY_3", "CY_4"] as const;
const AVAILABILITY_FIELDS = [
  { key: "YP1000", branch: "1000" },
  { key: "YP1006", branch: "1006" },
  { key: "YP1007", branch: "1007" },
] as const;

function formatDaysLabel(days: number) {
  return days === 1 ? "1 ημέρα" : `${days} ημέρες`;
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="grid grid-cols-12 gap-4 px-5 py-4">
          <div className="col-span-3 h-12 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="col-span-1 h-12 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="col-span-3 h-12 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="col-span-1 h-12 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="col-span-2 h-12 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="col-span-2 h-12 rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      ))}
    </div>
  );
}

export default function CompanyStockClient() {
  const user = useAuthStore((state) => state.user);
  const { mutateAsync: fetchCompanyStock } = useFetchCompanyStockMutation();
  const { mutateAsync: requestStockQuantity } =
    useRequestStockQuantityMutation();
  const currentBranchCode = useMemo(
    () => normalizeBranchCode(user?.mainBranch),
    [user?.mainBranch]
  );
  const currentBranchLabel = useMemo(
    () => formatBranchLabel(currentBranchCode),
    [currentBranchCode]
  );
  const [days, setDays] = useState<number>(1);
  const [rows, setRows] = useState<ICompanyStockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useSessionState("company-stock-search", "");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [basketLines, setBasketLines] = useState<CompanyStockBasketLine[]>([]);
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [addingItems, setAddingItems] = useState<Set<string>>(
    new Set()
  );
  const loadRequestId = useRef(0);
  const currentYear = new Date().getFullYear();

  const loadRows = useCallback(async () => {
    const requestId = ++loadRequestId.current;

    try {
      const data = await fetchCompanyStock({ days });

      if (requestId !== loadRequestId.current) {
        return;
      }

      setRows(
        [...(data.rows ?? [])].sort(
          (first, second) => toNumber(second.QTY_SOLD) - toNumber(first.QTY_SOLD)
        )
      );
    } catch (loadError) {
      if (requestId !== loadRequestId.current) {
        return;
      }

      setRows([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Αποτυχία φόρτωσης κεντρικού αποθέματος."
      );
    } finally {
      if (requestId === loadRequestId.current) {
        setLoading(false);
      }
    }
  }, [days, fetchCompanyStock]);

  useEffect(() => {
    // Remote data is intentionally synchronized when the selected period changes.
    // State updates inside loadRows occur only after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRows();
  }, [loadRows]);

  const refreshRows = useCallback(() => {
    setLoading(true);
    setError("");
    void loadRows();
  }, [loadRows]);

  const handleDaysChange = useCallback((nextDays: number) => {
    setLoading(true);
    setError("");
    setDays(nextDays);
  }, []);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("el-GR");

    if (!query) {
      return rows;
    }

    return rows.filter((row) =>
      [row.CODE, row.NAME, row.CODE1, row.CODE2]
        .map((value) => String(value ?? ""))
        .join(" ")
        .toLocaleLowerCase("el-GR")
        .includes(query)
    );
  }, [rows, searchTerm]);

  const setQuantity = useCallback((itemKey: string, nextQuantity: number) => {
    setQuantities((current) => ({
      ...current,
      [itemKey]: Number.isFinite(nextQuantity)
        ? Math.max(0, Math.floor(nextQuantity))
        : 0,
    }));
  }, []);

  const handleAddToCompanyBasket = useCallback(
    async (row: ICompanyStockRow) => {
      const itemKey = String(row.MTRL);
      const quantity = quantities[itemKey] ?? 0;
      const normalizedMtrl = Number(row.MTRL);

      if (!currentBranchCode) {
        setAddErrors((current) => ({
          ...current,
          [itemKey]: "Δεν βρέθηκε ενεργό κατάστημα χρήστη.",
        }));
        return;
      }

      if (!Number.isFinite(normalizedMtrl) || normalizedMtrl <= 0) {
        setAddErrors((current) => ({
          ...current,
          [itemKey]: "Μη έγκυρο MTRL για προσθήκη στο καλάθι.",
        }));
        return;
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        setAddErrors((current) => ({
          ...current,
          [itemKey]: "Η ποσότητα πρέπει να είναι μεγαλύτερη από 0.",
        }));
        return;
      }

      setAddingItems((current) => new Set(current).add(itemKey));
      setAddErrors((current) => ({ ...current, [itemKey]: "" }));

      try {
        const result = await requestStockQuantity({
          mtrl: normalizedMtrl,
          qty: quantity,
          branch: currentBranchCode,
          origin: "PASCHALIDIS",
        });

        const basketId = String(result.rows?.[0]?.NEW_ID ?? "").trim();
        setBasketLines((current) => [
          ...current,
          {
            id: `${basketId || itemKey}-${Date.now()}`,
            basketId,
            mtrl: itemKey,
            code: row.CODE,
            name: row.NAME,
            quantity,
          },
        ]);
        setQuantity(itemKey, 0);
        toast.success(
          `Προστέθηκαν ${quantity} τεμ. του είδους ${row.CODE} στο καλάθι.`
        );
      } catch (submitError) {
        const message =
          submitError instanceof Error
            ? submitError.message
            : "Αποτυχία προσθήκης στο καλάθι ανατροφοδοσίας εταιρίας.";
        setAddErrors((current) => ({
          ...current,
          [itemKey]: message,
        }));
        toast.error(message);
      } finally {
        setAddingItems((current) => {
          const next = new Set(current);
          next.delete(itemKey);
          return next;
        });
      }
    },
    [currentBranchCode, quantities, requestStockQuantity, setQuantity]
  );

  return (
    <div className="w-full max-w-none space-y-6">
      <PageBreadcrumb pageTitle="Κεντρική Διαχείριση Αποθέματος" />

      {error && (
        <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Δεν ήταν δυνατή η φόρτωση δεδομένων</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="flex min-w-0 max-w-full flex-col gap-5 xl:flex-row">
        <DataTable className="flex h-[calc(100dvh-8rem)] min-h-[28rem] min-w-0 max-w-full shrink-0 flex-col xl:flex-1 xl:basis-3/4 xl:shrink">
        <DataTableHeader
          className="shrink-0"
          title="Πωλήσεις και Κεντρικό Απόθεμα"
          description={`${filteredRows.length} από ${rows.length} είδη · Τελευταίες ${formatDaysLabel(days)}`}
          action={(
            <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
              <label className="flex h-10 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                Περίοδος:
                <select
                  value={days}
                  onChange={(event) =>
                    handleDaysChange(Number(event.target.value))
                  }
                  disabled={loading}
                  aria-label="Ημέρες δεδομένων πωλήσεων"
                  className="min-w-[110px] border-0 bg-transparent text-xs font-semibold text-gray-700 outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-200"
                >
                  {DAY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatDaysLabel(option)}
                    </option>
                  ))}
                </select>
              </label>

              <DataTableSearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                onRefresh={refreshRows}
                isRefreshing={loading}
                refreshDisabled={loading}
                placeholder="Αναζήτηση CODE, NAME, CODE1 ή CODE2..."
              />
            </div>
          )}
        />

        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <DataTableEmptyState
            icon={<AlertCircle className="h-7 w-7" />}
            title="Αποτυχία φόρτωσης δεδομένων"
            description={error}
            action={(
              <button
                type="button"
                onClick={refreshRows}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-brand-500 px-4 text-xs font-semibold text-white transition hover:bg-brand-600"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Νέα προσπάθεια
              </button>
            )}
          />
        ) : filteredRows.length === 0 ? (
          <DataTableEmptyState
            icon={<Package className="h-7 w-7" />}
            title="Δεν βρέθηκαν είδη"
            description="Δεν υπάρχουν δεδομένα για την επιλεγμένη περίοδο ή η αναζήτηση δεν επέστρεψε αποτελέσματα."
          />
        ) : (
          <div className="min-h-0 w-full flex-1 overflow-auto">
            <table className="w-full min-w-[1540px] table-fixed divide-y divide-gray-100 text-sm dark:divide-gray-800">
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[8%]" />
                <col className="w-[25%]" />
                <col className="w-[8%]" />
                <col className="w-[20%]" />
                <col className="w-[15%]" />
              </colgroup>

              <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-950">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Είδος
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    QTY_SOLD
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Ιστορικό πωλήσεων
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    ONGOING
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Διαθεσιμότητα
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Προσθήκη
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredRows.map((row, index) => {
                  const itemKey = String(row.MTRL || row.CODE || index);
                  const quantity = quantities[itemKey] ?? 0;
                  const totalAvailable = toNumber(row.TOTAL_AVAIL);
                  const addError = addErrors[itemKey] ?? "";
                  const isAddingItem = addingItems.has(itemKey);

                  return (
                    <tr
                      key={`${itemKey}-${row.CODE}-${index}`}
                      className="transition hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                    >
                      <td className="px-5 py-4 align-top">
                        <p className="break-words font-medium leading-5 text-gray-900 dark:text-white">
                          {row.NAME || "—"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          CODE: <span className="font-medium text-gray-700 dark:text-gray-300">{row.CODE || "—"}</span>
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
                          <span>CODE1: <strong className="font-medium text-gray-700 dark:text-gray-300">{row.CODE1 || "—"}</strong></span>
                          <span>CODE2: <strong className="font-medium text-gray-700 dark:text-gray-300">{row.CODE2 || "—"}</strong></span>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right align-top tabular-nums font-semibold text-gray-900 dark:text-white">
                        {formatNumber(row.QTY_SOLD)}
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="grid grid-cols-5 gap-1.5">
                          {SALES_HISTORY_FIELDS.map((field, historyIndex) => (
                            <div
                              key={field}
                              className="rounded-lg bg-gray-50 px-2 py-1.5 text-center dark:bg-gray-800/70"
                              title={`${field}: ${currentYear - historyIndex}`}
                            >
                              <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                                {field} · {currentYear - historyIndex}
                              </p>
                              <p className="mt-0.5 font-semibold tabular-nums text-gray-800 dark:text-gray-100">
                                {formatNumber(row[field])}
                              </p>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right align-top tabular-nums text-gray-700 dark:text-gray-200">
                        {formatNumber(row.ONGOING)}
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="grid grid-cols-4 gap-1.5">
                          {AVAILABILITY_FIELDS.map(({ key, branch }) => (
                            <div
                              key={key}
                              className="rounded-lg bg-gray-50 px-2 py-1.5 text-center dark:bg-gray-800/70"
                              title={`${key} · ${resolveBranchName(branch)}`}
                            >
                              <p className="truncate text-[10px] font-medium text-gray-400 dark:text-gray-500">
                                {key}
                              </p>
                              <p className="mt-0.5 font-semibold tabular-nums text-gray-800 dark:text-gray-100">
                                {formatNumber(row[key])}
                              </p>
                            </div>
                          ))}
                          <div className="flex flex-col items-center rounded-lg bg-brand-50 px-2 py-1.5 text-center dark:bg-brand-500/10">
                            <p className="text-[10px] font-medium text-brand-500 dark:text-brand-300">
                              TOTAL
                            </p>
                            <NumberBadge
                              value={formatNumber(totalAvailable)}
                              variant={totalAvailable > 0 ? "success" : "danger"}
                              className="mt-0.5 min-w-0 px-2 py-0.5"
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center justify-end gap-2">
                            <QuantityControl
                              value={quantity}
                              onChange={(nextQuantity) => {
                                setQuantity(itemKey, nextQuantity);
                                setAddErrors((current) => ({
                                  ...current,
                                  [itemKey]: "",
                                }));
                              }}
                              min={0}
                              size="sm"
                              disabled={isAddingItem}
                              displayZeroAsEmpty
                              placeholder="0"
                              inputLabel={`Ποσότητα για ${row.CODE}`}
                              decrementLabel={`Μείωση ποσότητας για ${row.CODE}`}
                              incrementLabel={`Αύξηση ποσότητας για ${row.CODE}`}
                            />
                            <button
                              type="button"
                              onClick={() => void handleAddToCompanyBasket(row)}
                              disabled={
                                isAddingItem ||
                                quantity <= 0 ||
                                !currentBranchCode
                              }
                              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-800/70 dark:disabled:text-gray-500"
                            >
                              {isAddingItem ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <ShoppingCart className="h-3.5 w-3.5" />
                              )}
                              <span>Προσθήκη</span>
                            </button>
                          </div>

                          {addError && (
                            <p className="max-w-[220px] text-right text-[11px] font-medium leading-4 text-red-500">
                              {addError}
                            </p>
                          )}
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
        <CompanyStockOrderSummary
          branchLabel={currentBranchLabel}
          lines={basketLines}
        />
      </div>
    </div>
  );
}
