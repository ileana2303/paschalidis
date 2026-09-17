export const Branch_AccentColors = {
    "1000": "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    "1006": "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    "1007": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
} as const;

export const FALLBACK_BRANCH_ACCENT =
    "bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-200";

export function getBranchColor(branchCode: string) {
    return Branch_AccentColors[
        branchCode as keyof typeof Branch_AccentColors
    ] ?? FALLBACK_BRANCH_ACCENT;
}

export const Branch_DotColors = {
    "1000": "bg-sky-500",
    "1006": "bg-emerald-500",
    "1007": "bg-amber-500",
} as const;

export const Fallback_DotColor = "bg-gray-400";

export function getBranchDotColor(branchCode: string) {
    return Branch_DotColors[
        branchCode as keyof typeof Branch_DotColors
    ] ?? Fallback_DotColor;
}

export const Branch_CardStyles = {
    "1000": {
        card: "border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950",
        icon: "bg-sky-200 text-sky-700 dark:bg-sky-900 dark:text-sky-300",
        badge: "border-sky-200 bg-white text-sky-800 dark:border-sky-700 dark:bg-sky-900 dark:text-sky-200",
        value: "text-sky-950 dark:text-sky-100",
    },
    "1006": {
        card: "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950",
        icon: "bg-emerald-200 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
        badge: "border-emerald-200 bg-white text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900 dark:text-emerald-200",
        value: "text-emerald-950 dark:text-emerald-100",
    },
    "1007": {
        card: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950",
        icon: "bg-amber-200 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
        badge: "border-amber-200 bg-white text-amber-800 dark:border-amber-700 dark:bg-amber-900 dark:text-amber-200",
        value: "text-amber-950 dark:text-amber-100",
    },
} as const;
