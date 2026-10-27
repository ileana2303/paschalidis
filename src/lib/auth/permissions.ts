import type { AuthPermissionEntry, AuthPermissions, AuthUser } from "@/lib/auth/types";
import {
    BRANCH_ALLOWED_RIGHTS,
    FEATURE_ALLOWED_RIGHTS,
    INACTIVE_BRANCH_CODES,
    INACTIVE_MODULE_CODES,
    MODULE_ALLOWED_RIGHTS,
} from "@/lib/auth/permission-catalog-snapshot";
function normalizeBranchCode(value: string | number | null | undefined) {
    return String(value ?? "").trim();
}
import { getModuleCodeForPath } from "@/lib/auth/route-modules";

export type PermissionCatalogEntry = {
    code: string;
    parent: string;
    descr: string;
    allowedRights: number;
    sortOrder: number;
    isActive: number;
};

export type PermissionCatalog = {
    modules: PermissionCatalogEntry[];
    features: PermissionCatalogEntry[];
    branches: PermissionCatalogEntry[];
};

export function hasFullRights(userRights: number, allowedRights: number) {
    return (userRights & allowedRights) === allowedRights;
}

function findEntryRights(
    entries: AuthPermissionEntry[] | undefined,
    code: string
): number | null {
    const normalized = code.trim();
    const entry = (entries ?? []).find(
        (item) => item.code.trim().toLowerCase() === normalized.toLowerCase()
    );
    return entry ? Number(entry.rights) : null;
}

export function getAllowedRightsForModule(
    code: string,
    catalog?: PermissionCatalog | null
): number | null {
    const fromCatalog = catalog?.modules.find(
        (m) => m.code.trim().toLowerCase() === code.trim().toLowerCase()
    );
    if (fromCatalog) {
        return fromCatalog.isActive === 1 ? Number(fromCatalog.allowedRights) : null;
    }
    if (INACTIVE_MODULE_CODES.has(code)) {
        return null;
    }
    const snapshot = MODULE_ALLOWED_RIGHTS[code];
    return snapshot !== undefined ? snapshot : null;
}

export function getAllowedRightsForFeature(
    code: string,
    catalog?: PermissionCatalog | null
): number | null {
    const fromCatalog = catalog?.features.find(
        (f) => f.code.trim().toLowerCase() === code.trim().toLowerCase()
    );
    if (fromCatalog) {
        return fromCatalog.isActive === 1 ? Number(fromCatalog.allowedRights) : null;
    }
    const snapshot = FEATURE_ALLOWED_RIGHTS[code];
    return snapshot !== undefined ? snapshot : null;
}

export function canAccessModule({
    user,
    permissions,
    moduleCode,
    catalog,
}: {
    user: AuthUser | null | undefined;
    permissions: AuthPermissions | null | undefined;
    moduleCode: string;
    catalog?: PermissionCatalog | null;
}): boolean {
    if (user?.isSuperAdmin === 1) {
        return true;
    }

    const allowedRights = getAllowedRightsForModule(moduleCode, catalog);
    if (allowedRights === null) {
        return false;
    }

    const userRights = findEntryRights(permissions?.modules, moduleCode);
    if (userRights === null) {
        return false;
    }

    return hasFullRights(userRights, allowedRights);
}

export function canAccessFeature({
    user,
    permissions,
    featureCode,
    catalog,
}: {
    user: AuthUser | null | undefined;
    permissions: AuthPermissions | null | undefined;
    featureCode: string;
    catalog?: PermissionCatalog | null;
}): boolean {
    if (user?.isSuperAdmin === 1) {
        return true;
    }

    const allowedRights = getAllowedRightsForFeature(featureCode, catalog);
    if (allowedRights === null) {
        return false;
    }

    const userRights = findEntryRights(permissions?.features, featureCode);
    if (userRights === null) {
        return false;
    }

    return hasFullRights(userRights, allowedRights);
}

export function canAccessPath({
    user,
    permissions,
    pathname,
    catalog,
}: {
    user: AuthUser | null | undefined;
    permissions: AuthPermissions | null | undefined;
    pathname: string;
    catalog?: PermissionCatalog | null;
}): boolean {
    const moduleCode = getModuleCodeForPath(pathname);
    if (!moduleCode) {
        return true;
    }

    return canAccessModule({ user, permissions, moduleCode, catalog });
}

