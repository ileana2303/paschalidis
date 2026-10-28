import { Loader2, RefreshCw, Search, X } from "@/lib/icons/lucide";

interface DataTableSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onRefresh: () => void;
  onSubmit?: () => void;
  onClear?: () => void;
  isRefreshing?: boolean;
  isSubmitting?: boolean;
  refreshDisabled?: boolean;
  submitDisabled?: boolean;
  submitLabel?: string;
  placeholder?: string;
  clearAriaLabel?: string;
  className?: string;
}

export default function DataTableSearchBar({
  value,
  onChange,
  onRefresh,
  onSubmit,
  onClear,
  isRefreshing = false,
  isSubmitting = false,
  refreshDisabled = false,
  submitDisabled = false,
  submitLabel = "Αναζήτηση ERP",
  placeholder = "Αναζήτηση...",
  clearAriaLabel = "Καθαρισμός αναζήτησης",
  className = "",
}: DataTableSearchBarProps) {
  const hasValue = value.trim().length > 0;

  const handleClear = () => {
    if (onClear) {
      onClear();
      return;
    }

    onChange("");
  };

  return (
    <div className={["flex w-full items-center gap-2 lg:w-auto", className].join(" ")}>
      <div className="relative w-full lg:min-w-[320px] lg:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && onSubmit) {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder={placeholder}
          className={[
            "h-10 w-full rounded-xl border border-gray-300 bg-white pl-9 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200",
            hasValue ? "pr-9" : "pr-3",
          ].join(" ")}
        />

        {hasValue ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label={clearAriaLabel}
            className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {onSubmit ? (
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitDisabled || isSubmitting || !hasValue}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-brand-500 px-3 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-800/70 dark:disabled:text-gray-500"
        >
          {isSubmitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
          {submitLabel}
        </button>
      ) : null}

      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshDisabled}
        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        {isRefreshing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        Ανανέωση
      </button>
    </div>
  );
}
