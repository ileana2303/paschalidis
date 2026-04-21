"use client";

import {
    FormEvent,
    Fragment,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/template components/common/PageBreadCrumb";
import {
    ChevronDown,
    ChevronLeft,
    Loader2,
    RefreshCw,
    ShoppingCart,
    Users,
} from "@/app/lib/lucide";
import type { BasketAllResponse } from "@/app/lib/interface";
import { useFetchAllClientBasketsMutation } from "@/hooks/queries/useApiMutations";

const DEFAULT_SEARCH = "*";
const DEFAULT_PAGE_SIZE = 25;

type ClientBasketLine = {
    id: string;
    trdr: string;
    code: string;
    name: string;
    qty: number;
    basePrice: number;
    requestedPrice: number;
    effectivePrice: number;
    lineTotal: number;
    basketDate: string;
};

type ClientBasketGroup = {
    key: string;
    trdr: string;
    customerName: string;
    customerCode: string;
    itemCount: number;
    totalValue: number;
    items: ClientBasketLine[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function firstDefined(...values: unknown[]) {
    for (const value of values) {
        if (value !== undefined && value !== null) {
            return value;
        }
    }

    return undefined;
}

function asString(value: unknown, fallback = "") {
    if (value === undefined || value === null) {
        return fallback;
    }

    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : fallback;
}

function asNumber(value: unknown, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function getNestedRows(row: Record<string, unknown>) {
    const candidates = [row.items, row.rows, row.lines, row.basketRows];

    for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
            return candidate;
        }
    }

    return [];
}

function normalizeLine(
    rowInput: unknown,
    fallbackTrdr: string,
    index: number
): ClientBasketLine | null {
    if (!isRecord(rowInput)) {
        return null;
    }

    const trdr = asString(firstDefined(rowInput.TRDR, rowInput.trdr), fallbackTrdr);
    const id = asString(
        firstDefined(rowInput.BASKETID, rowInput.basketId),
        `${trdr || "unknown"}-${index}`
    );
    const code = asString(
        firstDefined(rowInput.CODE, rowInput.ITEM_CODE, rowInput.code),
        "—"
    );
    const name = asString(
        firstDefined(rowInput.NAME, rowInput.ITEM_DESCR, rowInput.name),
        "—"
    );
    const qty = asNumber(
        firstDefined(rowInput.QTY, rowInput.TOTAL_QTY, rowInput.BASKET_QTY, rowInput.qty),
        0
    );
    const basePrice = asNumber(
        firstDefined(
            rowInput.PRICE_ERP,
            rowInput.BASKET_ERP_PRICE,
            rowInput.priceErp,
            rowInput.basePrice
        ),
        0
    );
    const requestedPrice = asNumber(
        firstDefined(
            rowInput.PRICE_REQ,
            rowInput.BASKET_REQ_PRICE,
            rowInput.priceReq,
            rowInput.requestedPrice
        ),
        basePrice
    );
    const effectivePrice = requestedPrice > 0 ? requestedPrice : basePrice;
    const rawLineTotal = asNumber(
        firstDefined(rowInput.LINE_TOTAL, rowInput.lineTotal),
        Number.NaN
    );
    const lineTotal =
        Number.isFinite(rawLineTotal) && rawLineTotal > 0
            ? rawLineTotal
            : effectivePrice * qty;
    const basketDate = asString(
        firstDefined(
            rowInput.BASKET_DATE,
            rowInput.INS_DATE,
            rowInput.MAX_INS_DATE,
            rowInput.basketDate
        ),
        ""
    );

    return {
        id,
        trdr,
        code,
        name,
        qty,
        basePrice,
        requestedPrice,
        effectivePrice,
        lineTotal,
        basketDate,
    };
}

function normalizeGroupedRows(rows: unknown[]) {
    const groups: ClientBasketGroup[] = [];

    rows.forEach((rowInput, rowIndex) => {
        if (!isRecord(rowInput)) {
            return;
        }

        const nestedRows = getNestedRows(rowInput);
        const fallbackTrdr = asString(
            firstDefined(rowInput.TRDR, rowInput.trdr),
            ""
        );
        const items = nestedRows
            .map((itemRow, itemIndex) =>
                normalizeLine(itemRow, fallbackTrdr, itemIndex)
            )
            .filter((item): item is ClientBasketLine => item != null);

        const firstNestedRow = items[0];
        const trdr = asString(
            firstDefined(rowInput.TRDR, rowInput.trdr, firstNestedRow?.trdr),
            ""
        );
        const customerName = asString(
            firstDefined(
                rowInput.CUST_NAME,
                rowInput.customerName,
                rowInput.NAME,
                rowInput.name
            ),
            trdr ? `Πελάτης ${trdr}` : `Πελάτης ${rowIndex + 1}`
        );
        const customerCode = asString(
            firstDefined(rowInput.CODE, rowInput.customerCode),
            "—"
        );
        const itemCount = asNumber(
            firstDefined(rowInput.totalcount, rowInput.totalCount),
            items.length
        );
        const providedTotal = asNumber(
            firstDefined(rowInput.basketTotal, rowInput.totalValue),
            Number.NaN
        );
        const calculatedTotal = items.reduce(
            (sum, item) => sum + item.lineTotal,
            0
        );
        const totalValue =
            Number.isFinite(providedTotal) && providedTotal >= 0
                ? providedTotal
                : calculatedTotal;

        groups.push({
            key: trdr || `group-${rowIndex}`,
            trdr,
            customerName,
            customerCode,
            itemCount: itemCount > 0 ? itemCount : items.length,
            totalValue,
            items,
        });
    });

    return groups;
}

function normalizeFlatRows(rows: unknown[]) {
    const grouped = new Map<string, ClientBasketGroup>();

    rows.forEach((rowInput, index) => {
        const line = normalizeLine(rowInput, "", index);
        if (!line) {
            return;
        }

        const row = isRecord(rowInput) ? rowInput : {};
        const trdr = asString(firstDefined(row.TRDR, row.trdr), line.trdr);
        const key = trdr || `group-${index}`;
        const customerName = asString(
            firstDefined(row.CUST_NAME, row.customerName),
            trdr ? `Πελάτης ${trdr}` : `Πελάτης ${index + 1}`
        );

        if (!grouped.has(key)) {
            grouped.set(key, {
                key,
                trdr,
                customerName,
                customerCode: "—",
                itemCount: 0,
                totalValue: 0,
                items: [],
            });
        }

        const group = grouped.get(key);
        if (!group) {
            return;
        }

        group.items.push(line);
        group.itemCount += 1;
        group.totalValue += line.lineTotal;
    });

    return Array.from(grouped.values());
}

function normalizeAllBasketsResponse(data: BasketAllResponse) {
    const rows = Array.isArray(data.rows) ? data.rows : [];

    if (rows.length === 0) {
        return {
            groups: [] as ClientBasketGroup[],
            totalcount: 0,
            page: data.page ?? 1,
            pageSize: data.pageSize ?? DEFAULT_PAGE_SIZE,
        };
    }

    const firstRow = rows[0];
    const hasNestedRows = isRecord(firstRow) && getNestedRows(firstRow).length > 0;
    const groups = hasNestedRows
        ? normalizeGroupedRows(rows)
        : normalizeFlatRows(rows);

    const totalcount = Number.isFinite(Number(data.totalcount))
        ? Number(data.totalcount)
        : groups.length;

    return {
        groups,
        totalcount: totalcount > 0 ? totalcount : groups.length,
        page:
            data.page && Number.isFinite(Number(data.page))
                ? Number(data.page)
                : 1,
        pageSize:
            data.pageSize && Number.isFinite(Number(data.pageSize))
                ? Number(data.pageSize)
                : DEFAULT_PAGE_SIZE,
    };
}

function formatPrice(value: number) {
    return `${value.toFixed(2)} €`;
}

function formatDateTime(value: string) {
    if (!value) {
        return "—";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleString("el-GR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function AllBasketsClient() {
    const router = useRouter();
    const { mutateAsync: fetchAllClientBaskets } = useFetchAllClientBasketsMutation();

    const [searchInput, setSearchInput] = useState(DEFAULT_SEARCH);
    const [appliedSearch, setAppliedSearch] = useState(DEFAULT_SEARCH);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [totalcount, setTotalcount] = useState(0);
    const [groups, setGroups] = useState<ClientBasketGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    const loadData = useCallback(async () => {
        setLoading(true);
        setError("");
        setMessage("");

        try {
            const data = await fetchAllClientBaskets({
                search: appliedSearch,
                page,
                pageSize,
            });
            const normalized = normalizeAllBasketsResponse(data);
            setGroups(normalized.groups);
            setTotalcount(normalized.totalcount);
            setMessage(data.message ?? "");
            setExpandedGroups(new Set());
        } catch (err) {
            setGroups([]);
            setTotalcount(0);
            setError(
                err instanceof Error
                    ? err.message
                    : "Αποτυχία φόρτωσης καλαθιών πελατών"
            );
        } finally {
            setLoading(false);
        }
    }, [appliedSearch, fetchAllClientBaskets, page, pageSize]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const normalizedSearch = searchInput.trim() || DEFAULT_SEARCH;
        setAppliedSearch(normalizedSearch);
        setPage(1);
    };

    const totalPages = useMemo(() => {
        const safeTotal = totalcount > 0 ? totalcount : groups.length;
        return Math.max(1, Math.ceil(safeTotal / pageSize));
    }, [groups.length, pageSize, totalcount]);

    const canGoPrevious = page > 1;
    const canGoNext = page < totalPages;

    const totalItems = useMemo(
        () => groups.reduce((sum, group) => sum + group.itemCount, 0),
        [groups]
    );
    const totalValue = useMemo(
        () => groups.reduce((sum, group) => sum + group.totalValue, 0),
        [groups]
    );

    const toggleGroup = (key: string) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    return (
        <div>
            <PageBreadcrumb pageTitle="Καλάθια Όλων των Πελατών" />

            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.02]">
                <form
                    onSubmit={handleSearch}
                    className="flex flex-col gap-3 lg:flex-row lg:items-end"
                >
                    <div className="flex-1">
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-gray-500">
                            Αναζήτηση πελάτη
                        </label>
                        <input
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="* για όλους ή ονομασία/ΑΦΜ/κωδικός"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                        />
                    </div>

                    <div className="w-full lg:w-40">
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-gray-500">
                            Μέγεθος σελίδας
                        </label>
                        <select
                            value={pageSize}
                            onChange={(event) => {
                                setPageSize(Number(event.target.value));
                                setPage(1);
                            }}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="submit"
                            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
                        >
                            Αναζήτηση
                        </button>
                        <button
                            type="button"
                            onClick={loadData}
                            disabled={loading}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-brand-500 hover:text-brand-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                            Ανανέωση
                        </button>
                    </div>
                </form>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.02]">
                    <p className="text-xs uppercase tracking-[0.1em] text-gray-500">
                        Πελάτες με καλάθι
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                        {groups.length}
                    </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.02]">
                    <p className="text-xs uppercase tracking-[0.1em] text-gray-500">
                        Γραμμές καλαθιών
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                        {totalItems}
                    </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.02]">
                    <p className="text-xs uppercase tracking-[0.1em] text-gray-500">
                        Συνολική αξία
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                        {formatPrice(totalValue)}
                    </p>
                </div>
            </div>

            {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                    {error}
                </div>
            )}

            {!error && message && (
                <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
                    {message}
                </div>
            )}

            <div className="mt-4 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]">
                {loading ? (
                    <div className="flex items-center justify-center px-5 py-16 text-gray-500 dark:text-gray-400">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Φόρτωση καλαθιών...
                    </div>
                ) : groups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-5 py-16 text-center text-gray-500 dark:text-gray-400">
                        <ShoppingCart className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                        <p className="mt-3 text-sm">
                            Δεν βρέθηκαν καλάθια για τα κριτήρια αναζήτησης.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                            <thead className="bg-gray-50 dark:bg-white/[0.02]">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                                        Πελάτης
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                                        TRDR
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                                        Γραμμές
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                                        Σύνολο
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                                        Ενέργειες
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {groups.map((group) => {
                                    const isOpen = expandedGroups.has(group.key);

                                    return (
                                        <Fragment key={group.key}>
                                            <tr>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-800 dark:text-white/90">
                                                        {group.customerName}
                                                    </div>
                                                    <div className="mt-0.5 text-xs text-gray-500">
                                                        Κωδικός: {group.customerCode}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                                    {group.trdr || "—"}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                                    {group.itemCount}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200">
                                                    {formatPrice(group.totalValue)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-end gap-2">
                                                        {group.trdr && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    router.push(
                                                                        `/search-parts?trdr=${group.trdr}`
                                                                    )
                                                                }
                                                                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-brand-500 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"
                                                            >
                                                                <Users className="h-3.5 w-3.5" />
                                                                Άνοιγμα πελάτη
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleGroup(group.key)}
                                                            className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-600"
                                                        >
                                                            <ChevronDown
                                                                className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""
                                                                    }`}
                                                            />
                                                            {isOpen ? "Απόκρυψη" : "Ανάλυση"}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {isOpen && (
                                                <tr>
                                                    <td
                                                        colSpan={5}
                                                        className="bg-gray-50 px-4 py-4 dark:bg-white/[0.01]"
                                                    >
                                                        {group.items.length === 0 ? (
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                Δεν υπάρχουν γραμμές για αυτό το καλάθι.
                                                            </p>
                                                        ) : (
                                                            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                                                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                                                                    <thead className="bg-white dark:bg-gray-900/50">
                                                                        <tr>
                                                                            <th className="px-3 py-2 text-left text-xs text-gray-500">
                                                                                BASKET ID
                                                                            </th>
                                                                            <th className="px-3 py-2 text-left text-xs text-gray-500">
                                                                                Κωδικός
                                                                            </th>
                                                                            <th className="px-3 py-2 text-left text-xs text-gray-500">
                                                                                Περιγραφή
                                                                            </th>
                                                                            <th className="px-3 py-2 text-left text-xs text-gray-500">
                                                                                Qty
                                                                            </th>
                                                                            <th className="px-3 py-2 text-left text-xs text-gray-500">
                                                                                Τιμή
                                                                            </th>
                                                                            <th className="px-3 py-2 text-left text-xs text-gray-500">
                                                                                Σύνολο
                                                                            </th>
                                                                            <th className="px-3 py-2 text-left text-xs text-gray-500">
                                                                                Ημ/νία
                                                                            </th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-transparent">
                                                                        {group.items.map((item) => (
                                                                            <tr key={`${group.key}-${item.id}`}>
                                                                                <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                                                                                    {item.id}
                                                                                </td>
                                                                                <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                                                                                    {item.code}
                                                                                </td>
                                                                                <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                                                                                    {item.name}
                                                                                </td>
                                                                                <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                                                                                    {item.qty}
                                                                                </td>
                                                                                <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                                                                                    {formatPrice(item.effectivePrice)}
                                                                                </td>
                                                                                <td className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200">
                                                                                    {formatPrice(item.lineTotal)}
                                                                                </td>
                                                                                <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                                                                                    {formatDateTime(item.basketDate)}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Σελίδα {page} από {totalPages}
                </p>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        disabled={!canGoPrevious}
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition hover:border-brand-500 hover:text-brand-600 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Προηγούμενη
                    </button>
                    <button
                        type="button"
                        disabled={!canGoNext}
                        onClick={() =>
                            setPage((prev) => (canGoNext ? prev + 1 : prev))
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition hover:border-brand-500 hover:text-brand-600 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
                    >
                        Επόμενη
                        <ChevronLeft className="h-4 w-4 rotate-180" />
                    </button>
                </div>
            </div>
        </div>
    );
}
