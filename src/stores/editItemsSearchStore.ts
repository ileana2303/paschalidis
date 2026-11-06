import { create } from "zustand";
import { IItem } from "@/lib/interface";
import { storageKey } from "@/lib/storage-keys";

/**
 * Not persisted: the page always opens with an empty search (no previous
 * results). The page resets this store on mount and unmount.
 */
if (typeof window !== "undefined") {
    // One-off cleanup of the old persisted snapshot.
    try {
        sessionStorage.removeItem(storageKey("edit-items-search-storage"));
    } catch {
        // Storage unavailable – nothing to clean.
    }
}

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
);
