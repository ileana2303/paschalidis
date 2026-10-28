interface ItemCodeBadgeProps {
  code: string | number | null | undefined;
  className?: string;
}

export default function ItemCodeBadge({
  code,
  className = "",
}: ItemCodeBadgeProps) {
  const value = String(code ?? "").trim() || "—";

  return (
    <span
      title={`Κωδικός είδους: ${value}`}
      aria-label={`Κωδικός είδους: ${value}`}
      dir="ltr"
      className={[
        "inline-flex max-w-full select-text items-center rounded-2xl  bg-brand-50 px-2.5 py-1.5 font-mono text-sm font-bold leading-none tracking-wide text-brand-800 shadow-xs",
        "dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-200",
        className,
      ].join(" ")}
    >
      <span className="overflow-hidden text-ellipsis whitespace-nowrap">{value}</span>
    </span>
  );
}
