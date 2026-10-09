"use client";

import { useEffect } from "react";

export const REQUEST_LIST_REFETCH_INTERVAL_MS = 60_000;

type RequestListIntervalRefreshOptions = {
    enabled?: boolean;
    refetch: () => void | Promise<unknown>;
};

export function useRequestListIntervalRefresh({
    enabled = true,
    refetch,
}: RequestListIntervalRefreshOptions) {
    useEffect(() => {
        if (!enabled) {
            return;
        }

        const intervalId = window.setInterval(() => {
            void refetch();
        }, REQUEST_LIST_REFETCH_INTERVAL_MS);

        return () => window.clearInterval(intervalId);
    }, [enabled, refetch]);
}
