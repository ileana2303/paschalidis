/**
 * SoftOne often sends numeric values as strings (e.g. "11", "11,50").
 */
export function parseSoftOneNumber(value: unknown): number | null {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    if (typeof value === "boolean") {
        return null;
    }

    let raw = String(value).trim();
    if (!raw) {
        return null;
    }

    raw = raw.replace(/\s/g, "").replace(/€/g, "");

    // European thousands/decimal: 1.234,56 → 1234.56
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(raw)) {
        raw = raw.replace(/\./g, "").replace(",", ".");
    } else if (raw.includes(",") && !raw.includes(".")) {
        raw = raw.replace(",", ".");
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
}

export function parsePositiveNumber(value: unknown): number | null {
    const parsed = parseSoftOneNumber(value);
    if (parsed == null || parsed <= 0) {
        return null;
    }
    return parsed;
}

export function parsePositiveInt(value: unknown): number {
    const parsed = parseSoftOneNumber(value);
    if (parsed == null || parsed <= 0) {
        return 0;
    }
    return Math.floor(parsed);
}

export function parseNonNegativeInt(value: unknown): number {
    const parsed = parseSoftOneNumber(value);
    if (parsed == null || parsed < 0) {
        return 0;
    }
    return Math.floor(parsed);
}

export function formatEuro(value: unknown, fallback = "0.00 €"): string {
    const parsed = parseSoftOneNumber(value);
    if (parsed == null) {
        return fallback;
    }
    return `${parsed.toFixed(2)} €`;
}

export function formatElNumber(value: unknown): string {
    const parsed = parseSoftOneNumber(value) ?? 0;
    return new Intl.NumberFormat("el-GR", {
        maximumFractionDigits: 2,
    }).format(parsed);
}
