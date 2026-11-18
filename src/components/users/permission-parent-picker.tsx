import { Layers2 } from "@/lib/icons/lucide";
import { getPermissionGroupVisual } from "@/components/users/permission-group-visuals";

export interface PermissionParentOption {
    code: string;
    label: string;
    count: number;
    groupCode?: string;
}

interface PermissionParentPickerProps {
    options: PermissionParentOption[];
    selectedParent: string | null;
    onSelect: (parent: string | null) => void;
}

function optionLabel(option: PermissionParentOption) {
    return option.label === option.code
        ? option.code
        : `${option.label} — ${option.code}`;
}

export default function PermissionParentPicker({
    options,
    selectedParent,
    onSelect,
}: PermissionParentPickerProps) {
    const selectedOption = options.find(
        (option) => option.code === selectedParent
    );

    return (
        <section className="border-b border-gray-100 bg-gray-50/60 px-3 py-4 sm:px-5 dark:border-gray-800 dark:bg-white/[0.015]">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                        <Layers2 className="size-4 text-brand-500" aria-hidden="true" />
                        Φιλτράρισμα ανά γονέα
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                        Επιλέξτε ομάδα για να εμφανιστούν μόνο τα δικαιώματα που ανήκουν σε αυτή.
                    </p>
                </div>

                {selectedOption && (
                    <p className="text-xs font-medium text-brand-700 dark:text-brand-300">
                        Ενεργή ομάδα: {optionLabel(selectedOption)}
                    </p>
                )}
            </div>

            <div
                role="radiogroup"
                aria-label="Επιλογή γονέα δικαιωμάτων"
                className="flex flex-wrap gap-2"
            >
                <button
                    type="button"
                    role="radio"
                    aria-checked={selectedParent === null}
                    onClick={() => onSelect(null)}
                    className={[
                        "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition",
                        selectedParent === null
                            ? "bg-gray-900 text-white ring-gray-900 shadow-theme-xs dark:bg-white dark:text-gray-900 dark:ring-white"
                            : "bg-white text-gray-600 ring-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-800 dark:hover:text-white",
                    ].join(" ")}
                >
                    <span className="font-bold uppercase">Όλες οι ομάδες</span>
                    <span className="tabular-nums opacity-70">
                        {options.reduce((total, option) => total + option.count, 0)}
                    </span>
                </button>

                {options.map((option) => {
                    const selected = selectedParent === option.code;
                    const visual = getPermissionGroupVisual(option.groupCode);

                    return (
                        <button
                            key={option.code}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            title={optionLabel(option)}
                            onClick={() => onSelect(option.code)}
                            className={[
                                "inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ring-1 ring-inset transition",
                                selected
                                    ? visual.selectedBadge
                                    : visual.badge,
                            ].join(" ")}
                        >
                            <span className="truncate font-bold uppercase">
                                {option.label}
                            </span>
                            {option.label !== option.code && (
                                <span className="font-mono text-[11px] opacity-70">
                                    {option.code}
                                </span>
                            )}
                            <span className="tabular-nums opacity-70">
                                {option.count}
                            </span>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
