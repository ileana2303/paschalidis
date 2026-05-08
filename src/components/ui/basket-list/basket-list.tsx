import type { ReactNode } from "react";

interface BasketListProps {
    title: ReactNode;
    count?: number;
    countLabel?: ReactNode;
    actions?: ReactNode;
    emptyTitle: ReactNode;
    emptyDescription?: ReactNode;
    emptyIcon?: ReactNode;
    children?: ReactNode;
    className?: string;
    listClassName?: string;
}

function BasketListEmptyState({
    icon,
    title,
    description,
}: {
    icon?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
}) {
    return (
        <div className="mt-4 rounded-2xl border border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
            {icon && (
                <div className="mx-auto flex h-8 w-8 items-center justify-center text-gray-300 dark:text-gray-600">
                    {icon}
                </div>
            )}
            <p className="mt-3 text-sm text-gray-400">{title}</p>
            {description && (
                <p className="mt-1 text-xs text-gray-400">{description}</p>
            )}
        </div>
    );
}

export default function BasketList({
    title,
    count,
    countLabel,
    actions,
    emptyTitle,
    emptyDescription,
    emptyIcon,
    children,
    className = "",
    listClassName = "",
}: BasketListProps) {
    const isEmpty = count === 0;

    return (
        <section className={["mt-5", className].join(" ")}>
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {title}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                    {actions}
                    {count != null && count > 0 && (
                        <span className="text-xs text-gray-400">
                            {countLabel ?? count}
                        </span>
                    )}
                </div>
            </div>

            {isEmpty ? (
                <BasketListEmptyState
                    icon={emptyIcon}
                    title={emptyTitle}
                    description={emptyDescription}
                />
            ) : (
                <div className={["mt-4 space-y-3", listClassName].join(" ")}>
                    {children}
                </div>
            )}
        </section>
    );
}
