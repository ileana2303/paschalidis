import type { ReactNode } from "react";
import ItemCodeBadge from "@/components/ui/item-code-badge";
import { ChartColumn } from "@/lib/icons/lucide";

interface ItemForensicsButtonProps {
  code: string;
  onClick: () => void;
  children?: ReactNode;
}

export default function ItemForensicsButton({
  code,
  onClick,
  children,
}: ItemForensicsButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group/item inline-flex min-w-0 max-w-full flex-col items-start gap-1.5 rounded-xl px-2 py-2 text-left transition hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:hover:bg-brand-500/10"
      aria-label={`Προβολή ιστορικού πωλήσεων για τον κωδικό ${code || "—"}`}
      title="Προβολή ιστορικού πωλήσεων"
    >
      <span className="inline-flex max-w-full items-center gap-1 @md:gap-2">
        <ItemCodeBadge
          code={code}
          className="min-w-0 transition group-hover/item:border-brand-300 group-hover/item:bg-white dark:group-hover/item:border-brand-400 dark:group-hover/item:bg-gray-900"
        />
        <ChartColumn className="h-4 w-4 shrink-0 text-gray-300 transition group-hover/item:text-brand-500 dark:text-gray-600" />
      </span>
      {children}
    </button>
  );
}
