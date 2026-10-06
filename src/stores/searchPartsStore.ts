import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { IItem } from "@/lib/interface";
import { storageKey } from "@/lib/storage-keys";

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

export const useSearchPartsStore = create<SearchPartsStore>()(
    persist(
        (set) => ({
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
        }),
        {
            name: storageKey("search-parts-storage"),
            storage: createJSONStorage(() => localStorage),
        }
    )
);
