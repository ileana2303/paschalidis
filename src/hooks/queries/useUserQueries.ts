"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    deletePermissionCatalogItems,
    fetchPermissionCatalog,
    savePermissionCatalogItems,
    fetchUsers,
    saveUser,
} from "@/lib/api-client/users";
import type {
    DeletePermsItem,
    PermissionCatalog,
    SavePermsItem,
    SaveUserRoutePayload,
} from "@/lib/users/types";

const permissionCatalogQueryKey = ["users", "permission-catalog"] as const;

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

export function usePermissionCatalogQuery() {
    return useQuery({
        queryKey: permissionCatalogQueryKey,
        queryFn: fetchPermissionCatalog,
        staleTime: Infinity,
    });
}

/** savePerms / deletePerms both return the full catalog, which replaces the cached one. */
function useCatalogMutation<T>(mutationFn: (items: T[]) => Promise<PermissionCatalog>) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn,
        onSuccess: (catalog) => {
            queryClient.setQueryData(permissionCatalogQueryKey, catalog);
        },
    });
}

export function useSavePermissionCatalogMutation() {
    return useCatalogMutation<SavePermsItem>(savePermissionCatalogItems);
}

export function useDeletePermissionCatalogMutation() {
    return useCatalogMutation<DeletePermsItem>(deletePermissionCatalogItems);
}
