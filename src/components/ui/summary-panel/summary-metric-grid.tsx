import type { ReactNode } from "react";

export type SummaryMetricTone = "default" | "brand" | "success" | "warning" | "danger";

export interface SummaryMetric {
    id: string;
    label: ReactNode;
    value: ReactNode;
    trailingValue?: ReactNode;
    tone?: SummaryMetricTone;
}

interface SummaryMetricGridProps {
    metrics: SummaryMetric[];
    columns?: 1 | 2;
    className?: string;
    compact?: boolean;
}

function getValueClassName(tone: SummaryMetricTone) {
    if (tone === "brand") {
        return "text-brand-600 dark:text-brand-300";
    }

    if (tone === "success") {
        return "text-green-700 dark:text-green-400";
    }

    if (tone === "warning") {
        return "text-amber-700 dark:text-amber-400";
    }

    if (tone === "danger") {
        return "text-red-700 dark:text-red-400";
    }

    return "text-gray-800 dark:text-white/90";
}

function SummaryMetricCard({
    metric,
    compact,
}: {
    metric: SummaryMetric;
    compact: boolean;
}) {
    return (
        <div
            className={[
                "min-w-0 border border-gray-200 dark:border-gray-800",
                compact
                    ? "rounded-xl bg-white px-3 py-2.5 dark:bg-gray-900/40"
                    : "rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/40",
            ].join(" ")}
        >
            <p className={`${compact ? "text-[10px] tracking-[0.14em]" : "text-xs tracking-[0.18em]"} truncate uppercase text-gray-500`}>
                {metric.label}
            </p>
            <p
                className={[
                    compact
                        ? "mt-1 break-words text-lg font-semibold tabular-nums 2xl:text-xl"
                        : "mt-2 break-words text-2xl font-semibold tabular-nums",
                    getValueClassName(metric.tone ?? "default"),
                ].join(" ")}
            >
                {metric.value}
                {metric.trailingValue && (
                    <span className="text-sm font-normal text-gray-400">
                        {metric.trailingValue}
                    </span>
                )}
            </p>
        </div>
    );
}

export default function SummaryMetricGrid({
    metrics,
    columns = 2,
    className = "",
    compact = false,
}: SummaryMetricGridProps) {
    if (metrics.length === 0) {
        return null;
    }

    return (
        <div
            className={[
                compact ? "mt-3 grid min-w-0 gap-2" : "mt-5 grid min-w-0 gap-3",
                columns === 1 ? "grid-cols-1" : "grid-cols-2",
                className,
            ].join(" ")}
        >
            {metrics.map((metric) => (
                <SummaryMetricCard key={metric.id} metric={metric} compact={compact} />
            ))}
        </div>
    );
}
