import type { ReactNode } from "react";

type SummaryInfoCardVariant = "brand" | "neutral" | "warning";

interface SummaryInfoCardProps {
    label: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    icon?: ReactNode;
    variant?: SummaryInfoCardVariant;
    className?: string;
}

function getCardClassName(variant: SummaryInfoCardVariant) {
    if (variant === "warning") {
        return "border-amber-200 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/10";
    }

    if (variant === "neutral") {
        return "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40";
    }

    return "border-brand-100 bg-brand-50/70 dark:border-brand-500/20 dark:bg-brand-500/5";
}

function getLabelClassName(variant: SummaryInfoCardVariant) {
    if (variant === "warning") {
        return "text-amber-600 dark:text-amber-400";
    }

    if (variant === "neutral") {
        return "text-gray-500 dark:text-gray-400";
    }

    return "text-brand-500";
}

export default function SummaryInfoCard({
    label,
    title,
    description,
    icon,
    variant = "brand",
    className = "",
}: SummaryInfoCardProps) {
    return (
        <div
            className={[
                "rounded-2xl border p-4",
                getCardClassName(variant),
                className,
            ].join(" ")}
        >
            <div className="flex items-start gap-3">
                {icon && <div className="mt-0.5 shrink-0 text-gray-400">{icon}</div>}
                <div className="min-w-0">
                    <p
                        className={[
                            "text-xs font-medium uppercase tracking-[0.2em]",
                            getLabelClassName(variant),
                        ].join(" ")}
                    >
                        {label}
                    </p>
                    <p className="mt-2 font-semibold text-gray-800 dark:text-white/90">
                        {title}
                    </p>
                    {description && (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {description}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
