"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";
import {
    canAccessBranch,
    canAccessFeature,
    canAccessModule,
    canAccessPath,
    getPermittedBranchCodes,
    type PermissionCatalog,
} from "@/lib/auth/permissions";
import { getUserBranchOptions } from "@/lib/auth/branches";
import { usePermissionsCatalogQuery } from "@/hooks/queries/usePermissionsCatalogQuery";

export function usePermissionCatalog(): PermissionCatalog | null {
    const { data } = usePermissionsCatalogQuery();
    return data ?? null;
}

export function usePermissionChecks() {
    const user = useAuthStore((state) => state.user);
    const permissions = useAuthStore((state) => state.permissions);
    const { data: catalog, isLoading, isError } = usePermissionsCatalogQuery();

    return useMemo(
        () => ({
            catalog: catalog ?? null,
            catalogLoading: isLoading,
            catalogError: isError,
            canAccessModule: (moduleCode: string) =>
                canAccessModule({
                    user,
                    permissions,
                    moduleCode,
                    catalog: catalog ?? null,
                }),
            canAccessFeature: (featureCode: string) =>
                canAccessFeature({
                    user,
                    permissions,
                    featureCode,
                    catalog: catalog ?? null,
                }),
            canAccessPath: (pathname: string) =>
                canAccessPath({
                    user,
                    permissions,
                    pathname,
                    catalog: catalog ?? null,
                }),
            canAccessBranch: (branchCode: string) =>
                canAccessBranch({
                    user,
                    permissions,
                    branchCode,
                    catalog: catalog ?? null,
                }),
            permittedBranchCodes: getPermittedBranchCodes({
                user,
                permissions,
                catalog: catalog ?? null,
            }),
            branchOptions: getUserBranchOptions(
                user,
                permissions,
                catalog ?? null
            ),
        }),
        [catalog, isError, isLoading, permissions, user]
    );
}

export function useCanFeature(featureCode: string) {
    const { canAccessFeature, catalogLoading } = usePermissionChecks();
    return {
        allowed: canAccessFeature(featureCode),
        loading: catalogLoading,
    };
}
