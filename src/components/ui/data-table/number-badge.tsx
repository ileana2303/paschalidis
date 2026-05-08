import type { ReactNode } from "react";

type NumberBadgeVariant = "neutral" | "success" | "danger" | "warning" | "brand";

interface NumberBadgeProps {
  value: ReactNode;
  variant?: NumberBadgeVariant;
  className?: string;
}

function getNumberBadgeVariantClassName(variant: NumberBadgeVariant) {
  if (variant === "success") {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  if (variant === "danger") {
    return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300";
  }

  if (variant === "warning") {
    return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300";
  }

  if (variant === "brand") {
    return "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300";
  }

  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

export default function NumberBadge({
  value,
  variant = "neutral",
  className = "",
}: NumberBadgeProps) {
  return (
    <span
      className={[
        "inline-flex min-w-[56px] justify-center rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
        getNumberBadgeVariantClassName(variant),
        className,
      ].join(" ")}
    >
      {value}
    </span>
  );
}

