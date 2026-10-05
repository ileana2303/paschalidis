"use client";

import { useMutation } from "@tanstack/react-query";
import { fetchUsers, saveUser } from "@/lib/api-client/users";
import type { SaveUserRoutePayload } from "@/lib/users/types";

export function useFetchUsersMutation() {
    return useMutation({
        mutationFn: (username?: string) => fetchUsers(username),
    });
}

export function useSaveUserMutation() {
    return useMutation({
        mutationFn: (payload: SaveUserRoutePayload) => saveUser(payload),
    });
}
