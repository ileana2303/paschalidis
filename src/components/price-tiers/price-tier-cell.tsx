import { Check, ChevronDown, Loader2 } from "@/lib/icons/lucide";
import { isPriceTierValue, PRICE_TIER_OPTIONS } from "@/lib/price-tiers/grid";
import type { PriceTierCell as PriceTierCellData } from "@/lib/price-tiers/types";

export type PriceTierCellStatus = "idle" | "saving" | "saved" | "failed";

interface PriceTierCellProps {
    cell: PriceTierCellData;
    /** The tier on screen: the one being saved while a save is in flight. */
    value: string;
    status: PriceTierCellStatus;
    onChange: (tier: string) => void;
}

// Tier 0 (χονδρική) is the normal default, so it stays neutral rather than
// looking like a missing or erroneous value.
function getTierTone(value: string) {
    if (value === "99") {
        return "bg-violet-50 text-violet-800 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-200 dark:ring-violet-500/30";
    }

    if (value === "0") {
        return "bg-white text-gray-800 ring-gray-200 dark:bg-gray-900 dark:text-gray-100 dark:ring-gray-700";
    }

    return "bg-brand-50 text-brand-800 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-200 dark:ring-brand-500/30";
}

function getStatusRing(status: PriceTierCellStatus) {
    if (status === "saved") return "ring-2 ring-success-500 dark:ring-success-400";
    if (status === "failed") return "ring-2 ring-error-500 dark:ring-error-400";
    return "ring-1";
}

export default function PriceTierCell({
    cell,
    value,
    status,
    onChange,
}: PriceTierCellProps) {
    const isSaving = status === "saving";

    return (
        <div
            className={["relative", cell.isActive ? "" : "opacity-60"].join(" ")}
            title={cell.lastUser ? `Τελευταία αλλαγή: ${cell.lastUser}` : undefined}
        >
            <select
                value={value}
                disabled={isSaving}
                onChange={(event) => onChange(event.target.value)}
                aria-label={`Βαθμίδα ${cell.mtrCode} × ${cell.trdCode}`}
                aria-busy={isSaving}
                className={[
                    "h-11 w-full min-w-[8.5rem] cursor-pointer appearance-none rounded-lg py-2 pl-3 pr-8 text-sm font-semibold tabular-nums ring-inset transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-wait",
                    getTierTone(value),
                    getStatusRing(status),
                ].join(" ")}
            >
                {!isPriceTierValue(value) && (
                    <option value={value} disabled>
                        {value || "—"} · μη αποδεκτή
                    </option>
                )}
                {PRICE_TIER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.value} · {option.label}
                    </option>
                ))}
            </select>

            <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-gray-500 dark:text-gray-400">
                {isSaving ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : status === "saved" ? (
                    <Check className="size-4 text-success-600 dark:text-success-400" aria-hidden="true" />
                ) : (
                    <ChevronDown className="size-4" aria-hidden="true" />
                )}
            </span>

            {!cell.isActive && (
                <span className="mt-1 block text-[11px] text-gray-500 dark:text-gray-400">
                    Ανενεργό
                </span>
            )}

            <span className="sr-only" aria-live="polite">
                {isSaving ? "Αποθήκευση…" : status === "saved" ? "Αποθηκεύτηκε" : ""}
            </span>
        </div>
    );
}
