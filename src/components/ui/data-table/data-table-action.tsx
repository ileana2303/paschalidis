import type { ReactNode } from "react";
import { Check, Loader2, Pencil, X } from "@/lib/icons/lucide";

interface DataTableActionsProps {
  children: ReactNode;
  className?: string;
}

interface RowActionGroupProps {
  loading?: boolean;
  disabled?: boolean;
  onEdit: () => void;
  onApprove: () => void;
  onDelete: () => void;
  editTitle?: string;
  approveTitle?: string;
  deleteTitle?: string;
  editAriaLabel?: string;
  approveAriaLabel?: string;
  deleteAriaLabel?: string;
  variant?: "default" | "prominent";
  className?: string;
}

export function RowActionGroup({
  loading = false,
  disabled = false,
  onEdit,
  onApprove,
  onDelete,
  editTitle = "Επεξεργασία",
  approveTitle = "Έγκριση",
  deleteTitle = "Διαγραφή",
  editAriaLabel = "Επεξεργασία",
  approveAriaLabel = "Έγκριση",
  deleteAriaLabel = "Διαγραφή",
  variant = "default",
  className = "",
}: RowActionGroupProps) {
  const isProminent = variant === "prominent";

  if (isProminent) {
    return (
      <div
        className={[
          "inline-flex w-full items-stretch justify-center gap-2",
          className,
        ].join(" ")}
      >
        <button
          type="button"
          onClick={onEdit}
          disabled={loading || disabled}
          title={editTitle}
          aria-label={editAriaLabel}
          className="flex h-11 min-w-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <Pencil className="h-4 w-4 shrink-0" />
          <span className="sr-only">{editTitle}</span>
        </button>

        <button
          type="button"
          onClick={onApprove}
          disabled={loading || disabled}
          title={approveTitle}
          aria-label={approveAriaLabel}
          className="flex h-11 min-w-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none dark:disabled:bg-gray-700"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <Check className="h-4 w-4 shrink-0" />
          )}
          <span className="sr-only">{approveTitle}</span>
        </button>

        <button
          type="button"
          onClick={onDelete}
          disabled={loading || disabled}
          title={deleteTitle}
          aria-label={deleteAriaLabel}
          className="flex h-11 min-w-11 flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-red-300 bg-red-50 px-3 text-sm font-semibold text-red-700 shadow-sm transition hover:border-red-400 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-500/50 dark:bg-red-500/15 dark:text-red-300 dark:hover:bg-red-500/25"
        >
          <X className="h-4 w-4 shrink-0" />
          <span className="sr-only">{deleteTitle}</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={[
        "inline-flex items-center overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900",
        className,
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onEdit}
        disabled={loading || disabled}
        title={editTitle}
        aria-label={editAriaLabel}
        className="flex h-9 w-9 items-center justify-center text-gray-500 transition hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-gray-800 dark:hover:text-white"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

      <button
        type="button"
        onClick={onApprove}
        disabled={loading || disabled}
        title={approveTitle}
        aria-label={approveAriaLabel}
        className="flex h-9 w-9 items-center justify-center text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-30 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
      </button>

      <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

      <button
        type="button"
        onClick={onDelete}
        disabled={loading || disabled}
        title={deleteTitle}
        aria-label={deleteAriaLabel}
        className="flex h-9 w-9 items-center justify-center text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30 dark:text-red-400 dark:hover:bg-red-500/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function DataTableActions({
  children,
  className = "",
}: DataTableActionsProps) {
  return <div className={["inline-flex items-center gap-2", className].join(" ")}>{children}</div>;
}

