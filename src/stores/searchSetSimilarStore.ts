import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { IItem } from "@/lib/interface";

type SearchSide = "left" | "right";

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
    persist(
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
        {
            name: "search-set-similar-storage",
            storage: createJSONStorage(() => sessionStorage),
        }
    )
);
