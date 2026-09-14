"use client";

import type { ReactNode } from "react";
import SummaryFormField from "./summary-form-field";

export interface SummaryTextareaFieldProps {
    id: string;
    label: ReactNode;
    icon?: ReactNode;
    value: string;
    onChange?: (value: string) => void;
    rows?: number;
    placeholder?: string;
    fieldClassName?: string;
}

export default function SummaryTextareaField({
    id,
    label,
    icon,
    value,
    onChange,
    rows,
    placeholder,
    fieldClassName = "",
}: SummaryTextareaFieldProps) {
    return (
        <SummaryFormField
            label={label}
            icon={icon}
            htmlFor={id}
            className={fieldClassName}
        >
            <textarea
                id={id}
                value={value}
                onChange={(event) => onChange?.(event.target.value)}
                rows={rows}
                placeholder={placeholder}
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500"
            />
        </SummaryFormField>
    );
}
