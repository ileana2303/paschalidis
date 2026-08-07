import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { IItem } from "@/lib/interface";

type EditItemsSearchStore = {
    searchKey: string;
    searchResults: IItem[];
    hasSearched: boolean;
    setSearchKey: (searchKey: string) => void;
    setSearchResults: (searchResults: IItem[]) => void;
    setHasSearched: (hasSearched: boolean) => void;
    clearState: () => void;
};

export const useEditItemsSearchStore = create<EditItemsSearchStore>()(
    persist(
        (set) => ({
            searchKey: "",
            searchResults: [],
            hasSearched: false,
            setSearchKey: (searchKey) => set({ searchKey }),
            setSearchResults: (searchResults) => set({ searchResults }),
            setHasSearched: (hasSearched) => set({ hasSearched }),
            clearState: () =>
                set({
                    searchKey: "",
                    searchResults: [],
                    hasSearched: false,
                }),
        }),
        {
            name: "edit-items-search-storage",
            storage: createJSONStorage(() => sessionStorage),
        }
    )
);
