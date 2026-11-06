import { create } from "zustand";
import { IItem } from "@/lib/interface";
import { storageKey } from "@/lib/storage-keys";

type SearchSide = "left" | "right";

/**
 * Not persisted: the page always opens with an empty search (no previous
 * results). The page resets this store on mount and unmount.
 */
if (typeof window !== "undefined") {
    // One-off cleanup of the old persisted snapshot.
    try {
        sessionStorage.removeItem(storageKey("search-set-similar-storage"));
    } catch {
        // Storage unavailable – nothing to clean.
    }
}

type SearchSetSimilarStore = {
    leftSearch: string;
    rightSearch: string;
    leftItems: IItem[];
    rightItems: IItem[];
    selectedLeft: IItem | null;
    hasSearched: Record<SearchSide, boolean>;
    setLeftSearch: (leftSearch: string) => void;
    setRightSearch: (rightSearch: string) => void;
    setLeftItems: (leftItems: IItem[]) => void;
    setRightItems: (rightItems: IItem[]) => void;
    setSelectedLeft: (selectedLeft: IItem | null) => void;
    setHasSearchedSide: (side: SearchSide, hasSearched: boolean) => void;
    clearState: () => void;
};

export const useSearchSetSimilarStore = create<SearchSetSimilarStore>()(
    (set) => ({
            leftSearch: "",
            rightSearch: "",
            leftItems: [],
            rightItems: [],
            selectedLeft: null,
            hasSearched: { left: false, right: false },
            setLeftSearch: (leftSearch) => set({ leftSearch }),
            setRightSearch: (rightSearch) => set({ rightSearch }),
            setLeftItems: (leftItems) => set({ leftItems }),
            setRightItems: (rightItems) => set({ rightItems }),
            setSelectedLeft: (selectedLeft) => set({ selectedLeft }),
            setHasSearchedSide: (side, value) =>
                set((state) => ({
                    hasSearched: { ...state.hasSearched, [side]: value },
                })),
            clearState: () =>
                set({
                    leftSearch: "",
                    rightSearch: "",
                    leftItems: [],
                    rightItems: [],
                    selectedLeft: null,
                    hasSearched: { left: false, right: false },
                }),
        }),
);
