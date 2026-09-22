import type { IItem } from "@/lib/interface";
import { parseSoftOneNumber } from "@/lib/utils/number";

interface PartCardPriceLadderProps {
    item: IItem;
    formatPrice: (price: number | string | null | undefined) => string;
    activeLabel?: string | null;
}

type LadderRow = {
    label: string;
    raw: string | number | null | undefined;
    variant?: "default" | "cost";
};

export default function PartCardPriceLadder({
    item,
    formatPrice,
    activeLabel = null,
}: PartCardPriceLadderProps) {
    const rows: LadderRow[] = [
        { label: "Τιμοκ. 01", raw: item.PRICEW01 },
        { label: "Τιμοκ. 02", raw: item.PRICEW02 },
        { label: "Τιμοκ. 03", raw: item.PRICEW03 },
        { label: "Τιμοκ. 04", raw: item.PRICEW04 },
        { label: "Τιμοκ. 05", raw: item.PRICEW05 },
        { label: "Λιανική", raw: item.PRICE_RETAIL },
        { label: "Κόστος", raw: item.STANDCOST, variant: "cost" },
    ];

    const values = rows.map((row) => parseSoftOneNumber(row.raw) ?? 0);
    const max = Math.max(...values, Number.EPSILON);

    return (
        <div className="flex min-w-0 flex-col gap-2">
            {rows.map((row, index) => {
                const value = values[index];
                const widthPct = Math.min(100, (value / max) * 100);
                const isActive = activeLabel != null && row.label === activeLabel;
                const fillClass =
                    row.variant === "cost"
                        ? isActive
                            ? "bg-amber-600 dark:bg-amber-300"
                            : "bg-amber-500 dark:bg-amber-400"
                        : isActive
                            ? "bg-brand-600 dark:bg-brand-300"
                            : "bg-brand-500 dark:bg-brand-400";

                return (
                    <div
                        key={row.label}
                        className={`flex min-w-0 items-center gap-2 rounded-lg sm:gap-3 ${
                            isActive
                                ? "bg-brand-50/80 px-2 py-1 ring-1 ring-inset ring-brand-300 dark:bg-brand-500/10 dark:ring-brand-500/40"
                                : ""
                        }`}
                    >
                        <span
                            className={`w-[4.25rem] shrink-0 text-[10px] leading-tight sm:w-[4.5rem] ${
                                isActive
                                    ? "font-semibold text-brand-700 dark:text-brand-300"
                                    : "text-gray-400"
                            }`}
                            title={row.label}
                        >
                            {row.label}
                        </span>

                        <div className="min-w-0 flex-1">
                            <div
                                className={`h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 ${
                                    isActive ? "ring-1 ring-brand-400/60 dark:ring-brand-400/50" : ""
                                }`}
                                role="presentation"
                            >
                                <div
                                    className={`h-full rounded-full ${fillClass} ${
                                        value > 0 ? "" : "opacity-0"
                                    }`}
                                    style={{ width: `${widthPct}%` }}
                                />
                            </div>
                        </div>

                        <span
                            className={`w-[3.75rem] shrink-0 text-right text-xs tabular-nums sm:w-[4.25rem] ${
                                isActive
                                    ? "font-semibold text-brand-800 dark:text-brand-200"
                                    : "text-gray-700 dark:text-gray-300"
                            }`}
                        >
                            {formatPrice(row.raw)}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
