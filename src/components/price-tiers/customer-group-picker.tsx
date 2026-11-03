import { RefreshCw, UsersRound } from "@/lib/icons/lucide";
import type { PriceTierCustomerGroup } from "@/lib/price-tiers/types";

interface CustomerGroupPickerProps {
    groups: PriceTierCustomerGroup[];
    availableGroupIds: ReadonlySet<string>;
    selectedGroupId: string | null;
    isLoading: boolean;
    isFetching: boolean;
    error?: Error | null;
    onSelect: (groupId: string | null) => void;
    onRetry: () => void;
}

function groupLabel(group: PriceTierCustomerGroup) {
    return group.name ? `${group.code} — ${group.name}` : group.code;
}

export default function CustomerGroupPicker({
    groups,
    availableGroupIds,
    selectedGroupId,
    isLoading,
    isFetching,
    error,
    onSelect,
    onRetry,
}: CustomerGroupPickerProps) {
    const selectedGroup = groups.find((group) => group.trdpGroup === selectedGroupId);

    return (
        <section className="border-b border-gray-100 bg-gray-50/60 px-3 py-4 sm:px-5 dark:border-gray-800 dark:bg-white/[0.015]">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                        <UsersRound className="size-4 text-brand-500" aria-hidden="true" />
                        Εργασία ανά ομάδα πελατών
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                        Επιλέξτε ομάδα για γρήγορη επεξεργασία των βαθμίδων ανά είδος.
                    </p>
                </div>

                {selectedGroup && (
                    <p className="text-xs font-medium text-brand-700 dark:text-brand-300">
                        Ενεργή ομάδα: {groupLabel(selectedGroup)}
                    </p>
                )}
            </div>

            {error ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-error-200 bg-error-50 px-3 py-2.5 text-sm text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-300">
                    <span>{error.message || "Αποτυχία φόρτωσης των ομάδων πελατών."}</span>
                    <button
                        type="button"
                        onClick={onRetry}
                        disabled={isFetching}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition hover:bg-error-100 disabled:opacity-60 dark:hover:bg-error-500/20"
                    >
                        <RefreshCw
                            className={["size-3.5", isFetching ? "animate-spin" : ""].join(" ")}
                            aria-hidden="true"
                        />
                        Επανάληψη
                    </button>
                </div>
            ) : isLoading ? (
                <div className="flex flex-wrap gap-2" aria-label="Φόρτωση ομάδων πελατών">
                    {["w-28", "w-36", "w-32", "w-40"].map((width, index) => (
                        <span
                            key={index}
                            className={["h-9 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800", width].join(" ")}
                        />
                    ))}
                </div>
            ) : (
                <div
                    role="radiogroup"
                    aria-label="Επιλογή ομάδας πελατών"
                    className="flex flex-wrap gap-2"
                >
                    <button
                        type="button"
                        role="radio"
                        aria-checked={selectedGroupId === null}
                        onClick={() => onSelect(null)}
                        className={[
                            "inline-flex min-h-9 items-center rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition",
                            selectedGroupId === null
                                ? "bg-gray-900 text-white ring-gray-900 shadow-theme-xs dark:bg-white dark:text-gray-900 dark:ring-white"
                                : "bg-white text-gray-600 ring-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-800 dark:hover:text-white",
                        ].join(" ")}
                    >
                        Όλες οι ομάδες
                    </button>

                    {groups.map((group) => {
                        const selected = selectedGroupId === group.trdpGroup;
                        const available = availableGroupIds.has(group.trdpGroup);

                        return (
                            <button
                                key={group.trdpGroup}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                disabled={!available}
                                title={available ? groupLabel(group) : `${groupLabel(group)} · Χωρίς διαθέσιμες βαθμίδες`}
                                onClick={() => onSelect(group.trdpGroup)}
                                className={[
                                    "inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ring-1 ring-inset transition",
                                    selected
                                        ? "bg-brand-500 text-white ring-brand-500 shadow-theme-xs"
                                        : "bg-white text-gray-600 ring-gray-300 hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-200 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-brand-500/10 dark:hover:text-brand-200 dark:hover:ring-brand-500/30",
                                    available ? "" : "cursor-not-allowed opacity-45",
                                ].join(" ")}
                            >
                                <span className="font-bold tabular-nums">{group.code}</span>
                                {group.name && (
                                    <span className={[
                                        "truncate",
                                        selected ? "text-white/85" : "text-gray-500 dark:text-gray-400",
                                    ].join(" ")}>
                                        {group.name}
                                    </span>
                                )}
                            </button>
                        );
                    })}

                    {groups.length === 0 && (
                        <span className="self-center text-xs text-gray-500 dark:text-gray-400">
                            Δεν βρέθηκαν ενεργές ομάδες πελατών.
                        </span>
                    )}
                </div>
            )}

            {selectedGroup && (
                <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50/70 px-3 py-2 text-xs leading-5 text-brand-800 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-200">
                    Εμφανίζονται οι βαθμίδες της ομάδας <strong>{groupLabel(selectedGroup)}</strong> για
                    όλες τις ομάδες ειδών. Επιλέξτε βαθμίδα σε κάθε γραμμή· η αλλαγή αποθηκεύεται
                    αυτόματα.
                </div>
            )}
        </section>
    );
}
