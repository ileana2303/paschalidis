export const BRANCH_ACCENT_BY_CODE = {
    "1000": "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    "1006": "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    "1007": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
} as const;

export const FALLBACK_BRANCH_ACCENT =
    "bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-200";

export function getBranchColor(branchCode: string) {
    return BRANCH_ACCENT_BY_CODE[
        branchCode as keyof typeof BRANCH_ACCENT_BY_CODE
    ] ?? FALLBACK_BRANCH_ACCENT;
}

export const BRANCH_DOT_BY_CODE = {
    "1000": "bg-sky-500",
    "1006": "bg-emerald-500",
    "1007": "bg-amber-500",
} as const;

export const FALLBACK_BRANCH_DOT = "bg-gray-400";

export function getBranchDotColor(branchCode: string) {
    return BRANCH_DOT_BY_CODE[
        branchCode as keyof typeof BRANCH_DOT_BY_CODE
    ] ?? FALLBACK_BRANCH_DOT;
}
