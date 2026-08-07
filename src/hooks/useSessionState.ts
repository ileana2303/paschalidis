"use client";

import { useEffect, useState } from "react";

export function useSessionState<T>(key: string, initialValue: T) {
    const [value, setValue] = useState<T>(initialValue);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(key);
            if (raw != null) {
                setValue(JSON.parse(raw) as T);
            }
        } catch {
            // Ignore invalid session payloads.
        }
        setHydrated(true);
    }, [key]);

    useEffect(() => {
        if (!hydrated) {
            return;
        }

        try {
            sessionStorage.setItem(key, JSON.stringify(value));
        } catch {
            // Ignore quota / private-mode write failures.
        }
    }, [hydrated, key, value]);

    return [value, setValue] as const;
}
