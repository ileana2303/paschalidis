"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
    Loader2,
    PanelRightClose,
    PanelRightOpen,
} from "@/lib/icons/lucide";

export interface OrderSummaryMetric {
    id: string;
    label: ReactNode;
    value: ReactNode;
    trailingValue?: ReactNode;
}

export interface OrderSummaryInfoCard {
    label: ReactNode;
    title: ReactNode;
    description?: ReactNode;
}

export interface OrderSummaryProps {
    summaryLabel: ReactNode;
    summaryTitle: ReactNode;
    summaryHref?: string;
    headerActions?: ReactNode;
    infoCard?: OrderSummaryInfoCard;
    metrics?: OrderSummaryMetric[];
    loading?: boolean;
    error?: ReactNode;
    successMessage?: ReactNode;
    children?: ReactNode;
    footer?: ReactNode;
    collapsible?: boolean;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
    collapsedLabel?: string;
    collapseTitle?: string;
    asideClassName?: string;
    contentClassName?: string;
}

export function OrderSummary({
    summaryLabel,
    summaryTitle,
    summaryHref,
    headerActions,
    infoCard,
    metrics = [],
    loading = false,
    error,
    successMessage,
    children,
    footer,
    collapsible = false,
    collapsed = false,
    onToggleCollapse,
    collapsedLabel = "Εμφάνιση σύνοψης",
    collapseTitle = "Απόκρυψη σύνοψης",
    asideClassName = "",
    contentClassName = "",
}: OrderSummaryProps) {
    if (collapsible && collapsed) {
        return (
            <aside className="hidden shrink-0 xl:flex">
                <button
                    type="button"
                    onClick={onToggleCollapse}
                    aria-label={collapsedLabel}
                    className="mt-6 flex h-8 w-8 items-center justify-center self-start rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                >
                    <PanelRightOpen className="h-4 w-4" />
                </button>
            </aside>
        );
    }

    const heading = (
        <>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-500">
                {summaryLabel}
            </p>
            <h3 className="mt-2 text-lg font-semibold text-gray-800 transition group-hover/link:text-brand-500 dark:text-white/90 dark:group-hover/link:text-brand-400">
                {summaryTitle}
            </h3>
        </>
    );

    return (
        <aside
            className={`min-h-[280px] w-full xl:min-h-0 xl:basis-1/3 xl:min-w-[320px] ${asideClassName}`}
        >
            <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="shrink-0 border-b border-gray-100 px-5 py-5 dark:border-gray-800">
                    <div className="flex items-start justify-between gap-3">
                        {summaryHref ? (
                            <Link href={summaryHref} className="group/link">
                                {heading}
                            </Link>
                        ) : (
                            <div>{heading}</div>
                        )}

                        {(headerActions || (collapsible && onToggleCollapse)) && (
                            <div className="flex items-center gap-1">
                                {headerActions}
                                {collapsible && onToggleCollapse && (
                                    <button
                                        type="button"
                                        onClick={onToggleCollapse}
                                        title={collapseTitle}
                                        aria-label={collapseTitle}
                                        className="hidden h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200 xl:flex"
                                    >
                                        <PanelRightClose className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className={`flex-1 overflow-y-auto px-5 py-5 ${contentClassName}`}>
                    {infoCard && (
                        <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4 dark:border-brand-500/20 dark:bg-brand-500/5">
                            <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-500">
                                {infoCard.label}
                            </p>
                            <p className="mt-2 font-semibold text-gray-800 dark:text-white/90">
                                {infoCard.title}
                            </p>
                            {infoCard.description && (
                                <p className="mt-1 text-sm text-gray-500">
                                    {infoCard.description}
                                </p>
                            )}
                        </div>
                    )}

                    {metrics.length > 0 && (
                        <div className="mt-5 grid grid-cols-2 gap-3">
                            {metrics.map((metric) => (
                                <div
                                    key={metric.id}
                                    className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40"
                                >
                                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                                        {metric.label}
                                    </p>
                                    <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                                        {metric.value}
                                        {metric.trailingValue && (
                                            <span className="text-sm font-normal text-gray-400">
                                                {metric.trailingValue}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {error && (
                        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
                            <p className="text-sm text-red-600 dark:text-red-400">
                                {error}
                            </p>
                        </div>
                    )}

                    {successMessage && (
                        <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-500/30 dark:bg-green-500/10">
                            <p className="text-sm text-green-700 dark:text-green-400">
                                {successMessage}
                            </p>
                        </div>
                    )}

                    {loading && (
                        <div className="mt-5 flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
                        </div>
                    )}

                    {children}
                </div>

                {footer && (
                    <div className="shrink-0 border-t border-gray-100 px-5 py-5 dark:border-gray-800">
                        {footer}
                    </div>
                )}
            </div>
        </aside>
    );
}

export default OrderSummary;
