import { formatEuro, parsePositiveNumber } from "@/lib/utils/number";

export function parsePositivePrice(value: unknown): number | null {
    return parsePositiveNumber(value);
}

export function formatPrice(value: unknown) {
    const parsed = parsePositivePrice(value);

    if (parsed == null) {
        const fallback = String(value ?? "").trim();

        return fallback || "—";
    }

    return formatEuro(parsed);
}

export function normalizeBasketId(value: unknown) {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}
