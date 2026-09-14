"use client";

import type { ReactNode } from "react";

export interface SummaryFormFieldProps {
    label: ReactNode;
    icon?: ReactNode;
    htmlFor?: string;
    className?: string;
    children: ReactNode;
}

export default function SummaryFormField({
    label,
    icon,
    htmlFor,
    className = "",
    children,
}: SummaryFormFieldProps) {
    return (
        <div className={className}>
            <label
                htmlFor={htmlFor}
                className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
                {icon && <span className="text-gray-400">{icon}</span>}
                {label}
            </label>
            {children}
        </div>
    );
}
