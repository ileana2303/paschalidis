"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getModuleCodeForPath } from "@/lib/auth/route-modules";
import { usePermissionChecks } from "@/hooks/usePermissionChecks";
import { useAuthStore } from "@/stores/authStore";

export default function ModuleAccessGuard() {
    const pathname = usePathname();
    const router = useRouter();
    const user = useAuthStore((state) => state.user);
    const { canAccessPath, catalogLoading } = usePermissionChecks();

    const moduleCode = getModuleCodeForPath(pathname);
    const needsCatalog = Boolean(moduleCode) && user?.isSuperAdmin !== 1;

    useEffect(() => {
        if (!user || !moduleCode) {
            return;
        }

        if (user.isSuperAdmin === 1) {
            return;
        }

        if (needsCatalog && catalogLoading) {
            return;
        }

        if (!canAccessPath(pathname)) {
            router.replace("/");
        }
    }, [
        canAccessPath,
        catalogLoading,
        moduleCode,
        needsCatalog,
        pathname,
        router,
        user,
    ]);

    if (needsCatalog && catalogLoading) {
        return null;
    }

    return null;
}
