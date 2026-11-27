interface PermissionGroupVisual {
    badge: string;
    selectedBadge: string;
    rowBorder: string;
}

const DEFAULT_GROUP_VISUAL: PermissionGroupVisual = {
    badge:
        "bg-white text-gray-600 ring-gray-300 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-800",
    selectedBadge:
        "bg-gray-900 text-white ring-gray-900 shadow-theme-xs dark:bg-white dark:text-gray-900 dark:ring-white",
    rowBorder: "border-l-transparent",
};

const PERMISSION_GROUP_VISUALS: Record<string, PermissionGroupVisual> = {
    menu: {
        badge:
            "bg-sky-50 text-sky-800 ring-sky-200 hover:bg-sky-100 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/30 dark:hover:bg-sky-500/20",
        selectedBadge:
            "bg-sky-600 text-white ring-sky-600 shadow-theme-xs dark:bg-sky-500 dark:ring-sky-500",
        rowBorder: "border-l-sky-500 dark:border-l-sky-500",
    },
    "warehouse-management": {
        badge:
            "bg-emerald-50 text-emerald-800 ring-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/30 dark:hover:bg-emerald-500/20",
        selectedBadge:
            "bg-emerald-600 text-white ring-emerald-600 shadow-theme-xs dark:bg-emerald-500 dark:ring-emerald-500",
        rowBorder: "border-l-emerald-500 dark:border-l-emerald-500",
    },
    anatrofodosia: {
        badge:
            "bg-amber-50 text-amber-800 ring-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30 dark:hover:bg-amber-500/20",
        selectedBadge:
            "bg-amber-500 text-white ring-amber-500 shadow-theme-xs dark:bg-amber-500 dark:ring-amber-500",
        rowBorder: "border-l-amber-500 dark:border-l-amber-500",
    },
    endodiakinisi: {
        badge:
            "bg-violet-50 text-violet-800 ring-violet-200 hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-200 dark:ring-violet-500/30 dark:hover:bg-violet-500/20",
        selectedBadge:
            "bg-violet-600 text-white ring-violet-600 shadow-theme-xs dark:bg-violet-500 dark:ring-violet-500",
        rowBorder: "border-l-violet-500 dark:border-l-violet-500",
    },
    picking: {
        badge:
            "bg-indigo-50 text-indigo-800 ring-indigo-200 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-200 dark:ring-indigo-500/30 dark:hover:bg-indigo-500/20",
        selectedBadge:
            "bg-indigo-600 text-white ring-indigo-600 shadow-theme-xs dark:bg-indigo-500 dark:ring-indigo-500",
        rowBorder: "border-l-indigo-500 dark:border-l-indigo-500",
    },
    "company-management": {
        badge:
            "bg-rose-50 text-rose-800 ring-rose-200 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/30 dark:hover:bg-rose-500/20",
        selectedBadge:
            "bg-rose-600 text-white ring-rose-600 shadow-theme-xs dark:bg-rose-500 dark:ring-rose-500",
        rowBorder: "border-l-rose-500 dark:border-l-rose-500",
    },
};

export function getPermissionGroupVisual(groupCode?: string | null) {
    return groupCode
        ? PERMISSION_GROUP_VISUALS[groupCode] ?? DEFAULT_GROUP_VISUAL
        : DEFAULT_GROUP_VISUAL;
}
