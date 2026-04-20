/**
 * Matches LoginViewModel.cs
 */
export interface LoginRequest {
    username: string;
    password: string;
    rememberMe?: boolean;
}

export interface ExternalLoginListAccessItem {
    name: string;
    code: string;
}

export interface ExternalLoginListBranchItem {
    name: string;
    s1Code: string;
}

export interface ExternalLoginUserAccount {
    username: string;
    fullName: string;
    email: string;
    role: string;
    uid: string;
    s1code: string;
    listAccess: ExternalLoginListAccessItem[];
    listBranches: ExternalLoginListBranchItem[];
}

export interface ExternalLoginResponse {
    statusCode: number;
    message: string;
    detailedMessage: string;
    userAccount?: ExternalLoginUserAccount;
}

/**
 * Matches ToastMessage.cs — the JSON shape the login API returns.
 */
export interface ToastMessage {
    result: boolean;
    message: string;
    type?: string;
    exmessage?: string;
    redirectlink?: string;
    userAccount?: ExternalLoginUserAccount;
}
