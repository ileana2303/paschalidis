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

/** Active permission codes returned by login. Absent code = not allowed. */
export interface AuthPermissions {
    modules: string[];
    features: string[];
    branches: string[];
}

/** Response returned by the SoftOne login service. */
export interface SoftOneLoginResponse {
    success: boolean;
    user?: AuthUser;
    permissions?: unknown;
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
