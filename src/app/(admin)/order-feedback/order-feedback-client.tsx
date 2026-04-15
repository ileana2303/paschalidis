"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Check,
    Loader2,
    Package,
    Plus,
    Search,
    Send,
    Trash2,
} from "lucide-react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Badge from "@/components/ui/badge/Badge";
import Pagination from "@/components/tables/Pagination";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { fetchCatalogProducts } from "@/app/lib/api/catalogs";
import { searchItems, fetchBatchStock } from "@/app/lib/api/items";
import type { StockInfo } from "@/app/lib/api/items";
import type { IProduct, IItem } from "@/app/lib/interface";

const BRANCHES = [
    { id: "1001", label: "Αθηνών" },
    { id: "1006", label: "Ν. Κόσμος" },
    { id: "1007", label: "Μεσογείων" },
] as const;

type BranchId = (typeof BRANCHES)[number]["id"];

// ── Restock request entry (local-only for now) ─────────────
interface RestockEntry {
    code: string;
    name: string;
    mtrl: string;
    qty: number;
}

// ── Merged row: product from catalog + stock from search ───
interface ProductRow {
    mtrl: string;
    code: string;
    name: string;
    price: string;
    stock1001: number | null;
    stock1006: number | null;
    stock1007: number | null;
    totalAvail: number | null;
    ongoing: number | null;
    netAvail: number | null;
}

const PAGE_SIZE = 100;

