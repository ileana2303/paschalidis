import Link from "next/link";
import type { ReactNode } from "react";
import {
    Loader2,
    PanelRightClose,
    PanelRightOpen,
} from "@/lib/icons/lucide";

export interface SummaryPanelProps {
    label: ReactNode;
    title: ReactNode;
    href?: string;
    actions?: ReactNode;
    children?: ReactNode;
    footer?: ReactNode;
    loading?: boolean;
    error?: ReactNode;
    successMessage?: ReactNode;
    collapsible?: boolean;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
    collapsedLabel?: string;
    collapseTitle?: string;
    asideClassName?: string;
    contentClassName?: string;
}

type SummaryPanelMessageTone = "error" | "success" | "warning" | "info";

interface SummaryPanelMessageProps {
    tone: SummaryPanelMessageTone;
    children: ReactNode;
    className?: string;
}

function getMessageClassName(tone: SummaryPanelMessageTone) {
    if (tone === "error") {
        return "border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400";
    }

    if (tone === "success") {
        return "border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400";
    }

    if (tone === "warning") {
        return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400";
    }

    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400";
}

export function SummaryPanelMessage({
    tone,
    children,
    className = "",
}: SummaryPanelMessageProps) {
    if (children == null || children === false) {
        return null;
    }

    return (
        <div
            className={[
                "mt-5 rounded-2xl border p-4 text-sm",
                getMessageClassName(tone),
                className,
            ].join(" ")}
        >
            {children}
        </div>
    );
}

export default function SummaryPanel({
    label,
    title,
    href,
    actions,
    children,
    footer,
    loading = false,
    error,
    successMessage,
    collapsible = false,
    collapsed = false,
    onToggleCollapse,
    collapsedLabel = "Εμφάνιση σύνοψης",
    collapseTitle = "Απόκρυψη σύνοψης",
    asideClassName = "",
    contentClassName = "",
}: SummaryPanelProps) {
    if (collapsible && collapsed) {
        return (
            <aside className={["hidden shrink-0 xl:flex", asideClassName].join(" ")}>
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
                {label}
            </p>
            <h3 className="mt-2 text-lg font-semibold text-gray-800 transition group-hover/link:text-brand-500 dark:text-white/90 dark:group-hover/link:text-brand-400">
                {title}
            </h3>
        </>
    );
    const hasHeaderActions = actions || (collapsible && onToggleCollapse);

    return (
        <aside
            className={[
                "min-h-[280px] w-full xl:min-h-0 xl:basis-1/3 xl:min-w-[320px]",
                asideClassName,
            ].join(" ")}
        >
            <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="shrink-0 border-b border-gray-100 px-5 py-5 dark:border-gray-800">
                    <div className="flex items-start justify-between gap-3">
                        {href ? (
                            <Link href={href} className="group/link">
                                {heading}
                            </Link>
                        ) : (
                            <div>{heading}</div>
                        )}

                        {hasHeaderActions && (
                            <div className="flex items-center gap-1">
                                {actions}
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

                <div className={["flex-1 overflow-y-auto px-5 py-5", contentClassName].join(" ")}>
                    {error && <SummaryPanelMessage tone="error">{error}</SummaryPanelMessage>}
                    {successMessage && (
                        <SummaryPanelMessage tone="success">
                            {successMessage}
                        </SummaryPanelMessage>
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
