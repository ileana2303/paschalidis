import type { ReactNode } from "react";

interface DataTableHeaderProps {
  title: string;
  description?: string;
  count?: ReactNode;
  action?: ReactNode;
  className?: string;
  countClassName?: string;
}

export default function DataTableHeader({
  title,
  description,
  count,
  action,
  className = "",
  countClassName = "",
}: DataTableHeaderProps) {
  const shouldRenderCount = count != null;

  return (
    <div className={["min-w-0 border-b border-gray-100 px-5 py-4 dark:border-gray-800", className].join(" ")}>
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>

            {shouldRenderCount &&
              (typeof count === "number" || typeof count === "string" ? (
                <span
                  className={[
                    "inline-flex min-w-7 justify-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                    countClassName,
                  ].join(" ")}
                >
                  {count}
                </span>
              ) : (
                count
              ))}
          </div>

          {description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>

        {action && <div className="min-w-0">{action}</div>}
      </div>
    </div>
  );
}
