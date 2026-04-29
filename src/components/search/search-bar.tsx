"use client";

import type { KeyboardEvent, RefObject } from "react";
import { Search, X } from "@/app/lib/lucide";

interface SearchBarProps {
    value: string;
    placeholder: string;
    onChange: (value: string) => void;
    onSearch: () => void;
    onClear: () => void;
    loading?: boolean;
    inputRef?: RefObject<HTMLInputElement | null>;
    containerClassName?: string;
    inputClassName?: string;
    searchButtonClassName?: string;
    searchAriaLabel?: string;
    clearAriaLabel?: string;
    clearOnFocus?: boolean;
}

const DEFAULT_CONTAINER_CLASSES = "flex items-center gap-2";
const DEFAULT_INPUT_CLASSES =
    "w-full rounded-full border bg-gray-50 px-4 py-3 pr-11 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-100 focus:bg-gradient-to-b from-brand-50/10 to-brand-50/40 focus:outline-none focus:ring-brand-200/40 dark:bg-gray-900 dark:text-white";
const DEFAULT_SEARCH_BUTTON_CLASSES =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white";

export default function SearchBar({
    value,
    placeholder,
    onChange,
    onSearch,
    onClear,
    loading = false,
    inputRef,
    containerClassName = "",
    inputClassName = "",
    searchButtonClassName = "",
    searchAriaLabel = "Αναζήτηση",
    clearAriaLabel = "Καθαρισμός αναζήτησης",
    clearOnFocus = true,
}: SearchBarProps) {
    const hasValue = value.trim().length > 0;

    const inputClasses = [
        DEFAULT_INPUT_CLASSES,
        hasValue ? "border-brand-500 ring-0.5 ring-brand-300/60" : "border-gray-300 shadow-sm hover:shadow-md",
        inputClassName,
    ]
        .filter(Boolean)
        .join(" ");

    const buttonClasses = [DEFAULT_SEARCH_BUTTON_CLASSES, searchButtonClassName]
        .filter(Boolean)
        .join(" ");

    const containerClasses = [DEFAULT_CONTAINER_CLASSES, containerClassName]
        .filter(Boolean)
        .join(" ");

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            onSearch();
        }
    };

    return (
        <div className={containerClasses}>
            <div className="relative min-w-0 flex-1">
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    onFocus={() => {
                        if (clearOnFocus && value) {
                            onChange("");
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className={inputClasses}
                />

                {hasValue && (
                    <button
                        type="button"
                        onClick={onClear}
                        aria-label={clearAriaLabel}
                        className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            <button
                type="button"
                onClick={onSearch}
                aria-label={searchAriaLabel}
                className={buttonClasses}
            >
                {loading ? (
                    <span
                        aria-hidden="true"
                        className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                    />
                ) : (
                    <>
                        <Search className="h-5 w-5" />
                    </>
                )}
            </button>
        </div>
    );
}
