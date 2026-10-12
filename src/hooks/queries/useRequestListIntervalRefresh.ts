"use client";

import { useEffect, useEffectEvent } from "react";

export const REQUEST_LIST_REFETCH_INTERVAL_MS = 60_000;

type RequestListIntervalRefreshOptions = {
    enabled?: boolean;
    refetch: () => void | Promise<unknown>;
};

export function useRequestListIntervalRefresh({
    enabled = true,
    refetch,
}: RequestListIntervalRefreshOptions) {
    const refresh = useEffectEvent(refetch);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const intervalId = window.setInterval(() => {
            void refresh();
        }, REQUEST_LIST_REFETCH_INTERVAL_MS);

        return () => window.clearInterval(intervalId);
    }, [enabled]);
}
