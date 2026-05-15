import type { ReactNode } from "react";

interface DataTableProps {
  children: ReactNode;
  className?: string;
}

export default function DataTable({ children, className = "" }: DataTableProps) {
  return (
    <section
      className={[
        "w-full overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}

