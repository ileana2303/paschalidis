import type { ICustomerInfo } from "@/lib/interface";

interface CustomerResultsProps {
    customers: ICustomerInfo[];
    onSelectCustomer: (customer: ICustomerInfo) => void;
}

export default function CustomerResults({
    customers,
    onSelectCustomer,
}: CustomerResultsProps) {
    return (
        <>
            {customers.map((customer) => (
                <button
                    type="button"
                    key={customer.TRDR}
                    onClick={() => onSelectCustomer(customer)}
                    className="block w-full rounded-xl border border-gray-200 bg-gray-50/80 p-4 text-left shadow-sm transition-colors hover:border-brand-200 hover:bg-brand-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:border-gray-800 dark:bg-white/[0.02] dark:hover:border-brand-500/30 dark:hover:bg-brand-500/5"
                >
                    <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                            <span className="block truncate font-semibold text-gray-800 dark:text-white/90">
                                {customer.NAME}
                            </span>
                            <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                                Κωδικός {customer.CODE} · TRDR {customer.TRDR}
                            </span>
                        </span>

                        <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold tabular-nums text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25">
                            Tier {customer.PRICE_TIER}
                        </span>
                    </span>

                    <span className="mt-3 grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
                        <span className="text-gray-500 dark:text-gray-400">
                            ΑΦΜ <span className="font-medium tabular-nums text-gray-700 dark:text-gray-300">{customer.AFM || "-"}</span>
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                            Υποκαταστήματα <span className="font-medium tabular-nums text-gray-700 dark:text-gray-300">{customer.NUMBER_OF_BRANCHES || "-"}</span>
                        </span>
                        <span className="truncate text-gray-600 dark:text-gray-300" title={customer.EMAIL || undefined}>
                            {customer.EMAIL || "Χωρίς email"}
                        </span>
                        <span className="truncate text-gray-600 dark:text-gray-300" title={[customer.MAIN_ADDRESS, customer.MAIN_CITY].filter(Boolean).join(", ") || undefined}>
                            {[customer.MAIN_ADDRESS, customer.MAIN_CITY].filter(Boolean).join(", ") || "Χωρίς διεύθυνση"}
                        </span>
                    </span>
                </button>
            ))}
        </>
    );
}
