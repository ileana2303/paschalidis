"use client";

import { useEffect } from "react";
import { normalizeBranchCode } from "@/lib/auth/branches";
import {
    filterPermissionsBranchesWithCatalog,
    getPermittedBranchCodes,
} from "@/lib/auth/permissions";
import { usePermissionChecks } from "@/hooks/usePermissionChecks";
import { useAuthStore } from "@/stores/authStore";

/**
 * Keeps mainBranch and stored branch permissions aligned with listPerms catalog
 * and the user's getUser branch codes.
 */
export default function BranchPermissionSync() {
    const user = useAuthStore((state) => state.user);
    const permissions = useAuthStore((state) => state.permissions);
    const setAuth = useAuthStore((state) => state.setAuth);
    const { catalog, catalogLoading } = usePermissionChecks();

    useEffect(() => {
        if (!user || !permissions || catalogLoading || !catalog) {
            return;
        }

        const filteredPermissions = filterPermissionsBranchesWithCatalog(
            permissions,
            catalog
        );
        const permitted = getPermittedBranchCodes({
            user,
            permissions: filteredPermissions,
            catalog,
        });

        const mainBranch = normalizeBranchCode(user.mainBranch);
        const branchesChanged =
            filteredPermissions.branches.join("\0") !==
            permissions.branches.join("\0");

        let nextMainBranch = mainBranch;

        if (user.isSuperAdmin !== 1) {
            if (permitted.length === 0) {
                if (branchesChanged) {
                    setAuth(user, filteredPermissions);
                }
                return;
            }

            if (!mainBranch || !permitted.includes(mainBranch)) {
                nextMainBranch = permitted[0];
            }
        } else if (mainBranch && permitted.length > 0 && !permitted.includes(mainBranch)) {
            nextMainBranch = permitted[0];
        }

        const userChanged = nextMainBranch !== mainBranch;

        if (branchesChanged || userChanged) {
            setAuth(
                userChanged ? { ...user, mainBranch: nextMainBranch } : user,
                filteredPermissions
            );
        }
    }, [catalog, catalogLoading, permissions, setAuth, user]);

    return null;
}
