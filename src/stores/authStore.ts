import { create } from "zustand";
import type { UserSession } from "@/lib/auth/types";

type AuthStore = {
    user: UserSession | null;
    isLoading: boolean;
    setUser: (user: UserSession | null) => void;
    setLoading: (loading: boolean) => void;
    fetchUser: () => Promise<void>;
    logout: () => Promise<void>;
};

export const useAuthStore = create<AuthStore>((set) => ({
    user: null,
    isLoading: true,

    setUser: (user) => set({ user }),
    setLoading: (isLoading) => set({ isLoading }),

    fetchUser: async () => {
        try {
            set({ isLoading: true });
            const res = await fetch("/api/auth/me");
            if (res.ok) {
                const data = await res.json();
                set({ user: data.user });
            } else {
                set({ user: null });
            }
        } catch {
            set({ user: null });
        } finally {
            set({ isLoading: false });
        }
    },

    logout: async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        set({ user: null });
        window.location.href = "/signin";
    },
}));
