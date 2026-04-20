import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ExternalLoginUserAccount } from "@/lib/auth/types";

type AuthStore = {
    user: ExternalLoginUserAccount | null;
    setUser: (user: ExternalLoginUserAccount | null) => void;
};

export const useAuthStore = create<AuthStore>()(
    persist(
        (set) => ({
            user: null,
            setUser: (user) => set({ user }),
        }),
        {
            name: "auth-user-account",
            partialize: (state) => ({ user: state.user }),
        }
    )
);
