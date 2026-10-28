import axios from "axios";
import { httpClient } from "@/lib/http/client";
import type {
    DeletePermsItem,
    GetUserResponse,
    ListPermsResponse,
    PermissionCatalog,
    SavePermsItem,
    SaveUserResponse,
    SaveUserRoutePayload,
} from "@/lib/users/types";

function getUsersError(error: unknown, fallbackMessage: string) {
    if (axios.isAxiosError(error)) {
        const response = error.response?.data as
            | { error?: unknown; message?: unknown }
            | undefined;
        const message = response?.error ?? response?.message;

        if (typeof message === "string" && message.trim()) {
            return new Error(message.trim());
        }
    }

    return error instanceof Error ? error : new Error(fallbackMessage);
}

export async function fetchUsers(username?: string): Promise<GetUserResponse> {
    try {
        const normalizedUsername = username?.trim();
        const { data } = normalizedUsername
            ? await httpClient.post<GetUserResponse>("/api/users", {
                  username: normalizedUsername,
              })
            : await httpClient.get<GetUserResponse>("/api/users");

        return data;
    } catch (error) {
        throw getUsersError(error, "Αποτυχία φόρτωσης χρηστών.");
    }
}

export async function saveUser(
    payload: SaveUserRoutePayload
): Promise<SaveUserResponse> {
    try {
        const { data } = await httpClient.patch<SaveUserResponse>(
            "/api/users",
            payload
        );

        if (data.success !== true) {
            throw new Error(data.error?.trim() || "Η αποθήκευση δεν ολοκληρώθηκε.");
        }

        return data;
    } catch (error) {
        throw getUsersError(error, "Η αποθήκευση δεν ολοκληρώθηκε.");
    }
}

function toCatalog(data: ListPermsResponse, fallbackMessage: string): PermissionCatalog {
    if (data.success !== true) {
        throw new Error(data.error?.trim() || fallbackMessage);
    }

    return {
        modules: data.modules ?? [],
        features: data.features ?? [],
        branches: data.branches ?? [],
    };
}

export async function fetchPermissionCatalog(): Promise<PermissionCatalog> {
    const fallbackMessage = "Αποτυχία φόρτωσης δικαιωμάτων.";

    try {
        const { data } = await httpClient.get<ListPermsResponse>(
            "/api/users/permissions"
        );
        return toCatalog(data, fallbackMessage);
    } catch (error) {
        throw getUsersError(error, fallbackMessage);
    }
}

/** savePerms; resolves to the full updated catalog. */
export async function savePermissionCatalogItems(
    items: SavePermsItem[]
): Promise<PermissionCatalog> {
    const fallbackMessage = "Η αποθήκευση δικαιώματος δεν ολοκληρώθηκε.";

    try {
        const { data } = await httpClient.post<ListPermsResponse>(
            "/api/users/permissions",
            { items }
        );
        return toCatalog(data, fallbackMessage);
    } catch (error) {
        throw getUsersError(error, fallbackMessage);
    }
}

/** deletePerms; resolves to the full catalog without the deleted items. */
export async function deletePermissionCatalogItems(
    items: DeletePermsItem[]
): Promise<PermissionCatalog> {
    const fallbackMessage = "Η διαγραφή δικαιώματος δεν ολοκληρώθηκε.";

    try {
        const { data } = await httpClient.delete<ListPermsResponse>(
            "/api/users/permissions",
            { data: { items } }
        );
        return toCatalog(data, fallbackMessage);
    } catch (error) {
        throw getUsersError(error, fallbackMessage);
    }
}
