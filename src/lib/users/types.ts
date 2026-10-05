import type {
    AuthPermissionEntry,
    AuthPermissions,
} from "@/lib/auth/types";

export type NumericFlag = 0 | 1;

export type UserPermission = AuthPermissionEntry;
export type UserPermissions = AuthPermissions;

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
    by?: string;
    user: Partial<AppUser> & {
        username: string;
        password?: string;
    };
    permissions?: UserPermissions;
};

export type SaveUserRoutePayload = Omit<SaveUserPayload, "clientID" | "by">;

export type SaveUserResponse = GetUserResponse;
