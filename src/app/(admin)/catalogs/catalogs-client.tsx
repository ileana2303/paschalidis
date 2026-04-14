"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2, Package, Search } from "lucide-react";
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
import type { IProduct } from "@/app/lib/interface";

const PAGE_SIZE = 100;

export default function CatalogsClient() {
    // ── Data state ─────────────────────────────────────────
    const [products, setProducts] = useState<IProduct[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // ── UI state ───────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const [exporting, setExporting] = useState(false);

    // ── Fetch products when page changes ───────────────────
    const loadPage = useCallback(async (targetPage: number) => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetchCatalogProducts(targetPage, PAGE_SIZE);
            setProducts(res.data);
            setPage(res.page);
            setTotalPages(res.totalPages);
            setTotalCount(Number(res.totalCount));
        } catch {
            setError("Αποτυχία φόρτωσης προϊόντων. Δοκιμάστε ξανά.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPage(1);
    }, [loadPage]);

    // ── Client-side filtering on the loaded page ───────────
    const filteredProducts = useMemo(() => {
        let result = products;

        // Status filter
        if (statusFilter === "active") {
            result = result.filter((p) => p.soft1Active === "1");
        } else if (statusFilter === "inactive") {
            result = result.filter((p) => p.soft1Active === "0");
        }

        // Search filter (name or code)
        if (search.trim()) {
            const term = search.trim().toLowerCase();
            result = result.filter(
                (p) =>
                    p.name.toLowerCase().includes(term) ||
                    p.code.toLowerCase().includes(term)
            );
        }

        return result;
    }, [products, search, statusFilter]);

    // ── Page change handler ────────────────────────────────
    function handlePageChange(newPage: number) {
        if (newPage < 1 || newPage > totalPages || newPage === page) return;
        setSearch("");
        setStatusFilter("all");
        loadPage(newPage);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // ── CSV Export ─────────────────────────────────────────
    async function handleExport() {
        setExporting(true);

        try {
            // Export the currently filtered view
            const rows = filteredProducts;
            const header = ["MTRL", "Κωδικός", "Περιγραφή", "Τιμή (€)", "Κατάσταση", "Τελ. Τροποποίηση"];
            const csvRows = [
                header.join(";"),
                ...rows.map((p) =>
                    [
                        p.mtrl,
                        `"${p.code}"`,
                        `"${p.name}"`,
                        p.price,
                        p.soft1Active === "1" ? "Ενεργό" : "Ανενεργό",
                        p.modifiedDate,
                    ].join(";")
                ),
            ];

            const csvContent = "\uFEFF" + csvRows.join("\n");
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `catalog-page-${page}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } finally {
            setExporting(false);
        }
    }

    // ── Format helpers ─────────────────────────────────────
    function formatPrice(price: string) {
        const num = parseFloat(price);
        if (isNaN(num)) return price;
        return num.toLocaleString("el-GR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatDate(dateStr: string) {
        if (!dateStr) return "—";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" });
    }

    // ── Computed values ────────────────────────────────────
    const rangeStart = (page - 1) * PAGE_SIZE + 1;
    const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);

    return (
        <div>
            <PageBreadcrumb pageTitle="Κατάλογοι" />

            {/* ── Toolbar ───────────────────────────────────── */}
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Left: search + filter */}
                <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                    {/* Search */}
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Αναζήτηση σε αυτή τη σελίδα…"
                            className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-700 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500"
                        />
                    </div>

                    {/* Status filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                        className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 shadow-theme-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    >
                        <option value="all">Όλες οι καταστάσεις</option>
                        <option value="active">Ενεργά</option>
                        <option value="inactive">Ανενεργά</option>
                    </select>
                </div>

                {/* Right: export + count */}
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {totalCount.toLocaleString("el-GR")} προϊόντα
                    </span>
                    <button
                        onClick={handleExport}
                        disabled={exporting || loading}
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-white/3"
                    >
                        {exporting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="h-4 w-4" />
                        )}
                        Εξαγωγή CSV
                    </button>
                </div>
            </div>

            {/* ── Table card ────────────────────────────────── */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                    </div>
                ) : error ? (
                    <div className="px-6 py-16 text-center">
                        <p className="text-sm text-error-500">{error}</p>
                        <button
                            onClick={() => loadPage(page)}
                            className="mt-3 text-sm font-medium text-brand-500 hover:underline"
                        >
                            Δοκιμάστε ξανά
                        </button>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Package className="mb-3 h-10 w-10" />
                        <p className="text-sm">
                            {search || statusFilter !== "all"
                                ? "Δεν βρέθηκαν αποτελέσματα με αυτά τα φίλτρα."
                                : "Δεν υπάρχουν προϊόντα."}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                                <TableRow>
                                    <TableCell isHeader className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                                        MTRL
                                    </TableCell>
                                    <TableCell isHeader className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                                        Κωδικός
                                    </TableCell>
                                    <TableCell isHeader className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                                        Περιγραφή
                                    </TableCell>
                                    <TableCell isHeader className="px-5 py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                                        Τιμή (€)
                                    </TableCell>
                                    <TableCell isHeader className="px-5 py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                                        Κατάσταση
                                    </TableCell>
                                    <TableCell isHeader className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                                        Τελ. Τροποποίηση
                                    </TableCell>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {filteredProducts.map((product) => (
                                    <TableRow
                                        key={product.mtrl}
                                        className="transition-colors hover:bg-gray-50 dark:hover:bg-white/2"
                                    >
                                        <TableCell className="whitespace-nowrap px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                                            {product.mtrl}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap px-5 py-3 text-sm font-medium text-gray-800 dark:text-white/90">
                                            {product.code}
                                        </TableCell>
                                        <TableCell className="max-w-xs px-5 py-3 text-sm text-gray-700 dark:text-gray-300">
                                            <span className="block truncate" title={product.name}>
                                                {product.name}
                                            </span>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap px-5 py-3 text-right text-sm tabular-nums text-gray-700 dark:text-gray-300">
                                            {formatPrice(product.price)}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap px-5 py-3 text-center">
                                            <Badge
                                                variant="light"
                                                size="sm"
                                                color={product.soft1Active === "1" ? "success" : "error"}
                                            >
                                                {product.soft1Active === "1" ? "Ενεργό" : "Ανενεργό"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                                            {formatDate(product.modifiedDate)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {/* ── Footer: range info + pagination ─────── */}
                {!loading && !error && products.length > 0 && (
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
                            {search && (
                                <span className="ml-1">
                                    ({filteredProducts.length} ταιριάζουν)
                                </span>
                            )}
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
    );
}
