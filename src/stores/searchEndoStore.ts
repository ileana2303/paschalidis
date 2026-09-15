import { create } from "zustand";
import { IItem } from "@/lib/interface";

type SearchEndoStore = {
    searchTerm: string;
    items: IItem[];
    hasSearched: boolean;
    setSearchTerm: (searchTerm: string) => void;
    setItems: (items: IItem[]) => void;
    setHasSearched: (hasSearched: boolean) => void;
    clearState: () => void;
};

export const useSearchEndoStore = create<SearchEndoStore>((set) => ({
    searchTerm: "",
    items: [],
    hasSearched: false,
    setSearchTerm: (searchTerm) => set({ searchTerm }),
    setItems: (items) => set({ items }),
    setHasSearched: (hasSearched) => set({ hasSearched }),
    clearState: () =>
        set({
            searchTerm: "",
            items: [],
            hasSearched: false,
        }),
}));
