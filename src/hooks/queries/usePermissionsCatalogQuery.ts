"use client";

import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/http/client";
import type { PermissionCatalog } from "@/lib/auth/permissions";

type CatalogResponse = PermissionCatalog & {
    success: boolean;
    error?: string;
};

export function usePermissionsCatalogQuery() {
    return useQuery({
        queryKey: ["permissions", "catalog"],
        queryFn: async () => {
            const { data } = await httpClient.post<CatalogResponse>(
                "/api/permissions/catalog"
            );

            if (!data.success) {
                throw new Error(
                    data.error ?? "Αποτυχία φόρτωσης καταλόγου δικαιωμάτων."
                );
            }

            return {
                modules: data.modules ?? [],
                features: data.features ?? [],
                branches: data.branches ?? [],
            } satisfies PermissionCatalog;
        },
        staleTime: 30 * 60 * 1000,
        retry: 1,
    });
}
