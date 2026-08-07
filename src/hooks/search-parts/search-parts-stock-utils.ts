export { getItemFieldValue } from "@/lib/utils/endo";
import { parseSoftOneNumber } from "@/lib/utils/number";

export function parseStockValue(value: unknown) {
    const parsed = parseSoftOneNumber(value);
    if (parsed == null) {
        return 0;
    }

    return parsed;
}

export function parseAvailableStock(value: unknown) {
    const parsed = parseSoftOneNumber(value);
    if (parsed == null || parsed <= 0) {
        return 0;
    }

    return Math.floor(parsed);
}
