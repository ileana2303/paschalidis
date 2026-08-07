import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ICustomerInfo } from "@/lib/interface";

type CustomerSearchStore = {
    search: string;
    customers: ICustomerInfo[];
    hasSearched: boolean;
    setSearch: (search: string) => void;
    setCustomers: (customers: ICustomerInfo[]) => void;
    setHasSearched: (hasSearched: boolean) => void;
    clearSearchState: () => void;
};

export const useCustomerSearchStore = create<CustomerSearchStore>()(
    persist(
        (set) => ({
            search: "",
            customers: [],
            hasSearched: false,
            setSearch: (search) => set({ search }),
            setCustomers: (customers) => set({ customers }),
            setHasSearched: (hasSearched) => set({ hasSearched }),
            clearSearchState: () =>
                set({
                    search: "",
                    customers: [],
                    hasSearched: false,
                }),
        }),
        {
            name: "customer-search-storage",
            storage: createJSONStorage(() => sessionStorage),
        }
    )
);
