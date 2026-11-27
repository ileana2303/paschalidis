import type { AuthPermissions } from "@/lib/auth/types";
import { normalizeBranchCode } from "@/lib/auth/branches";
import { ANATROF_SUPPLYING_BRANCH } from "@/lib/orders/anatrof/anatrof-constants";

export const NO_ACCESS_PATH = "/no-access";
export const PICKING_LIST_STATUS_PATH = "/picking-list-status";

const MODULE_ROUTES: ReadonlyArray<{ path: string; modules: string[] }> = [
  { path: "/search-customer", modules: ["search-customer"] },
  { path: "/search-parts", modules: ["search-parts"] },
  { path: "/basket", modules: ["basket-trdr"] },
  { path: "/search-set-similar", modules: ["set-similar"] },
  { path: "/edit-items", modules: ["edit-items"] },
  { path: "/suffix-management", modules: ["suffix-management"] },
  { path: "/group-management", modules: ["group-management"] },
  { path: "/b2b-management", modules: ["b2b-management"] },
  { path: "/suppliers-list", modules: ["suppliers-list"] },
  { path: "/stock-feedback", modules: ["stock-feedback"] },
  { path: "/stock-list", modules: ["stock-list"] },
  { path: "/endo/endo-parts", modules: ["endo-parts"] },
  { path: "/endo/endo-lists-received", modules: ["endo-lists-received"] },
  { path: "/endo/endo-lists-requested", modules: ["endo-lists-requested"] },
  {
    path: "/endo/endo-lists",
    modules: ["endo-lists-received", "endo-lists-requested"],
  },
  { path: "/all-baskets", modules: ["all-baskets"] },
  { path: "/basket-history", modules: ["all-baskets"] },
  { path: "/supplier-price-catalog-upload", modules: ["supplier-price-catalog-upload"] },
  { path: "/picking-list", modules: ["picking-list"] },
  { path: PICKING_LIST_STATUS_PATH, modules: ["picking-list-status"] },
  { path: "/company-stock", modules: ["company-stock"] },
  { path: "/company-stock-requests", modules: ["company-stock-requests"] },
  { path: "/stock-requests", modules: ["stock-requests"] },
  { path: "/price-requests", modules: ["price-requests"] },
  { path: "/base-price-pur", modules: ["base-price-pur"] },
  { path: "/price-tiers", modules: ["price-tiers"] },
  { path: "/users-list", modules: ["users-list"] },
  { path: "/users", modules: ["users-list"] },
];

/** Menu group labels for module `parent` codes; `menu` is the top level. */
export const MODULE_GROUP_LABELS: Record<string, string> = {
  menu: "Κεντρικό μενού",
  "warehouse-management": "Επεξεργασία Αποθήκης",
  anatrofodosia: "Ανατροφοδοσία",
  endodiakinisi: "Ενδοδιακίνηση",
  picking: "Picking",
  "company-management": "Διαχείριση",
};

export const MODULE_GROUP_SIDEBAR_ORDER = [
  "menu",
  "warehouse-management",
  "anatrofodosia",
  "endodiakinisi",
  "picking",
  "company-management",
] as const;

export const MODULE_SIDEBAR_ORDER = [
  "search-customer",
  "search-parts",
  "all-baskets",
  "picking-list",
  "picking-list-status",
  "set-similar",
  "edit-items",
  "suffix-management",
  "group-management",
  "b2b-management",
  "suppliers-list",
  "stock-feedback",
  "stock-list",
  "endo-parts",
  "endo-lists-received",
  "endo-lists-requested",
  "company-stock",
  "company-stock-requests",
  "stock-requests",
  "price-requests",
  "supplier-price-catalog-upload",
  "base-price-pur",
  "price-tiers",
] as const;

const FEATURE_PARENTS: Record<string, string> = {
  "picked-it-up": "picking-list",
  "anatrof-card": "search-parts",
  "expand-details": "search-parts",
  prices: "search-parts",
  "request-price": "search-parts",
  statistics: "search-parts",
  "stock-branch-meta": "search-parts",
  "create-user": "users-list",
  "edit-user": "users-list",
  "manage-perms": "users-list",
};

type PermissionCodes = Pick<AuthPermissions, "modules" | "features">;

export function hasPermission(
  permissions: PermissionCodes | null | undefined,
  code: string
): boolean {
  if (!permissions) return false;
  if (permissions.modules.includes(code)) return true;
  if (!permissions.features.includes(code)) return false;

  const parent = FEATURE_PARENTS[code];
  return !parent || permissions.modules.includes(parent);
}

export function isPathAvailableForBranch(
  pathname: string,
  activeBranch: string | null
): boolean {
  const isStockRequests =
    pathname === "/stock-requests" || pathname.startsWith("/stock-requests/");

  return !isStockRequests ||
    normalizeBranchCode(activeBranch) === String(ANATROF_SUPPLYING_BRANCH);
}

/** The server proxy checks modules. The UI also supplies the active branch. */
export function canAccessPath(
  permissions: PermissionCodes | null | undefined,
  pathname: string,
  activeBranch?: string | null
): boolean {
  if (activeBranch !== undefined && !isPathAvailableForBranch(pathname, activeBranch)) {
    return false;
  }

  const route = MODULE_ROUTES.find(
    ({ path }) => pathname === path || pathname.startsWith(`${path}/`)
  );
  if (!route) return true;

  return route.modules.some((code) => permissions?.modules.includes(code) ?? false);
}

export function getFirstAllowedPath(
  permissions: PermissionCodes | null | undefined,
  activeBranch?: string | null
): string {
  const route = MODULE_ROUTES.find(({ path }) =>
    canAccessPath(permissions, path, activeBranch)
  );

  return route?.path ?? NO_ACCESS_PATH;
}

function toActiveCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const codes = value.flatMap((entry) => {
    if (typeof entry === "string") return [entry.trim()];
    if (entry && typeof entry === "object") {
      const { code, isActive } = entry as { code?: unknown; isActive?: unknown };
      if (typeof code === "string" && Number(isActive ?? 1) === 1) {
        return [code.trim()];
      }
    }
    return [];
  });

  return Array.from(new Set(codes.filter(Boolean)));
}

/** Normalizes login permissions into lists of active codes. */
export function normalizeAuthPermissions(value: unknown): AuthPermissions {
  const permissions = (value ?? {}) as Partial<Record<keyof AuthPermissions, unknown>>;

  return {
    modules: toActiveCodes(permissions.modules),
    features: toActiveCodes(permissions.features),
    branches: toActiveCodes(permissions.branches),
  };
}
