import { Check, ChevronDown, Loader2 } from "@/lib/icons/lucide";
import { isPriceTierValue, PRICE_TIER_OPTIONS } from "@/lib/price-tiers/grid";
import type { PriceTierCell as PriceTierCellData } from "@/lib/price-tiers/types";
import { getPriceTierTone } from "@/components/price-tiers/price-tier-visuals";

export type PriceTierCellStatus = "idle" | "saving" | "saved" | "failed";

interface PriceTierCellProps {
    cell: PriceTierCellData;
    /** The tier on screen: the one being saved while a save is in flight. */
    value: string;
    status: PriceTierCellStatus;
    onChange: (tier: string) => void;
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
            className={[
                "relative inline-block w-full max-w-[7.5rem] text-left",
                cell.isActive ? "" : "opacity-60",
            ].join(" ")}
            title={cell.lastUser ? `Τελευταία αλλαγή: ${cell.lastUser}` : undefined}
        >
            <select
                value={value}
                disabled={isSaving}
                onChange={(event) => onChange(event.target.value)}
                aria-label={`Βαθμίδα ${cell.mtrCode} × ${cell.trdCode}`}
                aria-busy={isSaving}
                className={[
                    "h-9 w-full min-w-0 cursor-pointer appearance-none rounded-md py-1 pl-2 pr-6 text-center text-sm font-bold tabular-nums ring-inset transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-wait",
                    getPriceTierTone(value),
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

            <span className="pointer-events-none absolute right-1.5 top-0 flex h-9 items-center text-gray-500 dark:text-gray-400">
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
