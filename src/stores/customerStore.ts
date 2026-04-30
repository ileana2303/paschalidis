import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ICustomerInfo } from "@/lib/interface";

type CustomerStore = {
    customer: ICustomerInfo | null;
    setCustomer: (customer: ICustomerInfo) => void;
    clearCustomer: () => void;
};

export const useCustomerStore = create<CustomerStore>()(
    persist(
        (set) => ({
            customer: null,

            setCustomer: (customer) => set({ customer }),

            clearCustomer: () => set({ customer: null }),
        }),
        {
            name: "customer-storage",
        }
    )
);