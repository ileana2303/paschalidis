import type { ReactNode } from "react";

interface DataTableEmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export default function DataTableEmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: DataTableEmptyStateProps) {
  return (
    <div className={["flex flex-col items-center justify-center px-5 py-16 text-center", className].join(" ")}>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        {icon}
      </div>

      <h3 className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">
        {title}
      </h3>

      <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
