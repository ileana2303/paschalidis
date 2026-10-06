import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthPermissions, AuthUser } from "@/lib/auth/types";
import { storageKey } from "@/lib/storage-keys";

type AuthStore = {
    user: AuthUser | null;
    permissions: AuthPermissions | null;
    setAuth: (user: AuthUser, permissions: AuthPermissions) => void;
    clearAuth: () => void;
};

type LegacyAuthUser = {
    username?: string;
    fullName?: string;
    role?: string;
    s1code?: string;
    listAccess?: Array<{ code?: string }>;
    listBranches?: Array<{ s1Code?: string }>;
};

type PersistedAuthState = {
    user?: AuthUser | LegacyAuthUser | null;
    permissions?: AuthPermissions | null;
};

function migrateAuthState(persistedState: unknown): PersistedAuthState {
    const state = (persistedState ?? {}) as PersistedAuthState;
    const storedUser = state.user;

    if (!storedUser) {
        return { user: null, permissions: null };
    }

    if ("mainBranch" in storedUser) {
        return {
            user: storedUser,
            permissions: state.permissions ?? null,
        };
    }

    const fullNameParts = String(storedUser.fullName ?? "").trim().split(/\s+/);
    const fname = fullNameParts.shift() ?? "";
    const lname = fullNameParts.join(" ");

    return {
        user: {
            username: String(storedUser.username ?? ""),
            fname,
            lname,
            role: String(storedUser.role ?? ""),
            mainBranch: String(storedUser.s1code ?? ""),
            isSuperAdmin: 0,
            isCustomer: 0,
            trdr: 0,
        },
        permissions: {
            modules: (storedUser.listAccess ?? []).flatMap((entry) => {
                const code = String(entry.code ?? "").trim();
                return code ? [{ code, rights: 0 }] : [];
            }),
            features: [],
            branches: (storedUser.listBranches ?? []).flatMap((branch) => {
                const code = String(branch.s1Code ?? "").trim();
                return code ? [code] : [];
            }),
        },
    };
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set) => ({
            user: null,
            permissions: null,
            setAuth: (user, permissions) => set({ user, permissions }),
            clearAuth: () => set({ user: null, permissions: null }),
        }),
        {
            name: storageKey("auth-user-account"),
            version: 1,
            migrate: migrateAuthState,
            partialize: (state) => ({
                user: state.user,
                permissions: state.permissions,
            }),
        }
    )
);
