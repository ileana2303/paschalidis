"use client";

import { Check, Circle, Minus } from "@/lib/icons/lucide";

interface DataTableSelectionCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  ariaLabel: string;
  disabled?: boolean;
  indeterminate?: boolean;
  className?: string;
}

export default function DataTableSelectionCheckbox({
  checked,
  onCheckedChange,
  ariaLabel,
  disabled = false,
  indeterminate = false,
  className = "",
}: DataTableSelectionCheckboxProps) {
  const isIndeterminate = indeterminate && !checked;
  const stateClassName =
    checked || isIndeterminate
      ? "border-brand-500 bg-brand-500 text-white"
      : "border-gray-300 text-transparent hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500";

  const handleClick = () => {
    onCheckedChange(!checked);
  };

  return (
    <button
      type="button"
      role="checkbox"
      aria-label={ariaLabel}
      aria-checked={isIndeterminate ? "mixed" : checked}
      disabled={disabled}
      onClick={handleClick}
      className={[
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50",
        stateClassName,
        className,
      ].join(" ")}
    >
      {isIndeterminate ? (
        <Minus className="h-3 w-3" />
      ) : checked ? (
        <Check className="h-3 w-3" />
      ) : (
        <Circle className="h-3 w-3" />
      )}
    </button>
  );
}
