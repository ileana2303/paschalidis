import { create } from "zustand";
import { IItem } from "@/app/lib/interface";

type SearchPartsStore = {
    trdr: string | null;
    searchTerm: string;
    items: IItem[];
    hasSearched: boolean;
    setTrdr: (trdr: string | null) => void;
    setSearchTerm: (searchTerm: string) => void;
    setItems: (items: IItem[]) => void;
    setHasSearched: (hasSearched: boolean) => void;
    clearState: () => void;
};

export const useSearchPartsStore = create<SearchPartsStore>((set) => ({
    trdr: null,
    searchTerm: "",
    items: [],
    hasSearched: false,
    setTrdr: (trdr) => set({ trdr }),
    setSearchTerm: (searchTerm) => set({ searchTerm }),
    setItems: (items) => set({ items }),
    setHasSearched: (hasSearched) => set({ hasSearched }),
    clearState: () =>
        set({
            trdr: null,
            searchTerm: "",
            items: [],
            hasSearched: false,
        }),
}));
