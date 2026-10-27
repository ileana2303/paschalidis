/** Longest matching prefix wins (routes must be sorted by descending path length). */
const ROUTE_MODULE_PREFIXES: { prefix: string; moduleCode: string }[] = [
    { prefix: "/search-customer", moduleCode: "search-customer" },
    { prefix: "/search-parts", moduleCode: "search-parts" },
    { prefix: "/basket", moduleCode: "search-parts" },
    { prefix: "/search-set-similar", moduleCode: "search-set-similar" },
    { prefix: "/edit-items", moduleCode: "edit-items" },
    { prefix: "/stock-feedback", moduleCode: "stock-feedback" },
    { prefix: "/stock-list", moduleCode: "stock-feedback" },
    { prefix: "/endo", moduleCode: "endo-parts-lists" },
    { prefix: "/all-baskets", moduleCode: "all-baskets" },
    { prefix: "/stock-requests", moduleCode: "stock-requests" },
    { prefix: "/price-requests", moduleCode: "price-requests" },
].sort((a, b) => b.prefix.length - a.prefix.length);

export function normalizePathname(pathname: string) {
    const path = pathname.split("?")[0]?.split("#")[0] ?? "/";
    if (path.length > 1 && path.endsWith("/")) {
        return path.slice(0, -1);
    }
    return path || "/";
}

export function getModuleCodeForPath(pathname: string): string | null {
    const normalized = normalizePathname(pathname);

    for (const { prefix, moduleCode } of ROUTE_MODULE_PREFIXES) {
        if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
            return moduleCode;
        }
    }

    return null;
}
