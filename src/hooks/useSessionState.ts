"use client";

import { useEffect, useState } from "react";
import { storageKey } from "@/lib/storage-keys";

export function useSessionState<T>(key: string, initialValue: T) {
    const [value, setValue] = useState<T>(initialValue);
    const [hydrated, setHydrated] = useState(false);
    const namespacedKey = storageKey(key);

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(namespacedKey);
            if (raw != null) {
                setValue(JSON.parse(raw) as T);
            }
        } catch {
            // Ignore invalid session payloads.
        }
        setHydrated(true);
    }, [namespacedKey]);

    useEffect(() => {
        if (!hydrated) {
            return;
        }

        try {
            sessionStorage.setItem(namespacedKey, JSON.stringify(value));
        } catch {
            // Ignore quota / private-mode write failures.
        }
    }, [hydrated, namespacedKey, value]);

    return [value, setValue] as const;
}
