export interface LoginRequest {
    username: string;
    password: string;
    rememberMe?: boolean;
}

export interface AuthUser {
    username: string;
    fname: string;
    lname: string;
    role: string;
    mainBranch: string;
    isSuperAdmin: number;
    isCustomer: number;
    trdr: number;
}

export interface AuthPermissionEntry {
    code: string;
    rights: number;
}

export interface AuthPermissions {
    modules: AuthPermissionEntry[];
    features: AuthPermissionEntry[];
    branches: string[];
}

/** Response returned by the SoftOne login service. */
export interface SoftOneLoginResponse {
    success: boolean;
    user?: AuthUser;
    permissions?: AuthPermissions;
    error?: string;
}

/** Response returned by the app's /api/auth/login route. */
export interface LoginResponse {
    result: boolean;
    message: string;
    type?: "success" | "error";
    redirectlink?: string;
    user?: AuthUser;
    permissions?: AuthPermissions;
}

export function getAuthUserFullName(user: AuthUser | null | undefined) {
    return [user?.fname, user?.lname]
        .map((part) => String(part ?? "").trim())
        .filter(Boolean)
        .join(" ");
}
