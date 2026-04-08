import { create } from "zustand";
import { ICustomerInfo } from "@/app/lib/interface";

type CustomerSearchStore = {
    search: string;
    customers: ICustomerInfo[];
    hasSearched: boolean;
    setSearch: (search: string) => void;
    setCustomers: (customers: ICustomerInfo[]) => void;
    setHasSearched: (hasSearched: boolean) => void;
    clearSearchState: () => void;
};

export const useCustomerSearchStore = create<CustomerSearchStore>((set) => ({
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
}));
