type StatusBadgeVariant = "success" | "danger" | "warning" | "neutral";

interface StatusBadgeProps {
  status?: string | null;
  label?: string;
  className?: string;
}

function resolveStatusBadgeVariant(status: string): StatusBadgeVariant {
  const normalized = status.toUpperCase();

  if (
    normalized.includes("ΕΓΚΡΙΘ") ||
    normalized.includes("APPROV") ||
    normalized.includes("APPROVED")
  ) {
    return "success";
  }

  if (
    normalized.includes("ΔΙΑΓΡ") ||
    normalized.includes("DELETE") ||
    normalized.includes("ΑΠΟΡΡΙ") ||
    normalized.includes("REJECT")
  ) {
    return "danger";
  }

  if (normalized.includes("ΕΚΚΡΕΜ") || normalized.includes("PENDING")) {
    return "warning";
  }

  return "neutral";
}

function getVariantClassName(variant: StatusBadgeVariant) {
  if (variant === "success") {
    return "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400";
  }

  if (variant === "danger") {
    return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400";
  }

  if (variant === "warning") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
  }

  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

export default function StatusBadge({
  status,
  label,
  className = "",
}: StatusBadgeProps) {
  const normalizedStatus = String(status ?? "").trim();

  if (!normalizedStatus && !label) {
    return null;
  }

  const text = String(label ?? normalizedStatus);
  const variant = resolveStatusBadgeVariant(text);

  return (
    <span
      className={[
        "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold leading-none",
        getVariantClassName(variant),
        className,
      ].join(" ")}
    >
      {text}
    </span>
  );
}

