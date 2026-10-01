"use client";

import { Search } from "@/lib/icons/lucide";

interface ResultsFilterInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    ariaLabel?: string;
}

export default function ResultsFilterInput({
    value,
    onChange,
    placeholder = "Κωδικός, περιγραφή, κατασκευαστής...",
    ariaLabel = "Φιλτράρισμα ανταλλακτικών",
}: ResultsFilterInputProps) {
    return (
        <div className="relative min-w-0 max-w-[220px] flex-1 sm:max-w-[280px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
                type="text"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                aria-label={ariaLabel}
                className="h-8 w-full rounded-lg border border-gray-200 bg-white pl-8 pr-2.5 text-xs text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-200"
            />
        </div>
    );
}