export default function OrderFeedbackClient() {
    // ── Catalog data (full product list) ───────────────────
    const [products, setProducts] = useState<IProduct[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [catalogLoading, setCatalogLoading] = useState(true);
    const [catalogError, setCatalogError] = useState<string | null>(null);

    // ── Stock enrichment for catalog mode ─────────────────
    const [stockMap, setStockMap] = useState<Record<string, StockInfo>>({});
    const [stockLoading, setStockLoading] = useState(false);

    // ── Search state ───────────────────────────────────────
    const [search, setSearch] = useState("");
    const [searchResults, setSearchResults] = useState<IItem[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [isSearchMode, setIsSearchMode] = useState(false);

    // ── Branch & restock state ─────────────────────────────
    const [selectedBranch, setSelectedBranch] = useState<BranchId>("1001");
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [restockList, setRestockList] = useState<RestockEntry[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // ── Load catalog page ──────────────────────────────────
    const loadPage = useCallback(async (targetPage: number) => {
        setCatalogLoading(true);
        setCatalogError(null);

        try {
            const res = await fetchCatalogProducts(targetPage, PAGE_SIZE);
            setProducts(res.data);
            setPage(res.page);
            setTotalPages(res.totalPages);
            setTotalCount(Number(res.totalCount));
        } catch {
            setCatalogError("Αποτυχία φόρτωσης προϊόντων. Δοκιμάστε ξανά.");
        } finally {
            setCatalogLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPage(1);
    }, [loadPage]);

    // ── Fetch stock data for current catalog page ──────────
    useEffect(() => {
        if (products.length === 0) return;

        let cancelled = false;

        async function enrichStock() {
            setStockLoading(true);
            try {
                const codes = products.map((p) => p.code);
                const stocks = await fetchBatchStock(codes);
                if (!cancelled) setStockMap(stocks);
            } catch {
                // Stock enrichment is best-effort
            } finally {
                if (!cancelled) setStockLoading(false);
            }
        }

        enrichStock();
        return () => { cancelled = true; };
    }, [products]);

    // ── Search handler ─────────────────────────────────────
    async function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = search.trim();

        if (!trimmed) {
            setIsSearchMode(false);
            setSearchResults([]);
            return;
        }

        setSearchLoading(true);
        setIsSearchMode(true);

        try {
            const res = await searchItems(trimmed);
            setSearchResults(res.rows ?? []);
        } catch {
            setSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    }

    function clearSearch() {
        setSearch("");
        setIsSearchMode(false);
        setSearchResults([]);
    }

    // ── Build display rows ─────────────────────────────────
    const displayRows: ProductRow[] = useMemo(() => {
        if (isSearchMode) {
            return searchResults.map((item) => ({
                mtrl: String(item.MTRL),
                code: item.ITEM_CODE,
                name: item.ITEM_DESCR,
                price: String(item.PRICE_RETAIL),
                stock1001: Number(item.YP1001),
                stock1006: Number(item.YP1006),
                stock1007: Number(item.YP1007),
                totalAvail: Number(item.TOTAL_AVAIL),
                ongoing: Number(item.ONGOING),
                netAvail: Number(item.NET_QTY_AVAILABLE),
            }));
        }

        return products.map((p) => {
            const s = stockMap[p.code];
            return {
                mtrl: p.mtrl,
                code: p.code,
                name: p.name,
                price: p.price,
                stock1001: s?.stock1001 ?? null,
                stock1006: s?.stock1006 ?? null,
                stock1007: s?.stock1007 ?? null,
                totalAvail: s?.totalAvail ?? null,
                ongoing: s?.ongoing ?? null,
                netAvail: s?.netAvail ?? null,
            };
        });
    }, [isSearchMode, searchResults, products, stockMap]);

    // ── Quantity helpers ────────────────────────────────────
    function getQty(mtrl: string) {
        return quantities[mtrl] ?? 0;
    }

    function setQty(mtrl: string, val: number) {
        setQuantities((prev) => ({ ...prev, [mtrl]: Math.max(0, val) }));
    }

    // ── Restock list management ────────────────────────────
    function addToRestockList(row: ProductRow) {
        const qty = getQty(row.mtrl);
        if (qty < 1) return;

        setRestockList((prev) => {
            const existing = prev.find((e) => e.mtrl === row.mtrl);
            if (existing) {
                return prev.map((e) =>
                    e.mtrl === row.mtrl ? { ...e, qty: e.qty + qty } : e
                );
            }
            return [...prev, { code: row.code, name: row.name, mtrl: row.mtrl, qty }];
        });

        setQuantities((prev) => ({ ...prev, [row.mtrl]: 0 }));
    }

    function removeFromRestockList(mtrl: string) {
        setRestockList((prev) => prev.filter((e) => e.mtrl !== mtrl));
    }

    function updateRestockQty(mtrl: string, qty: number) {
        if (qty < 1) return;
        setRestockList((prev) =>
            prev.map((e) => (e.mtrl === mtrl ? { ...e, qty } : e))
        );
    }

    // ── Submit placeholder ─────────────────────────────────
    async function handleSubmit() {
        if (restockList.length === 0) return;
        setSubmitting(true);

        // TODO: Replace with actual API call
        await new Promise((resolve) => setTimeout(resolve, 800));

        setSubmitted(true);
        setSubmitting(false);

        setTimeout(() => {
            setRestockList([]);
            setSubmitted(false);
        }, 3000);
    }

    // ── Page change ────────────────────────────────────────
    function handlePageChange(newPage: number) {
        if (newPage < 1 || newPage > totalPages || newPage === page) return;
        loadPage(newPage);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // ── Helpers ────────────────────────────────────────────
    function formatPrice(price: string) {
        const num = parseFloat(price);
        if (isNaN(num)) return price;
        return num.toLocaleString("el-GR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function stockCell(val: number | null) {
        if (val === null) return "—";
        return val;
    }

    function stockColor(val: number | null) {
        if (val === null) return "text-gray-300 dark:text-gray-600";
        if (val > 0) return "text-success-600";
        return "text-error-500";
    }

    const isLoading = isSearchMode ? searchLoading : catalogLoading;
    const rangeStart = (page - 1) * PAGE_SIZE + 1;
    const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);
    const branchLabel = BRANCHES.find((b) => b.id === selectedBranch)?.label ?? "";

    return (
        <div>
            <PageBreadcrumb pageTitle="Ανατροφοδοσία Παραγγελίες" />

            <div className="flex flex-col gap-6 xl:flex-row">
                <div className="w-full xl:w-3/4">
                    {/* ── Toolbar ────────────────────────────── */}
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {/* Search */}
                        <form onSubmit={handleSearch} className="relative w-full sm:max-w-md">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Αναζήτηση με απόθεμα (κωδικός ή περιγραφή)…"
                                className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-20 text-sm text-gray-700 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500"
                            />
                            {isSearchMode && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className="absolute right-14 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600"
                                    title="Καθαρισμός"
                                >
                                    ✕
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={searchLoading}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                            >
                                {searchLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Search className="h-4 w-4" />
                                )}
                            </button>
                        </form>

                        {/* Branch selector */}
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-500 dark:text-gray-400">
                                Κατάστημα:
                            </label>
                            <select
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(e.target.value as BranchId)}
                                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 shadow-theme-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                            >
                                {BRANCHES.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Status badges */}
                    {isSearchMode ? (
                        <div className="mb-3 flex items-center gap-2">
                            <Badge variant="light" size="sm" color="info">
                                Αποτελέσματα αναζήτησης: {searchResults.length}
                            </Badge>
                            <span className="text-theme-xs text-gray-400">
                                Τα αποτελέσματα περιέχουν δεδομένα αποθέματος
                            </span>
                        </div>
                    ) : stockLoading ? (
                        <div className="mb-3 flex items-center gap-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-500" />
                            <span className="text-theme-xs text-gray-400">
                                Φόρτωση αποθέματος…
                            </span>
                        </div>
                    ) : null}

                    {/* ── Table ──────────────────────────────── */}
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                            </div>
                        ) : catalogError && !isSearchMode ? (
                            <div className="px-6 py-16 text-center">
                                <p className="text-sm text-error-500">{catalogError}</p>
                                <button
                                    onClick={() => loadPage(page)}
                                    className="mt-3 text-sm font-medium text-brand-500 hover:underline"
                                >
                                    Δοκιμάστε ξανά
                                </button>
                            </div>
                        ) : displayRows.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                <Package className="mb-3 h-10 w-10" />
                                <p className="text-sm">Δεν βρέθηκαν προϊόντα.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                                        <TableRow>
                                            <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                                                Κωδικός
                                            </TableCell>
                                            <TableCell isHeader className="px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                                                Περιγραφή
                                            </TableCell>
                                            <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                                                Τιμή (€)
                                            </TableCell>
                                            <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                                                Αθηνών
                                            </TableCell>
                                            <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                                                Ν. Κόσμος
                                            </TableCell>
                                            <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                                                Μεσογείων
                                            </TableCell>
                                            <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                                                Καθαρά Διαθ.
                                            </TableCell>
                                            <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                                                Σε Μεταφ.
                                            </TableCell>
                                            <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-center text-theme-xs font-medium text-brand-600 dark:text-brand-400">
                                                Αίτηση Ποσ.
                                            </TableCell>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {displayRows.map((row) => {
                                            const qty = getQty(row.mtrl);
                                            const inList = restockList.some((e) => e.mtrl === row.mtrl);

                                            return (
                                                <TableRow
                                                    key={row.mtrl}
                                                    className="transition-colors hover:bg-gray-50 dark:hover:bg-white/2"
                                                >
                                                    <TableCell className="whitespace-nowrap px-4 py-2.5 text-sm font-medium text-gray-800 dark:text-white/90">
                                                        {row.code}
                                                    </TableCell>
                                                    <TableCell className="max-w-[200px] px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                                                        <span className="block truncate" title={row.name}>
                                                            {row.name}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="whitespace-nowrap px-4 py-2.5 text-right text-sm tabular-nums text-gray-700 dark:text-gray-300">
                                                        {formatPrice(row.price)}
                                                    </TableCell>
                                                    <TableCell className={`whitespace-nowrap px-4 py-2.5 text-center text-sm font-semibold tabular-nums ${stockColor(row.stock1001)}`}>
                                                        {stockCell(row.stock1001)}
                                                    </TableCell>
                                                    <TableCell className={`whitespace-nowrap px-4 py-2.5 text-center text-sm font-semibold tabular-nums ${stockColor(row.stock1006)}`}>
                                                        {stockCell(row.stock1006)}
                                                    </TableCell>
                                                    <TableCell className={`whitespace-nowrap px-4 py-2.5 text-center text-sm font-semibold tabular-nums ${stockColor(row.stock1007)}`}>
                                                        {stockCell(row.stock1007)}
                                                    </TableCell>
                                                    <TableCell className={`whitespace-nowrap px-4 py-2.5 text-center text-sm font-semibold tabular-nums ${stockColor(row.netAvail)}`}>
                                                        {stockCell(row.netAvail)}
                                                    </TableCell>
                                                    <TableCell className={`whitespace-nowrap px-4 py-2.5 text-center text-sm tabular-nums ${stockColor(row.ongoing)}`}>
                                                        {stockCell(row.ongoing)}
                                                    </TableCell>
                                                    <TableCell className="whitespace-nowrap px-4 py-2.5">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                value={qty || ""}
                                                                placeholder="0"
                                                                onChange={(e) =>
                                                                    setQty(row.mtrl, parseInt(e.target.value) || 0)
                                                                }
                                                                className="w-16 rounded border border-gray-300 bg-transparent px-2 py-1 text-center text-sm tabular-nums text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:text-gray-200"
                                                            />
                                                            <button
                                                                onClick={() => addToRestockList(row)}
                                                                disabled={qty < 1}
                                                                className="rounded-md bg-brand-500 p-1.5 text-white hover:bg-brand-600 disabled:opacity-30"
                                                                title="Προσθήκη στη λίστα"
                                                            >
                                                                <Plus className="h-3.5 w-3.5" />
                                                            </button>
                                                            {inList && (
                                                                <span className="ml-0.5" title="Στη λίστα">
                                                                    <Check className="h-4 w-4 text-success-500" />
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {/* ── Footer: pagination (catalog mode only) ─ */}
                        {!isSearchMode && !isLoading && !catalogError && products.length > 0 && (
                            <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 px-5 py-4 sm:flex-row dark:border-gray-800">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Εμφάνιση{" "}
                                    <span className="font-medium text-gray-700 dark:text-gray-200">
                                        {rangeStart.toLocaleString("el-GR")}–{rangeEnd.toLocaleString("el-GR")}
                                    </span>{" "}
                                    από{" "}
                                    <span className="font-medium text-gray-700 dark:text-gray-200">
                                        {totalCount.toLocaleString("el-GR")}
                                    </span>
                                </p>
                                <Pagination
                                    currentPage={page}
                                    totalPages={totalPages}
                                    onPageChange={handlePageChange}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-full xl:w-1/4">
                    <div className="sticky top-24 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                                    Αίτηση Ανατροφοδοσίας
                                </h3>
                                <p className="mt-0.5 text-theme-xs text-gray-400">
                                    {branchLabel}
                                </p>
                            </div>
                            {restockList.length > 0 && (
                                <Badge variant="light" size="sm" color="primary">
                                    {restockList.length}
                                </Badge>
                            )}
                        </div>

                        {restockList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center px-5 py-12 text-gray-400">
                                <Package className="mb-2 h-8 w-8" />
                                <p className="text-sm">Η λίστα είναι κενή.</p>
                                <p className="mt-1 text-center text-theme-xs">
                                    Εισάγετε ποσότητα δίπλα σε ένα προϊόν και πατήστε +
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="max-h-[calc(100vh-22rem)] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
                                    {restockList.map((entry) => (
                                        <div
                                            key={entry.mtrl}
                                            className="flex items-start gap-3 px-5 py-3"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                                    {entry.code}
                                                </p>
                                                <p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">
                                                    {entry.name}
                                                </p>
                                                <div className="mt-1.5 flex items-center gap-2">
                                                    <div className="flex items-center rounded border border-gray-200 dark:border-gray-700">
                                                        <button
                                                            onClick={() => updateRestockQty(entry.mtrl, entry.qty - 1)}
                                                            className="px-2 py-0.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
                                                        >
                                                            −
                                                        </button>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            value={entry.qty}
                                                            onChange={(e) =>
                                                                updateRestockQty(entry.mtrl, parseInt(e.target.value) || 1)
                                                            }
                                                            className="w-12 border-x border-gray-200 bg-transparent py-0.5 text-center text-xs tabular-nums text-gray-700 focus:outline-none dark:border-gray-700 dark:text-gray-200"
                                                        />
                                                        <button
                                                            onClick={() => updateRestockQty(entry.mtrl, entry.qty + 1)}
                                                            className="px-2 py-0.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                    <span className="text-theme-xs text-gray-400">τεμ.</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeFromRestockList(entry.mtrl)}
                                                className="mt-1 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-error-500 dark:hover:bg-error-500/10"
                                                title="Αφαίρεση"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Summary + Submit */}
                                <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">
                                    <div className="mb-3 flex items-center justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Σύνολο ειδών</span>
                                        <span className="font-medium text-gray-800 dark:text-white/90">
                                            {restockList.length}
                                        </span>
                                    </div>
                                    <div className="mb-4 flex items-center justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Σύνολο τεμαχίων</span>
                                        <span className="font-medium text-gray-800 dark:text-white/90">
                                            {restockList.reduce((sum, e) => sum + e.qty, 0)}
                                        </span>
                                    </div>

                                    {submitted ? (
                                        <div className="flex items-center justify-center gap-2 rounded-lg bg-success-50 py-2.5 text-sm font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">
                                            <Check className="h-4 w-4" />
                                            Υποβλήθηκε επιτυχώς!
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleSubmit}
                                            disabled={submitting}
                                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                                        >
                                            {submitting ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Send className="h-4 w-4" />
                                            )}
                                            Υποβολή Αιτήματος
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
