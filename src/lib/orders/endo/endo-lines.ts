import {
    normalizeOrderLine,
    requireLines,
    type RawOrderItem,
} from "../shared/lines";
import { jsonSafeNumber } from "../validation";

export type EndoLine = {
    basketId: string;
    mtrl: number;
    qty: number;
    /** Branch that holds and sends the items -> SALDOC TRDBRANCH. */
    supplyingBranch: number;
    /** Branch that asked for the items -> MTRDOC BRANCHSEC / WHOUSESEC. */
    requestingBranch: number;
};

export type RawEndoItem = RawOrderItem & {
    supplyingBranch?: unknown;
    requestingBranch?: unknown;
};

function normalizeEndoLine(rawItem: RawEndoItem): EndoLine | null {
    const base = normalizeOrderLine(rawItem);

    if (!base) {
        return null;
    }

    const supplyingBranch = jsonSafeNumber(rawItem.supplyingBranch);
    const requestingBranch = jsonSafeNumber(rawItem.requestingBranch);

    // An ENDO always moves stock between two different branches.
    if (
        !supplyingBranch ||
        !requestingBranch ||
        supplyingBranch === requestingBranch
    ) {
        return null;
    }

    return { ...base, supplyingBranch, requestingBranch };
}

export function normalizeEndoLines(rawItems: RawEndoItem[]) {
    return requireLines(
        rawItems
            .map((rawItem) => normalizeEndoLine(rawItem))
            .filter((line): line is EndoLine => line !== null)
    );
}
