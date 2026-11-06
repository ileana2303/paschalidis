import { Layers2 } from "@/lib/icons/lucide";
import {
  PICKING_ORDER_TYPE_OPTIONS,
  PICKING_OTHER_ORDER_TYPE_OPTION,
  type PickingOrderType,
  type PickingOrderTypeFilter,
} from "@/lib/picking-list";

type OrderTypePickerProps = {
  selectedType: PickingOrderTypeFilter;
  counts: Readonly<Record<PickingOrderType, number>>;
  onSelect: (type: PickingOrderTypeFilter) => void;
};

export default function OrderTypePicker({
  selectedType,
  counts,
  onSelect,
}: OrderTypePickerProps) {
  const otherCount = counts.OTHER;
  const options = otherCount > 0 || selectedType === "OTHER"
    ? [...PICKING_ORDER_TYPE_OPTIONS, PICKING_OTHER_ORDER_TYPE_OPTION]
    : PICKING_ORDER_TYPE_OPTIONS;
  const totalCount = Object.values(counts).reduce(
    (total, count) => total + count,
    0
  );

  return (
    <section className="border-b border-gray-100 bg-gray-50/60 px-3 py-4 sm:px-5 dark:border-gray-800 dark:bg-white/[0.015]">
      <div className="mb-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <Layers2 aria-hidden="true" className="size-4 text-brand-500" />
          Τύπος παραγγελίας
        </h3>
        <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
          Φιλτράρετε τις παραγγελίες ανά τύπο παραγγελίας.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Φίλτρο τύπου παραγγελίας"
        className="flex flex-wrap gap-2"
      >
        <button
          type="button"
          role="radio"
          aria-checked={selectedType === "ALL"}
          onClick={() => onSelect("ALL")}
          className={[
            "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition",
            selectedType === "ALL"
              ? "bg-gray-900 text-white ring-gray-900 shadow-theme-xs dark:bg-white dark:text-gray-900 dark:ring-white"
              : "bg-white text-gray-600 ring-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-800 dark:hover:text-white",
          ].join(" ")}
        >
          Όλες
          <span className={selectedType === "ALL" ? "text-white/75 dark:text-gray-600" : "text-gray-400"}>
            {totalCount}
          </span>
        </button>

        {options.map((option) => {
          const selected = selectedType === option.value;
          const count = counts[option.value];

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(option.value)}
              className={[
                "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition",
                selected ? option.selectedTone : option.tone,
              ].join(" ")}
            >
              {option.label}
              <span className={selected ? "text-white/75" : "opacity-65"}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
