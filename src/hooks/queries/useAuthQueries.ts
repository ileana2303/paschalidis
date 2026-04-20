"use client";

import { useMutation } from "@tanstack/react-query";
import { httpClient } from "@/lib/http/client";
import type { ToastMessage } from "@/lib/auth/types";

export function useLoginMutation() {
    return useMutation({
        mutationFn: async (payload: {
            username: string;
            password: string;
            rememberMe: boolean;
        }) => {
            const { data } = await httpClient.post<ToastMessage>(
                "/api/auth/login",
                payload
            );
            return data;
        },
    });
}

export function useLogoutMutation() {
    return useMutation({
        mutationFn: async () => {
            await httpClient.post("/api/auth/logout");
        },
    });
}

