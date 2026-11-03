import type { PriceTierValue } from "@/lib/price-tiers/grid";

export const PRICE_TIER_TONES: Record<PriceTierValue, string> = {
    "0": "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/30",
    "1": "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/30",
    "2": "bg-green-50 text-green-800 ring-green-200 dark:bg-green-500/10 dark:text-green-200 dark:ring-green-500/30",
    "3": "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30",
    "4": "bg-orange-50 text-orange-800 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-200 dark:ring-orange-500/30",
    "5": "bg-red-50 text-red-800 ring-red-200 dark:bg-red-500/10 dark:text-red-200 dark:ring-red-500/30",
    "99": "bg-violet-50 text-violet-800 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-200 dark:ring-violet-500/30",
};

export function getPriceTierTone(value: string) {
    return PRICE_TIER_TONES[value as PriceTierValue]
        ?? "bg-gray-50 text-gray-800 ring-gray-200 dark:bg-gray-900 dark:text-gray-100 dark:ring-gray-700";
}
