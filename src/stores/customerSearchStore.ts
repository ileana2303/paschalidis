import { create } from "zustand";
import { ICustomerInfo } from "@/lib/interface";
import { storageKey } from "@/lib/storage-keys";

if (typeof window !== "undefined") {
    try {
        sessionStorage.removeItem(storageKey("customer-search-storage"));
    } catch {
    }
}

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
);
