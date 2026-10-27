import type { IBasePricePurItemRow, IBasePricePurListRow } from "./types";

export type PriceTierKey = "W" | "01" | "02" | "03" | "04" | "05";

export const PRICE_TIER_LABELS: Record<PriceTierKey, string> = {
    W: "Χονδρική",
    "01": "01",
    "02": "02",
    "03": "03",
    "04": "04",
    "05": "05",
};

export function tierChanges(row: IBasePricePurListRow | IBasePricePurItemRow) {
    return (["W", "01", "02", "03", "04", "05"] as PriceTierKey[]).filter(
        (tier) => row[`CH_${tier}` as keyof typeof row] === "1"
    );
}

export function matchesBasePricePurSearch(
    query: string,
    fincode: string,
    supplier: string,
    parastatiko: string
) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return true;

    const haystack = [fincode, supplier, parastatiko]
        .join(" ")
        .toLowerCase();

    return haystack.includes(normalized);
}

export function formatTrnDate(value: string) {
    const raw = String(value ?? "").trim();
    if (!raw) return "—";

    const datePart = raw.split(" ")[0];
    const [year, month, day] = datePart.split("-");

    if (year && month && day) {
        return `${day}/${month}/${year}`;
    }

    return raw;
}
