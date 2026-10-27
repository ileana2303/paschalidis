/**
 * Static allowedRights snapshot from SiteData.Items/listPerms.
 * Update when the upstream catalog changes (proxy uses this without calling SoftOne).
 */
export const MODULE_ALLOWED_RIGHTS: Record<string, number> = {
    "search-customer": 17,
    "search-parts": 17,
    "search-set-similar": 15,
    "edit-items": 5,
    "stock-feedback": 19,
    "endo-parts-lists": 39,
    "all-baskets": 29,
    "stock-requests": 53,
    "price-requests": 53,
};

export const FEATURE_ALLOWED_RIGHTS: Record<string, number> = {
    "part-results": 17,
    "stock-branch-meta": 1,
    "request-price": 3,
    "endo-stock-cards": 3,
};

export const BRANCH_ALLOWED_RIGHTS: Record<string, number> = {
    "1000": 1,
    "1006": 1,
    "1007": 1,
};

export const INACTIVE_MODULE_CODES = new Set<string>();
export const INACTIVE_BRANCH_CODES = new Set<string>();