export function getActiveCatalogBranchEntries(
    catalog?: PermissionCatalog | null
): PermissionCatalogEntry[] {
    if (catalog?.branches?.length) {
        return catalog.branches
            .filter((branch) => branch.isActive === 1)
            .sort((a, b) => a.sortOrder - b.sortOrder);
    }

    return Object.entries(BRANCH_ALLOWED_RIGHTS)
        .filter(([code]) => !INACTIVE_BRANCH_CODES.has(code))
        .map(([code, allowedRights]) => ({
            code,
            parent: "branches",
            descr: code,
            allowedRights,
            sortOrder: 0,
            isActive: 1,
        }));
}

export function getBranchCatalogLabel(
    branchCode: string,
    catalog?: PermissionCatalog | null
) {
    const normalized = normalizeBranchCode(branchCode);
    const entry = catalog?.branches.find(
        (branch) => normalizeBranchCode(branch.code) === normalized
    );
    const descr = String(entry?.descr ?? "").trim();
    return descr || null;
}

export function getPermittedBranchCodes({
    user,
    permissions,
    catalog,
}: {
    user: AuthUser | null | undefined;
    permissions: AuthPermissions | null | undefined;
    catalog?: PermissionCatalog | null;
}): string[] {
    const activeCatalogCodes = new Set(
        getActiveCatalogBranchEntries(catalog).map((branch) =>
            normalizeBranchCode(branch.code)
        )
    );

    if (user?.isSuperAdmin === 1) {
        return Array.from(activeCatalogCodes).filter(Boolean);
    }

    const userBranchCodes = (permissions?.branches ?? [])
        .map((branch) => normalizeBranchCode(branch))
        .filter(Boolean);

    if (activeCatalogCodes.size === 0) {
        return userBranchCodes;
    }

    return userBranchCodes.filter((code) => activeCatalogCodes.has(code));
}

export function canAccessBranch({
    user,
    permissions,
    branchCode,
    catalog,
}: {
    user: AuthUser | null | undefined;
    permissions: AuthPermissions | null | undefined;
    branchCode: string;
    catalog?: PermissionCatalog | null;
}): boolean {
    const normalized = normalizeBranchCode(branchCode);
    if (!normalized) {
        return false;
    }

    if (user?.isSuperAdmin === 1) {
        const activeCatalogCodes = new Set(
            getActiveCatalogBranchEntries(catalog).map((branch) =>
                normalizeBranchCode(branch.code)
            )
        );
        return activeCatalogCodes.size === 0 || activeCatalogCodes.has(normalized);
    }

    return getPermittedBranchCodes({ user, permissions, catalog }).includes(
        normalized
    );
}

export function filterPermissionsBranchesWithCatalog(
    permissions: AuthPermissions,
    catalog?: PermissionCatalog | null
): AuthPermissions {
    const activeCatalogCodes = new Set(
        getActiveCatalogBranchEntries(catalog).map((branch) =>
            normalizeBranchCode(branch.code)
        )
    );

    if (activeCatalogCodes.size === 0) {
        return permissions;
    }

    return {
        ...permissions,
        branches: permissions.branches
            .map((branch) => normalizeBranchCode(branch))
            .filter((code) => code && activeCatalogCodes.has(code)),
    };
}

export function canAccessModuleWithSnapshot({
    isSuperAdmin,
    modules,
    moduleCode,
}: {
    isSuperAdmin: 0 | 1;
    modules: AuthPermissionEntry[];
    moduleCode: string;
}): boolean {
    if (isSuperAdmin === 1) {
        return true;
    }

    if (INACTIVE_MODULE_CODES.has(moduleCode)) {
        return false;
    }

    const allowedRights = MODULE_ALLOWED_RIGHTS[moduleCode];
    if (allowedRights === undefined) {
        return false;
    }

    const userRights = findEntryRights(modules, moduleCode);
    if (userRights === null) {
        return false;
    }

    return hasFullRights(userRights, allowedRights);
}
