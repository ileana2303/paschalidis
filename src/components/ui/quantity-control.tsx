"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "@/lib/icons/lucide";

export type QuantityControlSize = "sm" | "md";

export interface QuantityControlProps {
    value: number;
    onChange: (nextValue: number) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    displayZeroAsEmpty?: boolean;
    fullWidth?: boolean;
    size?: QuantityControlSize;
    className?: string;
    placeholder?: string;
    inputLabel?: string;
    decrementLabel?: string;
    incrementLabel?: string;
    onBlur?: (currentValue: number) => void;
}

const SIZE_CLASSES: Record<
    QuantityControlSize,
    {
        rootCompact: string;
        rootFluid: string;
        button: string;
        input: string;
        icon: string;
    }
> = {
    sm: {
        rootCompact: "inline-grid grid-cols-[1.75rem_3.125rem_1.75rem]",
        rootFluid: "grid w-full grid-cols-[1.75rem_minmax(0,1fr)_1.75rem]",
        button: "h-7",
        input: "h-7 text-xs",
        icon: "h-3.5 w-3.5",
    },
    md: {
        rootCompact: "inline-grid grid-cols-[2rem_3.5rem_2rem]",
        rootFluid: "grid w-full grid-cols-[2rem_minmax(0,1fr)_2rem]",
        button: "h-8",
        input: "h-8 text-sm",
        icon: "h-3.5 w-3.5",
    },
};

function normalizeBoundary(value: number | undefined, fallback: number) {
    if (value == null || !Number.isFinite(value)) {
        return fallback;
    }

    return Math.floor(value);
}

function clampQuantity(value: number, min: number, max?: number) {
    const integerValue = Number.isFinite(value) ? Math.floor(value) : min;
    const minBoundedValue = Math.max(min, integerValue);

    return max == null ? minBoundedValue : Math.min(max, minBoundedValue);
}

function formatInputValue(value: number, displayZeroAsEmpty: boolean) {
    return displayZeroAsEmpty && value === 0 ? "" : String(value);
}

function sanitizeInputValue(value: string) {
    return value.replace(/\D/g, "");
}

export default function QuantityControl({
    value,
    onChange,
    min = 1,
    max,
    step = 1,
    disabled = false,
    displayZeroAsEmpty = false,
    fullWidth = false,
    size = "md",
    className = "",
    placeholder,
    inputLabel = "Ποσότητα",
    decrementLabel = "Μείωση ποσότητας",
    incrementLabel = "Αύξηση ποσότητας",
    onBlur,
}: QuantityControlProps) {
    const normalizedMin = normalizeBoundary(min, 1);
    const normalizedMax =
        max == null
            ? undefined
            : Math.max(normalizedMin, normalizeBoundary(max, normalizedMin));
    const normalizedStep = Math.max(1, normalizeBoundary(step, 1));

    const boundedValue = clampQuantity(value, normalizedMin, normalizedMax);

    const [inputValue, setInputValue] = useState(() =>
        formatInputValue(boundedValue, displayZeroAsEmpty)
    );

    useEffect(() => {
        setInputValue(formatInputValue(boundedValue, displayZeroAsEmpty));
    }, [boundedValue, displayZeroAsEmpty]);

    const sizeClasses = SIZE_CLASSES[size];

    const currentQuantity = inputValue.trim()
        ? clampQuantity(Number(inputValue), normalizedMin, normalizedMax)
        : normalizedMin <= 0
            ? 0
            : boundedValue;

    const canDecrement = !disabled && currentQuantity > normalizedMin;
    const canIncrement =
        !disabled && (normalizedMax == null || currentQuantity < normalizedMax);

    const commitQuantity = (nextValue: number) => {
        const nextQuantity = clampQuantity(
            nextValue,
            normalizedMin,
            normalizedMax
        );

        setInputValue(formatInputValue(nextQuantity, displayZeroAsEmpty));

        if (nextQuantity !== boundedValue) {
            onChange(nextQuantity);
        }

        return nextQuantity;
    };

    const handleStepChange = (direction: -1 | 1) => {
        commitQuantity(currentQuantity + direction * normalizedStep);
    };

    const handleInputChange = (nextValue: string) => {
        const sanitizedValue = sanitizeInputValue(nextValue);

        setInputValue(sanitizedValue);

        if (!sanitizedValue) {
            if (normalizedMin <= 0) {
                commitQuantity(0);
            }

            return;
        }

        commitQuantity(Number(sanitizedValue));
    };

    const handleInputBlur = () => {
        const nextQuantity = commitQuantity(currentQuantity);
        onBlur?.(nextQuantity);
    };

    const handleInputKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>
    ) => {
        if (event.key === "ArrowUp") {
            event.preventDefault();
            handleStepChange(1);
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            handleStepChange(-1);
            return;
        }

        if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
            return;
        }

        if (event.key === "Escape") {
            event.preventDefault();
            setInputValue(formatInputValue(boundedValue, displayZeroAsEmpty));
            event.currentTarget.blur();
        }
    };

    const buttonClassName = [
        "grid place-items-center rounded-md text-gray-400 transition-colors",
        "hover:bg-gray-100 hover:text-gray-700",
        "focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
        "disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent",
        "dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-200 dark:disabled:text-gray-700",
        sizeClasses.button,
    ].join(" ");

    return (
        <div
            className={[
                fullWidth ? sizeClasses.rootFluid : sizeClasses.rootCompact,
                "items-center gap-1 rounded-lg border border-gray-200 bg-white px-0.5 py-0.5 shadow-xs dark:border-gray-700 dark:bg-gray-900",
                disabled ? "opacity-70" : "",
                className,
            ].join(" ")}
        >
            <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleStepChange(-1)}
                disabled={!canDecrement}
                aria-label={decrementLabel}
                className={buttonClassName}
            >
                <Minus className={sizeClasses.icon} />
            </button>

            <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label={inputLabel}
                value={inputValue}
                placeholder={placeholder}
                disabled={disabled}
                onChange={(event) => handleInputChange(event.target.value)}
                onBlur={handleInputBlur}
                onFocus={(event) => event.target.select()}
                onKeyDown={handleInputKeyDown}
                className={[
                    "min-w-0 rounded-md border border-transparent bg-gray-50/80 px-1 text-center font-semibold tabular-nums text-gray-900 outline-none transition-colors",
                    "placeholder:text-gray-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20",
                    "disabled:cursor-not-allowed disabled:text-gray-400",
                    "dark:bg-gray-800/70 dark:text-white dark:focus:border-brand-400 dark:focus:bg-gray-900 dark:disabled:text-gray-600",
                    "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                    sizeClasses.input,
                ].join(" ")}
            />

            <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleStepChange(1)}
                disabled={!canIncrement}
                aria-label={incrementLabel}
                className={buttonClassName}
            >
                <Plus className={sizeClasses.icon} />
            </button>
        </div>
    );
}