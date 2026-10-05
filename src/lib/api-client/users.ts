import axios from "axios";
import { httpClient } from "@/lib/http/client";
import type {
    GetUserResponse,
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
        const { data } = await httpClient.post<GetUserResponse>("/api/users", {
            ...(username?.trim() ? { username: username.trim() } : {}),
        });

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
