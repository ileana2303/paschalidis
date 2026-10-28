"use client";

import { useCallback } from "react";
import { hasPermission } from "@/lib/auth/permissions";
import { useAuthStore } from "@/stores/authStore";

/** Returns `can(code)` for the logged-in user's modules and features. */
export function useCan() {
    const permissions = useAuthStore((state) => state.permissions);

    return useCallback(
        (code: string) => hasPermission(permissions, code),
        [permissions]
    );
}
