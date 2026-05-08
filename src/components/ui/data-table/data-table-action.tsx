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
}: RowActionGroupProps) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
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

