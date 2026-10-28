export type NumericFlag = 0 | 1;

/** Per-user permission as returned by getUser (explicitly disabled items included). */
export type UserPermission = {
    code: string;
    isActive: NumericFlag;
};

export type UserPermissions = {
    modules: UserPermission[];
    features: UserPermission[];
    branches: UserPermission[];
};

/** saveUser item: a code string (active) or an explicitly disabled entry. */
export type SaveUserPermissionItem = string | { code: string; isActive: 0 };

export type SaveUserPermissions = {
    modules: SaveUserPermissionItem[];
    features: SaveUserPermissionItem[];
    branches: SaveUserPermissionItem[];
};

export type AppUser = {
    username: string;
    fname?: string;
    lname?: string;
    email?: string;
    mobile?: string;
    role?: string;
    mainBranch?: string;
    isActive: NumericFlag;
    isSuperAdmin: NumericFlag;
    isCustomer: NumericFlag;
    trdr: number;
};

export type UserWithPermissions = {
    user: AppUser;
    permissions: UserPermissions;
};

export type GetUserPayload = {
    clientID: string;
    username?: string;
};

export type GetUserRoutePayload = {
    username?: string;
};

export type GetUserResponse = {
    success: boolean;
    count?: number;
    users?: UserWithPermissions[];
    error?: string;
};

export type SaveUserPayload = {
    clientID: string;
    by: string;
    user: Partial<AppUser> & {
        username: string;
        password?: string;
    };
    permissions?: SaveUserPermissions;
};

export type SaveUserRoutePayload = Omit<SaveUserPayload, "clientID" | "by">;

export type SaveUserResponse = GetUserResponse;

/** Permission catalog entry from listPerms. */
export type PermissionCatalogEntry = {
    code: string;
    parent: string;
    descr: string;
    isActive: NumericFlag;
};

export type PermissionCatalog = {
    modules: PermissionCatalogEntry[];
    features: PermissionCatalogEntry[];
    branches: PermissionCatalogEntry[];
};

export type ListPermsResponse = Partial<PermissionCatalog> & {
    success: boolean;
    error?: string;
};

export type PermissionCatalogType = "MODULE" | "FEATURE" | "BRANCH";

/** savePerms item: only the sent fields change on an existing type + code. */
export type SavePermsItem = {
    type: PermissionCatalogType;
    code: string;
    parent?: string;
    descr?: string;
    isActive?: NumericFlag;
};

export type DeletePermsItem = {
    type: PermissionCatalogType;
    code: string;
};
