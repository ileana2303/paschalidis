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
                    <p className="font-semibold text-gray-800 dark:text-white/90">{customer.NAME}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{customer.AFM}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                        {customer.MAIN_ADDRESS} - {customer.MAIN_CITY}
                    </p>
                </button>
            ))}
        </>
    );
}
