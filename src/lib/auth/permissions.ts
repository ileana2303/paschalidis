import type { AuthPermissions } from "@/lib/auth/types";

export const NO_ACCESS_PATH = "/no-access";

/**
 * Pages and the module code that unlocks them, in menu order. The first entry
 * the user may open is where login and the route guard send them.
 */
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
  { path: "/supplier-price-catalog-upload", modules: ["supplier-price-catalog-upload"] },
  { path: "/picking-list", modules: ["picking-list"] },
  { path: "/company-stock", modules: ["company-stock"] },
  { path: "/company-stock-requests", modules: ["company-stock-requests"] },
  { path: "/stock-requests", modules: ["stock-requests"] },
  { path: "/price-requests", modules: ["price-requests"] },
  { path: "/base-price-pur", modules: ["base-price-pur"] },
  { path: "/users-list", modules: ["users-list"] },
  { path: "/users", modules: ["users-list"] },
];

/** Menu group labels for module `parent` codes; `menu` is the top level. */
export const MODULE_GROUP_LABELS: Record<string, string> = {
  menu: "Κεντρικό μενού",
  "warehouse-management": "Επεξεργασία Αποθήκης",
  anatrofodosia: "Ανατροφοδοσία",
  endodiakinisi: "Ενδοδιακίνηση",
  "company-management": "Διαχείριση Καταστημάτων",
};

/** Feature code → the module (page) it lives in. */
const FEATURE_PARENTS: Record<string, string> = {
  "edit-b2b": "b2b-management",
  "edit-group": "group-management",
  "picked-it-up": "picking-list",
  "anatrof-card": "search-parts",
  "expand-details": "search-parts",
  prices: "search-parts",
  "request-price": "search-parts",
  statistics: "search-parts",
  "stock-branch-meta": "search-parts",
  "edit-suffix": "suffix-management",
  "create-user": "users-list",
  "edit-user": "users-list",
  "manage-perms": "users-list",
};

type PermissionCodes = Pick<AuthPermissions, "modules" | "features">;

/**
 * True when the code is one of the user's modules, or one of their features
 * whose parent module they also have.
 */
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

/** Pages not listed in MODULE_ROUTES (home, account, no-access) are not gated. */
export function canAccessPath(
  permissions: PermissionCodes | null | undefined,
  pathname: string
): boolean {
  const route = MODULE_ROUTES.find(
    ({ path }) => pathname === path || pathname.startsWith(`${path}/`)
  );
  if (!route) return true;

  return route.modules.some((code) => permissions?.modules.includes(code) ?? false);
}

export function getFirstAllowedPath(
  permissions: PermissionCodes | null | undefined
): string {
  const route = MODULE_ROUTES.find(({ modules }) =>
    modules.some((code) => permissions?.modules.includes(code))
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
