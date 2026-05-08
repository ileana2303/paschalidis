import type { ReactNode } from "react";

export interface BasketItemMetaEntry {
    label: ReactNode;
    value: ReactNode;
}

interface BasketListItemProps {
    title: ReactNode;
    subtitle?: ReactNode;
    status?: ReactNode;
    quantity?: ReactNode;
    quantityLabel?: ReactNode;
    meta?: BasketItemMetaEntry[];
    footer?: ReactNode;
    actions?: ReactNode;
    leading?: ReactNode;
    selected?: boolean;
    disabled?: boolean;
    children?: ReactNode;
    className?: string;
}

function BasketItemQuantity({
    label = "ΠΟΣΟΤΗΤΑ",
    value,
}: {
    label?: ReactNode;
    value: ReactNode;
}) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-semibold tabular-nums text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
            {label && (
                <span className="text-[10px] uppercase tracking-[0.14em] opacity-75">
                    {label}:
                </span>
            )}
            <span>{value}</span>
        </span>
    );
}

function BasketItemMeta({ items }: { items: BasketItemMetaEntry[] }) {
    if (items.length === 0) {
        return null;
    }

    return (
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-500">
            {items.map((item, index) => (
                <span key={index} className="min-w-0">
                    {item.label}: {" "}
                    <span className="font-medium text-gray-700 dark:text-white/90">
                        {item.value}
                    </span>
                </span>
            ))}
        </div>
    );
}

export default function BasketListItem({
    title,
    subtitle,
    status,
    quantity,
    quantityLabel,
    meta = [],
    footer,
    actions,
    leading,
    selected = true,
    disabled = false,
    children,
    className = "",
}: BasketListItemProps) {
    return (
        <article
            className={[
                "group rounded-xl border p-3 transition-all",
                selected
                    ? "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40"
                    : "border-gray-200 bg-gray-50/50 opacity-60 dark:border-gray-800 dark:bg-gray-900/40",
                disabled ? "pointer-events-none opacity-60" : "",
                className,
            ].join(" ")}
        >
            <div className="flex items-start gap-2">
                {leading}
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-700 dark:text-white/90">
                                {title}
                            </p>
                            {subtitle && (
                                <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                                    {subtitle}
                                </p>
                            )}
                        </div>

                        {(status || actions) && (
                            <div className="flex shrink-0 items-start gap-2">
                                {status}
                                {actions}
                            </div>
                        )}
                    </div>

                    {quantity != null && (
                        <div className="mt-3">
                            <BasketItemQuantity label={quantityLabel} value={quantity} />
                        </div>
                    )}

                    <BasketItemMeta items={meta} />

                    {footer && (
                        <div className="mt-3 border-t border-gray-200 pt-3 text-[11px] text-gray-500 dark:border-gray-800">
                            {footer}
                        </div>
                    )}

                    {children}
                </div>
            </div>
        </article>
    );
}
