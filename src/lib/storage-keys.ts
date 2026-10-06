const APP_STORAGE_PREFIX = "paschalidis";

function getStorageEnvironment(): string {
    const explicit = process.env.NEXT_PUBLIC_APP_ENV?.trim();

    if (explicit) {
        return explicit;
    }

    return process.env.NODE_ENV === "production" ? "prod" : "dev";
}

/** Namespaced key for localStorage / sessionStorage (dev vs prod / staging). */
export function storageKey(name: string): string {
    return `${APP_STORAGE_PREFIX}:${getStorageEnvironment()}:${name}`;
}

const LEGACY_STORAGE_KEYS = [
    "auth-user-account",
    "customer-storage",
    "search-parts-storage",
    "customer-search-storage",
    "edit-items-search-storage",
    "search-set-similar-storage",
    "search-endo-storage",
    "theme",
    "picking-list-search",
    "stock-requests-search",
    "stock-requests-notes",
    "stock-feedback-search",
    "basket-pickup-point",
    "basket-notes",
    "all-baskets-search-input",
    "all-baskets-applied-search",
    "price-requests-search",
] as const;

function isNamespacedAppKey(key: string): boolean {
    return key.startsWith(`${APP_STORAGE_PREFIX}:`);
}

function removeKeysFromStorage(storage: Storage, shouldRemove: (key: string) => boolean) {
    const keysToRemove: string[] = [];

    for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);

        if (key && shouldRemove(key)) {
            keysToRemove.push(key);
        }
    }

    for (const key of keysToRemove) {
        storage.removeItem(key);
    }
}

/** Clears persisted app state (local + session) on logout. */
export function clearAppStorage(): void {
    if (typeof window === "undefined") {
        return;
    }

    removeKeysFromStorage(localStorage, isNamespacedAppKey);
    removeKeysFromStorage(sessionStorage, isNamespacedAppKey);

    for (const key of LEGACY_STORAGE_KEYS) {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    }

    removeKeysFromStorage(sessionStorage, (key) =>
        key.startsWith("endo-list-search-")
    );
}
