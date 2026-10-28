"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import CompanyStockOrderSummary, {
  type CompanyStockBasketLine,
} from "@/components/stock/company-stock-order-summary";
import ItemForensicsDrawer from "@/components/stock/item-forensics-drawer";
import SuggestedSupplierCell, {
  type CompanyStockSuggestedSupplier,
} from "@/components/stock/suggested-supplier-cell";
import DataTable from "@/components/ui/data-table/data-table";
import DataTableEmptyState from "@/components/ui/data-table/data-table-empty-state";
import DataTableHeader from "@/components/ui/data-table/data-table-header";
import DataTableSearchBar from "@/components/ui/data-table/data-table-search-bar";
import NumberBadge from "@/components/ui/data-table/number-badge";
import ItemCodeBadge from "@/components/ui/item-code-badge";
import QuantityControl from "@/components/ui/quantity-control";
import {
  useFetchCompanyStockMutation,
  useFetchStockRequestsMutation,
  useRequestStockQuantityMutation,
  useSearchItemsMutation,
  useSubmitSupplierBasketOrderMutation,
} from "@/hooks/queries/useApiMutations";
import { useSessionState } from "@/hooks/useSessionState";
import type {
  ICompanyStockRow,
  IItem,
  IStockRequestListRow,
} from "@/lib/interface";
import {
  AlertCircle,
  ChartColumn,
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

function salesHistorySimField(
  field: (typeof SALES_HISTORY_FIELDS)[number]
): keyof ICompanyStockRow {
  return field === "CY" ? "SIM_CY" : (`SIM_${field}` as keyof ICompanyStockRow);
}
const AVAILABILITY_FIELDS = [
  { key: "YP1000", branch: "1000" },
  { key: "YP1006", branch: "1006" },
  { key: "YP1007", branch: "1007" },
] as const;

function itemSearchResultToCompanyStockRow(item: IItem): ICompanyStockRow {
  return {
    MTRL: item.MTRL,
    CODE: item.ITEM_CODE,
    NAME: item.ITEM_DESCR,
    CODE1: item.CODE1_0,
    CODE2: item.ITEM_CODE2,
    CCCSUFIX: item.SUFIX,
    ZGROUP_CODE: item.ZGROUP_CODE,
    ZB2B_CODE: item.ZB2B_CODE,
    SUGGESTED_TRDR: item.SUGGESTED_TRDR,
    SUGGESTED_TRDR_CODE: item.SUGGESTED_TRDR_CODE,
    SUGGESTED_TRDR_NAME: item.SUGGESTED_TRDR_NAME,
    QTY_SOLD: "0",
    CY: "0",
    CY_1: "0",
    CY_2: "0",
    CY_3: "0",
    CY_4: "0",
    ONGOING: item.ONGOING,
    YP1000: item.YP1000,
    YP1006: item.YP1006,
    YP1007: item.YP1007,
    TOTAL_AVAIL: item.TOTAL_AVAIL,
    SIM_ITEMS: "",
    SIM_QTY_SOLD: "0",
    SIM_CY: "0",
    SIM_CY_1: "0",
    SIM_CY_2: "0",
    SIM_CY_3: "0",
    SIM_CY_4: "0",
    SIM_AVAIL: "0",
    SIM_GROUP_ITEMS_SOLD: "0",
    SHARE_SIM_CY: "0",
    G_ITEMS: "",
    G_ITEMS_SOLD: "0",
    G_QTY_SOLD: "0",
    G_CY: "0",
    G_CY_1: "0",
    G_CY_2: "0",
    G_CY_3: "0",
    G_CY_4: "0",
    G_AVAIL: "0",
    SHARE_GROUP_IN_SIM: "0",
    B_ITEMS: "",
    B_ITEMS_SOLD: "0",
    B_QTY_SOLD: "0",
    B_CY: "0",
    B_CY_1: "0",
    B_CY_2: "0",
    B_CY_3: "0",
    B_CY_4: "0",
    B_AVAIL: "0",
    SHARE_B2B_IN_SIM: "0",
  };
}

function formatDaysLabel(days: number) {
  return days === 1 ? "1 ημέρα" : `${days} ημέρες`;
}

function getSuggestedSupplier(
  row: ICompanyStockRow
): CompanyStockSuggestedSupplier {
  return {
    trdr: String(row.SUGGESTED_TRDR ?? "").trim(),
    code: String(row.SUGGESTED_TRDR_CODE ?? "").trim(),
    name: String(row.SUGGESTED_TRDR_NAME ?? "").trim(),
  };
}

function getLocalIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getSupplierBasketQuantity(row: IStockRequestListRow) {
  const requestedQuantity = Number(row.QTY_REQUESTED);

  if (Number.isFinite(requestedQuantity) && requestedQuantity > 0) {
    return requestedQuantity;
  }

  const quantity = Number(row.QTY);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
}

function toCompanyStockBasketLines(
  rows: IStockRequestListRow[]
): CompanyStockBasketLine[] {
  return rows.map((row) => ({
    id: row.BASKETID,
    basketId: row.BASKETID,
    mtrl: row.MTRL,
    code: row.ITEM_CODE,
    name: row.ITEM_NAME,
    quantity: getSupplierBasketQuantity(row),
    supplierName: row.TRDR_NAME,
    supplierTrdr: row.TRDR,
    supplierCode: row.TRDR_CODE,
  }));
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="grid grid-cols-12 gap-4 px-5 py-4">
          <div className="col-span-2 h-12 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="col-span-1 h-12 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="col-span-2 h-12 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="col-span-1 h-12 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="col-span-2 h-12 rounded bg-gray-100 dark:bg-gray-800" />
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
  const { mutateAsync: fetchStockRequests } = useFetchStockRequestsMutation();
  const { mutateAsync: requestStockQuantity } =
    useRequestStockQuantityMutation();
  const { mutateAsync: searchItems, isPending: searchingItems } =
    useSearchItemsMutation();
  const { mutateAsync: submitSupplierBasketOrder } =
    useSubmitSupplierBasketOrderMutation();
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
  const [itemSearchRows, setItemSearchRows] = useState<ICompanyStockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useSessionState("company-stock-search", "");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [supplierBasketRows, setSupplierBasketRows] = useState<
    IStockRequestListRow[]
  >([]);
  const [supplierBasketsLoading, setSupplierBasketsLoading] = useState(true);
  const [supplierBasketsError, setSupplierBasketsError] = useState("");
  const [submittingSupplierTrdr, setSubmittingSupplierTrdr] = useState<
    string | null
  >(null);
  const [selectedSupplierBasketTrdr, setSelectedSupplierBasketTrdr] = useState<
    string | null
  >(null);
  const [supplierOverrides, setSupplierOverrides] = useState<
    Record<string, CompanyStockSuggestedSupplier>
  >({});
  const [summaryVisible, setSummaryVisible] = useState(true);
  const [selectedForensicsItem, setSelectedForensicsItem] =
    useState<ICompanyStockRow | null>(null);
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [addingItems, setAddingItems] = useState<Set<string>>(
    new Set()
  );
  const loadRequestId = useRef(0);
  const supplierBasketLoadRequestId = useRef(0);
  const itemSearchRequestId = useRef(0);
  const currentYear = new Date().getFullYear();
  const basketLines = useMemo(
    () => toCompanyStockBasketLines(supplierBasketRows),
    [supplierBasketRows]
  );

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
      setSupplierOverrides({});
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

  const loadSupplierBaskets = useCallback(async () => {
    const requestId = ++supplierBasketLoadRequestId.current;

    if (!currentBranchCode) {
      setSupplierBasketRows([]);
      setSelectedSupplierBasketTrdr(null);
      setSupplierBasketsError("");
      setSupplierBasketsLoading(false);
      return;
    }

    setSupplierBasketsLoading(true);
    setSupplierBasketsError("");

    try {
      const data = await fetchStockRequests({
        branch: currentBranchCode,
        origin: "PASCHALIDIS",
      });

      if (requestId !== supplierBasketLoadRequestId.current) {
        return;
      }

      const nextRows = [...(data.rows ?? [])].sort((first, second) =>
        second.INS_DATE.localeCompare(first.INS_DATE)
      );
      const availableSupplierTrdrs = new Set(
        nextRows.map((row) => String(row.TRDR ?? "").trim()).filter(Boolean)
      );

      setSupplierBasketRows(nextRows);
      setSelectedSupplierBasketTrdr((current) => {
        if (current && availableSupplierTrdrs.has(current)) {
          return current;
        }

        return availableSupplierTrdrs.values().next().value ?? null;
      });
    } catch (loadError) {
      if (requestId !== supplierBasketLoadRequestId.current) {
        return;
      }

      setSupplierBasketRows([]);
      setSelectedSupplierBasketTrdr(null);
      setSupplierBasketsError(
        loadError instanceof Error
          ? loadError.message
          : "Αποτυχία φόρτωσης καλαθιών κεντρικού εφοδιασμού."
      );
    } finally {
      if (requestId === supplierBasketLoadRequestId.current) {
        setSupplierBasketsLoading(false);
      }
    }
  }, [currentBranchCode, fetchStockRequests]);

  useEffect(() => {
    // Remote data is synchronized after the selected period changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRows();
  }, [loadRows]);

  useEffect(() => {
    // Remote supplier baskets are synchronized when the logged-in branch changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSupplierBaskets();
  }, [loadSupplierBaskets]);

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

  const closeForensicsDrawer = useCallback(() => {
    setSelectedForensicsItem(null);
  }, []);

  const availableRows = useMemo(() => {
    const salesMtrls = new Set(rows.map((row) => String(row.MTRL)));
    return [
      ...rows,
      ...itemSearchRows.filter((row) => !salesMtrls.has(String(row.MTRL))),
    ];
  }, [itemSearchRows, rows]);
  const itemSearchMtrls = useMemo(
    () => new Set(itemSearchRows.map((row) => String(row.MTRL))),
    [itemSearchRows]
  );
  const salesMtrls = useMemo(
    () => new Set(rows.map((row) => String(row.MTRL))),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("el-GR");

    if (!query) {
      return availableRows;
    }

    return availableRows.filter((row) => {
      if (itemSearchMtrls.has(String(row.MTRL))) return true;

      return [
        row.CODE,
        row.NAME,
        row.CODE1,
        row.CCCSUFIX,
        row.ZGROUP_CODE,
        row.ZB2B_CODE,
        row.SUGGESTED_TRDR,
        row.SUGGESTED_TRDR_CODE,
        row.SUGGESTED_TRDR_NAME,
      ]
        .map((value) => String(value ?? ""))
        .join(" ")
        .toLocaleLowerCase("el-GR")
        .includes(query);
    });
  }, [availableRows, itemSearchMtrls, searchTerm]);

  const handleSearchTermChange = useCallback(
    (nextSearchTerm: string) => {
      itemSearchRequestId.current += 1;
      setSearchTerm(nextSearchTerm);
      setItemSearchRows([]);
    },
    [setSearchTerm]
  );

  const handleItemSearch = useCallback(async () => {
    const query = searchTerm.trim();

    if (!query) return;

    const requestId = ++itemSearchRequestId.current;

    try {
      const result = await searchItems(query);

      if (requestId !== itemSearchRequestId.current) return;

      if (!result.success) {
        throw new Error(result.message || "Η αναζήτηση ειδών δεν ολοκληρώθηκε.");
      }

      const nextRows = (result.rows ?? []).map(itemSearchResultToCompanyStockRow);
      setItemSearchRows(nextRows);

      if (nextRows.length === 0) {
        toast.error("Δεν βρέθηκαν είδη στο ERP για αυτόν τον όρο.");
      }
    } catch (searchError) {
      if (requestId !== itemSearchRequestId.current) return;

      const message =
        searchError instanceof Error
          ? searchError.message
          : "Αποτυχία αναζήτησης ειδών στο ERP.";
      setItemSearchRows([]);
      toast.error(message);
    }
  }, [searchItems, searchTerm]);

  const setQuantity = useCallback((itemKey: string, nextQuantity: number) => {
    setQuantities((current) => ({
      ...current,
      [itemKey]: Number.isFinite(nextQuantity)
        ? Math.max(0, Math.floor(nextQuantity))
        : 0,
    }));
  }, []);

  const handleSuggestedSupplierChange = useCallback(
    (itemKey: string, supplier: CompanyStockSuggestedSupplier) => {
      setSupplierOverrides((current) => ({
        ...current,
        [itemKey]: supplier,
      }));
      setAddErrors((current) => ({ ...current, [itemKey]: "" }));
    },
    []
  );

  const handleSuggestedSupplierSaved = useCallback(
    (
      itemKey: string,
      suffix: string,
      supplier: CompanyStockSuggestedSupplier
    ) => {
      setRows((current) =>
        current.map((row) =>
          String(row.CCCSUFIX ?? "").trim() === suffix.trim()
            ? {
                ...row,
                SUGGESTED_TRDR: supplier.trdr,
                SUGGESTED_TRDR_CODE: supplier.code,
                SUGGESTED_TRDR_NAME: supplier.name,
              }
            : row
        )
      );
      setItemSearchRows((current) =>
        current.map((row) =>
          String(row.CCCSUFIX ?? "").trim() === suffix.trim()
            ? {
                ...row,
                SUGGESTED_TRDR: supplier.trdr,
                SUGGESTED_TRDR_CODE: supplier.code,
                SUGGESTED_TRDR_NAME: supplier.name,
              }
            : row
        )
      );
      setSupplierOverrides((current) => {
        const next = { ...current };
        delete next[itemKey];
        return next;
      });
    },
    []
  );

  const handleAddToCompanyBasket = useCallback(
    async (row: ICompanyStockRow) => {
      const itemKey = String(row.MTRL);
      const quantity = quantities[itemKey] ?? 0;
      const normalizedMtrl = Number(row.MTRL);
      const selectedSupplier =
        supplierOverrides[itemKey] ?? getSuggestedSupplier(row);

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
        await requestStockQuantity({
          mtrl: normalizedMtrl,
          qty: quantity,
          branch: currentBranchCode,
          origin: "PASCHALIDIS",
          trdr: selectedSupplier.trdr,
        });

        await loadSupplierBaskets();
        if (selectedSupplier.trdr) {
          setSelectedSupplierBasketTrdr(selectedSupplier.trdr);
        }
        setQuantity(itemKey, 0);
        setSupplierOverrides((current) => {
          if (!(itemKey in current)) return current;

          const next = { ...current };
          delete next[itemKey];
          return next;
        });
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
    [
      currentBranchCode,
      loadSupplierBaskets,
      quantities,
      requestStockQuantity,
      setQuantity,
      supplierOverrides,
    ]
  );

  const handleSubmitSupplierBasket = useCallback(
    async (supplierTrdr: string) => {
      if (!currentBranchCode) {
        toast.error("Δεν είναι διαθέσιμο το υποκατάστημα σύνδεσης.");
        return;
      }

      const normalizedSupplierTrdr = supplierTrdr.trim();
      const selectedRows = supplierBasketRows.filter(
        (row) => String(row.TRDR ?? "").trim() === normalizedSupplierTrdr
      );

      if (!normalizedSupplierTrdr || selectedRows.length === 0) {
        toast.error("Δεν βρέθηκε ενεργό καλάθι για τον προμηθευτή.");
        return;
      }

      const supplierName =
        String(selectedRows[0]?.TRDR_NAME ?? "").trim() || normalizedSupplierTrdr;
      const totalQuantity = selectedRows.reduce(
        (total, row) => total + getSupplierBasketQuantity(row),
        0
      );
      const confirmed = window.confirm(
        `Αποστολή SoftOne για ${supplierName};\n` +
          `${selectedRows.length} γραμμές · ${totalQuantity} τεμ.`
      );

      if (!confirmed) {
        return;
      }

      setSubmittingSupplierTrdr(normalizedSupplierTrdr);

      try {
        const result = await submitSupplierBasketOrder({
          branch: currentBranchCode,
          supplierTrdr: normalizedSupplierTrdr,
          transactionDate: getLocalIsoDate(),
          items: selectedRows,
        });

        await loadSupplierBaskets();

        const documentId = String(result.id ?? "").trim();
        toast.success(
          documentId
            ? `Το PURDOC ${documentId} δημιουργήθηκε επιτυχώς.`
            : "Το PURDOC δημιουργήθηκε επιτυχώς."
        );
      } catch (submitError) {
        toast.error(
          submitError instanceof Error
            ? submitError.message
            : "Αποτυχία αποστολής καλαθιού προμηθευτή."
        );
      } finally {
        setSubmittingSupplierTrdr(null);
      }
    },
    [
      currentBranchCode,
      loadSupplierBaskets,
      submitSupplierBasketOrder,
      supplierBasketRows,
    ]
  );

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] min-w-0 max-w-full flex-col md:min-h-[calc(100dvh-9rem)] xl:h-[calc(100dvh-9rem)] xl:min-h-0 xl:overflow-hidden">
      <div className="shrink-0 space-y-4">
        <PageBreadcrumb pageTitle="Κεντρική Διαχείριση Αποθέματος" />

        {error ? (
          <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Δεν ήταν δυνατή η φόρτωση δεδομένων</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-5 xl:flex-row xl:min-h-0">
        <DataTable className="flex h-[60dvh] min-h-[20rem] min-w-0 max-w-full shrink-0 flex-col overflow-hidden xl:h-auto xl:min-h-0 xl:max-h-full xl:flex-1 xl:basis-3/4 xl:shrink">
        <DataTableHeader
          className="shrink-0"
          title="Πωλήσεις και Κεντρικό Απόθεμα"
          description={`${filteredRows.length} από ${availableRows.length} είδη · Τελευταίες ${formatDaysLabel(days)}`}
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
                onChange={handleSearchTermChange}
                onSubmit={() => void handleItemSearch()}
                onClear={() => handleSearchTermChange("")}
                onRefresh={refreshRows}
                isRefreshing={loading}
                isSubmitting={searchingItems}
                refreshDisabled={loading}
                submitDisabled={loading}
                placeholder="Κωδικός ή περιγραφή · Enter για ERP..."
              />
            </div>
          )}
        />

        {loading ? (
          <div className="min-h-0 flex-1 overflow-auto">
            <TableSkeleton />
          </div>
        ) : error ? (
          <DataTableEmptyState
            className="min-h-0 flex-1"
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
            className="min-h-0 flex-1"
            icon={<Package className="h-7 w-7" />}
            title="Δεν βρέθηκαν είδη"
            description="Δεν υπάρχουν δεδομένα για την επιλεγμένη περίοδο. Πατήστε «Αναζήτηση ERP» για είδη εκτός της λίστας πωλήσεων."
          />
        ) : (
          <div className="min-h-0 min-w-0 w-full max-w-full flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full min-w-[1500px] table-fixed divide-y divide-gray-100 text-sm dark:divide-gray-800">
              <colgroup>
                <col className="w-[12%]" />
                <col className="w-[14%]" />
                <col className="w-[6%]" />
                <col className="w-[22%]" />
                <col className="w-[5%]" />
                <col className="w-[18%]" />
                <col className="w-[13%]" />
                <col className="w-[10%]" />
              </colgroup>

              <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-950">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Κωδικός
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Είδος
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Πωλήσεις
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Ιστορικό πωλήσεων
                  </th>
                  <th className="px-1 py-3 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Σε Εξέλξη
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Διαθεσιμότητα
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Προτεινόμενος Προμηθευτής
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
                  const persistedSupplier = getSuggestedSupplier(row);
                  const selectedSupplier =
                    supplierOverrides[itemKey] ?? persistedSupplier;
                  const isItemSearchResult =
                    itemSearchMtrls.has(String(row.MTRL)) &&
                    !salesMtrls.has(String(row.MTRL));

                  return (
                    <tr
                      key={`${itemKey}-${row.CODE}-${index}`}
                      className="transition hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                    >
                      <td className="px-3 py-2 align-middle">
                        <button
                          type="button"
                          onClick={() => setSelectedForensicsItem(row)}
                          className="group/item inline-flex max-w-full flex-col items-start gap-1.5 rounded-xl px-2 py-2 text-left transition hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:hover:bg-brand-500/10"
                          aria-label={`Προβολή ιστορικού πωλήσεων για τον κωδικό ${row.CODE || "—"}`}
                          title="Προβολή ιστορικού πωλήσεων"
                        >
                          <span className="inline-flex max-w-full items-center gap-2">
                            <ItemCodeBadge
                              code={row.CODE}
                              className="transition group-hover/item:border-brand-300 group-hover/item:bg-white dark:group-hover/item:border-brand-400 dark:group-hover/item:bg-gray-900"
                            />
                            <ChartColumn className="h-4 w-4 shrink-0 text-gray-300 transition group-hover/item:text-brand-500 dark:text-gray-600" />
                          </span>
                          {isItemSearchResult ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium leading-tight text-gray-500 shadow-xs transition group-hover/item:border-gray-300 group-hover/item:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:group-hover/item:border-gray-600 dark:group-hover/item:bg-gray-800">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
                              Αποτέλεσμα αναζήτησης ERP
                            </span>
                          ) : null}
                        </button>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <p className="break-words font-medium leading-5 text-gray-900 dark:text-white">
                          {row.NAME || "—"}
                        </p>
                          <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
                            <span>CODE1: <strong className="font-medium text-gray-700 dark:text-gray-300">{row.CODE1 || "—"}</strong></span>
                            <span>SUFFIX: <strong className="font-medium text-gray-700 dark:text-gray-300">{row.CCCSUFIX || "—"}</strong></span>
                            <span>GROUP: <strong className="font-medium text-gray-700 dark:text-gray-300">{row.ZGROUP_CODE || "—"}</strong></span>
                            <span>B2B: <strong className="font-medium text-gray-700 dark:text-gray-300">{row.ZB2B_CODE || "—"}</strong></span>
                          </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-center align-middle tabular-nums font-semibold text-gray-900 dark:text-white">
                        {formatNumber(row.QTY_SOLD)}
                      </td>

                      <td className="px-4 py-4 align-middle">
                        {isItemSearchResult ? (
                          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                            Δεν παρέχεται από την αναζήτηση ERP
                          </p>
                        ) : (
                          <div className="grid grid-cols-5 gap-1.5">
                          {SALES_HISTORY_FIELDS.map((field, historyIndex) => {
                            const year = currentYear - historyIndex;
                            const simField = salesHistorySimField(field);

                            return (
                              <div
                                key={field}
                                className="min-w-0 rounded-lg bg-gray-50 px-1.5 py-1.5 text-center dark:bg-gray-800/70"
                                title={`${field}-${year} · ${simField}`}
                              >
                                <p
                                  className="whitespace-nowrap text-[10px] font-medium leading-tight text-gray-400 dark:text-gray-500"
                                >
                                  {field}-{year}
                                </p>
                                <p className="mt-0.5 text-sm font-semibold tabular-nums leading-tight text-gray-800 dark:text-gray-100">
                                  {formatNumber(row[field])}
                                </p>
                                <p
                                  className="mt-1 whitespace-nowrap text-[10px] font-medium leading-tight text-gray-400 dark:text-gray-500"
                                >
                                  {simField}
                                </p>
                                <p className="mt-0.5 text-xs font-medium tabular-nums leading-tight text-gray-600 dark:text-gray-300">
                                  {formatNumber(row[simField])}
                                </p>
                              </div>
                            );
                          })}
                          </div>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-1 py-4 text-center align-middle text-xs tabular-nums text-gray-700 dark:text-gray-200">
                        {formatNumber(row.ONGOING)}
                      </td>

                      <td className="px-4 py-4 align-middle">
                        <div className="grid grid-cols-4 gap-1.5">
                          {AVAILABILITY_FIELDS.map(({ key, branch }) => (
                            <div
                              key={key}
                              className="min-w-0 rounded-lg bg-gray-50 px-1.5 py-1.5 text-center dark:bg-gray-800/70"
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
                          <div className="flex min-w-0 flex-col items-center rounded-lg bg-brand-50 px-1.5 py-1.5 text-center dark:bg-brand-500/10">
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

                      <td className="px-2 py-3 align-middle">
                        <SuggestedSupplierCell
                          suffix={row.CCCSUFIX}
                          persistedSupplier={persistedSupplier}
                          value={selectedSupplier}
                          disabled={isAddingItem}
                          onChange={(supplier) =>
                            handleSuggestedSupplierChange(itemKey, supplier)
                          }
                          onSaved={(supplier) =>
                            handleSuggestedSupplierSaved(
                              itemKey,
                              row.CCCSUFIX,
                              supplier
                            )
                          }
                        />
                      </td>

                      <td className="px-2 py-3 align-middle">
                        <div className="flex min-w-0 flex-col items-stretch justify-center gap-2">
                          <div className="flex min-w-0 flex-col gap-2">
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
                              fullWidth
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
                              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-800/70 dark:disabled:text-gray-500"
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
                            <p className="text-left text-[11px] font-medium leading-4 text-red-500">
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
          selectedSupplierTrdr={selectedSupplierBasketTrdr}
          onSelectedSupplierTrdrChange={setSelectedSupplierBasketTrdr}
          onSubmitSelectedSupplier={(supplierTrdr) =>
            void handleSubmitSupplierBasket(supplierTrdr)
          }
          loading={supplierBasketsLoading}
          error={supplierBasketsError}
          isSubmitting={submittingSupplierTrdr != null}
          collapsed={!summaryVisible}
          onToggleCollapse={() => setSummaryVisible((visible) => !visible)}
        />
      </div>
      {selectedForensicsItem ? (
        <ItemForensicsDrawer
          key={`${selectedForensicsItem.MTRL}-${days}`}
          item={selectedForensicsItem}
          days={days}
          onClose={closeForensicsDrawer}
        />
      ) : null}
    </div>
  );
}
