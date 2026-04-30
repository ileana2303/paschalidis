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
                <div
                    key={customer.TRDR}
                    onClick={() => onSelectCustomer(customer)}
                    className="rounded-xl border bg-white p-4 cursor-pointer transition hover:border-2 hover:border-brand-500 hover:bg-brand-100"
                >
                    <p className="font-semibold">{customer.NAME}</p>
                    <p className="text-sm text-gray-500">{customer.AFM}</p>
                    <p className="text-xs">
                        {customer.MAIN_ADDRESS} - {customer.MAIN_CITY}
                    </p>
                </div>
            ))}
        </>
    );
}
