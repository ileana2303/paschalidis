import { Loader2, RefreshCw, UsersRound } from "@/lib/icons/lucide";
import type { PriceTierGroupCustomer } from "@/lib/price-tiers/types";

interface CustomerGroupCustomersProps {
    customers: PriceTierGroupCustomer[];
    totalCount: number;
    isLoading: boolean;
    isFetching: boolean;
    error?: Error | null;
    onRetry: () => void;
}

function address(customer: PriceTierGroupCustomer) {
    return [customer.address, customer.zip, customer.city].filter(Boolean).join(", ");
}

export default function CustomerGroupCustomers({
    customers,
    totalCount,
    isLoading,
    isFetching,
    error,
    onRetry,
}: CustomerGroupCustomersProps) {
    return (
        <section
            aria-labelledby="price-tier-group-customers-title"
            className="border-b border-gray-100 dark:border-gray-800"
        >
            <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-5">
                <div className="min-w-0">
                    <h3
                        id="price-tier-group-customers-title"
                        className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"
                    >
                        <UsersRound className="size-4 text-brand-500" aria-hidden="true" />
                        Πελάτες στην ομάδα
                        {!isLoading && !error && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium tabular-nums text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                {totalCount}
                            </span>
                        )}
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        Πελάτες που ανήκουν ήδη στην επιλεγμένη ομάδα.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onRetry}
                    disabled={isFetching}
                    aria-label="Ανανέωση πελατών ομάδας"
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 disabled:opacity-60 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                    <RefreshCw
                        className={["size-3.5", isFetching ? "animate-spin" : ""].join(" ")}
                        aria-hidden="true"
                    />
                    Ανανέωση
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center gap-2 px-5 py-8 text-sm text-gray-500 dark:text-gray-400">
                    <Loader2 className="size-5 animate-spin text-brand-500" aria-hidden="true" />
                    Φόρτωση πελατών…
                </div>
            ) : error ? (
                <div className="mx-3 mb-4 flex items-center justify-between gap-3 rounded-xl border border-error-200 bg-error-50 px-3 py-2.5 text-sm text-error-700 sm:mx-5 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-300">
                    <span>{error.message || "Αποτυχία φόρτωσης των πελατών της ομάδας."}</span>
                    <button
                        type="button"
                        onClick={onRetry}
                        disabled={isFetching}
                        className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-error-100 disabled:opacity-60 dark:hover:bg-error-500/20"
                    >
                        Επανάληψη
                    </button>
                </div>
            ) : customers.length === 0 ? (
                <p className="px-5 pb-5 text-sm text-gray-500 dark:text-gray-400">
                    Δεν υπάρχουν πελάτες σε αυτή την ομάδα.
                </p>
            ) : (
                <div className="max-h-80 overflow-auto border-t border-gray-100 dark:border-gray-800">
                    <table className="w-full min-w-[920px] divide-y divide-gray-100 text-left text-xs dark:divide-gray-800">
                        <thead className="sticky top-0 z-10 bg-gray-50 text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                            <tr>
                                <th className="px-5 py-2.5 font-medium">Πελάτης</th>
                                <th className="px-4 py-2.5 font-medium">Επικοινωνία</th>
                                <th className="px-4 py-2.5 font-medium">Διεύθυνση</th>
                                <th className="px-4 py-2.5 font-medium">ΑΦΜ</th>
                                <th className="px-4 py-2.5 text-center font-medium">Βαθμίδα</th>
                                <th className="px-5 py-2.5 text-center font-medium">Υποκ.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {customers.map((customer) => (
                                <tr key={customer.trdr} className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02]">
                                    <td className="px-5 py-3">
                                        <p className="max-w-64 truncate font-semibold text-gray-800 dark:text-white/90" title={customer.name}>
                                            {customer.name || "—"}
                                        </p>
                                        <p className="mt-0.5 text-gray-500 dark:text-gray-400">
                                            {customer.code || "—"} · TRDR {customer.trdr}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                        <p className="max-w-52 truncate" title={customer.email || undefined}>
                                            {customer.email || "Χωρίς email"}
                                        </p>
                                        <p className="mt-0.5 tabular-nums">{customer.phone || "Χωρίς τηλέφωνο"}</p>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                        <p className="max-w-60 truncate" title={address(customer) || undefined}>
                                            {address(customer) || "Χωρίς διεύθυνση"}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3 tabular-nums text-gray-600 dark:text-gray-300">
                                        {customer.taxId || "—"}
                                    </td>
                                    <td className="px-4 py-3 text-center font-semibold tabular-nums text-gray-700 dark:text-gray-200">
                                        {customer.priceTier || "—"}
                                    </td>
                                    <td className="px-5 py-3 text-center tabular-nums text-gray-600 dark:text-gray-300">
                                        {customer.branchCount || "0"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
