import { Loader2, RefreshCw, Search } from "@/lib/icons/lucide";

interface DataTableSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onRefresh: () => void;
  onSubmit?: () => void;
  isRefreshing?: boolean;
  refreshDisabled?: boolean;
  placeholder?: string;
  className?: string;
}

export default function DataTableSearchBar({
  value,
  onChange,
  onRefresh,
  onSubmit,
  isRefreshing = false,
  refreshDisabled = false,
  placeholder = "Αναζήτηση...",
  className = "",
}: DataTableSearchBarProps) {
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
          className="h-10 w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        />
      </div>

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
