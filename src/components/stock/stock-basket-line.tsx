import type { ReactNode } from "react";
import DataTableSelectionCheckbox from "@/components/ui/data-table/data-table-selection-checkbox";
import { Loader2, Trash2 } from "@/lib/icons/lucide";

interface StockBasketLineProps {
    idPrefix: string;
    code: string;
    name: string;
    quantity: number;
    mtrl: string;
    basketId: string;
    updating?: boolean;
    selected?: boolean;
    removing?: boolean;
    details?: ReactNode;
    onQuantityChange?: (quantity: number) => void;
    onToggleSelection?: () => void;
    onRemove?: () => void;
}

export default function StockBasketLine({
    idPrefix,
    code,
    name,
    quantity,
    mtrl,
    basketId,
    updating = false,
    selected = true,
    removing = false,
    details,
    onQuantityChange,
    onToggleSelection,
    onRemove,
}: StockBasketLineProps) {
    const normalizedQuantity =
        Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
    const quantityOptions = Array.from(
        { length: Math.max(100, normalizedQuantity) },
        (_, index) => index + 1
    );
    const quantitySelectId = `${idPrefix}-qty-${basketId}`;

    return (
        <div
            className={[
                "px-3 py-3 transition-opacity",
                selected ? "" : "opacity-60",
            ].join(" ")}
        >
            <div className="flex items-start gap-3">
                {(onToggleSelection || onRemove) && (
                    <div className="flex shrink-0 flex-col items-center gap-2 pt-1">
                        {onToggleSelection && (
                            <DataTableSelectionCheckbox
                                checked={selected}
                                onCheckedChange={onToggleSelection}
                                ariaLabel={selected ? "Αποεπιλογή" : "Επιλογή"}
                            />
                        )}
                        {onRemove && (
                            <button
                                type="button"
                                onClick={onRemove}
                                disabled={removing}
                                aria-label="Αφαίρεση"
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                            >
                                {removing ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                )}
                            </button>
                        )}
                    </div>
                )}
                <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <p
                            className="truncate font-mono text-sm font-bold tracking-wide text-gray-900 dark:text-white"
                            title={code || mtrl}
                        >
                            {code || mtrl}
                        </p>
                        <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-4 text-gray-500 dark:text-gray-400">
                            {name || "—"}
                        </p>
                    </div>
                    <div className="w-20 shrink-0">
                        <label
                            htmlFor={quantitySelectId}
                            className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400"
                        >
                            Ποσότητα
                        </label>
                        <select
                            id={quantitySelectId}
                            value={normalizedQuantity}
                            onChange={(event) =>
                                onQuantityChange?.(Number(event.target.value))
                            }
                            disabled={!onQuantityChange || updating || removing}
                            className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm font-semibold tabular-nums text-gray-800 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-500/40 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
                        >
                            {quantityOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            {details ? (
                <div className="mt-3 border-t border-gray-200 pt-3 text-[11px] text-gray-500 dark:border-gray-800">
                    {details}
                </div>
            ) : null}
        </div>
    );
}
