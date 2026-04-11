/**
 * Mirrors the ASP.NET AppUser entity (AppUser.cs + BaseEntity.cs).
 * This is the shape returned by the AppUsers table query.
 */
export interface AppUser {
    // BaseEntity fields
    Id: number;
    Uid: string;           // uniqueidentifier (Guid) in SQL Server
    DateIn: string | null;
    DateUpdated: string | null;
    DateDeleted: string | null;
    CreatedBy: string | null;
    LastUpdatedBy: string | null;
    DeletedBy: string | null;

    // AppUser fields
    Username: string;
    Password: string;
    Soft1_Code: string | null;
    Fname: string;
    Lname: string;
    Email: string;
    Mobile: string | null;
    PinCode: string | null;
    Role: string;
    IsActive: number | null;
    IsSuperAdmin: number | null;
}

/**
 * JWT payload — matches the claims from AuthService.cs CreateClaimsFromUser.
 */
export interface UserSession {
    username: string;
    fullName: string;
    userEmail: string;
    userUID: string;
    userRole: string;
    userIsSuperAdmin: string;
    dateIn: string;
}

/**
 * Matches LoginViewModel.cs
 */
export interface LoginRequest {
    username: string;
    password: string;
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
}
