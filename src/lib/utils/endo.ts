import type { IEndoListRow, IItem } from "@/lib/interface";
import type { EndoBasketUiItem } from "@/components/endo/endo-order-summary";
import { parsePositiveInt, parseSoftOneNumber } from "@/lib/utils/number";

export function getItemFieldValue(item: IItem, key: string) {
    return (item as unknown as Record<string, unknown>)[key];
}

const ITEM_STOCK_KEY_BY_BRANCH_CODE: Record<string, string> = {
    // SoftOne exposes Κασομούλη (branch 1000) in the legacy YP1000 column.
    "1000": "YP1000",
    "1006": "YP1006",
    "1007": "YP1007",
};

const ITEM_LOCATION_KEY_BY_BRANCH_CODE: Record<string, string> = {
    "1000": "THESI1000",
    "1006": "THESI1006",
    "1007": "THESI1007",
};

export function getItemStockForBranch(item: IItem, branchCode: string) {
    const normalizedBranchCode = String(branchCode ?? "").trim();

    if (!normalizedBranchCode) {
        return null;
    }

    const stockKey =
        ITEM_STOCK_KEY_BY_BRANCH_CODE[normalizedBranchCode] ??
        `YP${normalizedBranchCode}`;
    const value = getItemFieldValue(item, stockKey);

    return value == null ? null : parseStockValue(value);
}

export function getItemLocationForBranch(item: IItem, branchCode: string) {
    const normalizedBranchCode = String(branchCode ?? "").trim();

    if (!normalizedBranchCode) {
        return "";
    }

    const locationKey =
        ITEM_LOCATION_KEY_BY_BRANCH_CODE[normalizedBranchCode] ??
        `THESI${normalizedBranchCode}`;

    return String(getItemFieldValue(item, locationKey) ?? "").trim();
}

export function getBranchCodesFromItem(item: IItem) {
    const codes = new Set<string>();

    Object.keys(item).forEach((key) => {
        const match = key.match(/^YP(\d+)$/i);
        if (match?.[1]) {
            // YP1000 belongs to branch 1000; 1001 is the ERP stock-column suffix.
            codes.add(match[1] === "1001" ? "1000" : match[1]);
        }
    });

    return Array.from(codes);
}

export function getEndoItemKey(item: IItem) {
    return `${item.ITEM_CODE}-${item.MTRL}`;
}

export function getEndoQtyKey(mtrl: string | number, sourceBranch: string) {
    return `${mtrl}:${sourceBranch}`;
}

export function parseStockValue(value: unknown) {
    const parsed = parseSoftOneNumber(value);
    if (parsed == null || parsed <= 0) {
        return 0;
    }
    return Math.floor(parsed);
}

export function mapEndoRequestedRows(
    rows: IEndoListRow[],
    currentBranchCode: string
): EndoBasketUiItem[] {
    return rows
        .map((row, index) => {
            const basketId = String(row.BASKETID ?? row.ID ?? "").trim();
            const mtrl = parsePositiveInt(row.MTRL);
            const qty = parsePositiveInt(row.QTY || row.QTY_REQUESTED);
            const rowBranch = String(row.BRANCH ?? "").trim();
            const rowToBranch = String(row.TO_BRANCH ?? "").trim();
            let fromBranch = rowToBranch || rowBranch;
            let toBranch = rowBranch || currentBranchCode;

            if (!fromBranch) {
                fromBranch = "-";
            }

            return {
                uid: basketId ? `endo-${basketId}` : `endo-row-${index}`,
                basketIds: basketId ? [basketId] : [],
                mtrl,
                qty,
                fromBranch,
                toBranch,
                itemCode: String(row.ITEM_CODE ?? row.CODE ?? mtrl ?? "").trim(),
                itemDescr: String(
                    row.ITEM_DESCR ?? row.ITEM_NAME ?? row.NAME ?? "—"
                ).trim(),
                manufacturer: String(row.MNF_DESCR ?? row.MANUFACTURER ?? "").trim(),
            } as EndoBasketUiItem;
        })
        .filter((row) => row.mtrl > 0 && row.qty > 0);
}

const BRANCH_RENDER_PRIORITY: Record<string, number> = {
    "1006": 0,
    "1000": 1,
    "1007": 2,
};

function getBranchRenderPriority(branchCode: string) {
    return BRANCH_RENDER_PRIORITY[branchCode] ?? 1000 + Number(branchCode);
}

/** Orders branches by the ERP-preferred pick order, then by code. */
export function sortEndoBranches<T extends { code: string }>(branches: T[]) {
    return [...branches].sort((a, b) => {
        const priorityDiff =
            getBranchRenderPriority(a.code) - getBranchRenderPriority(b.code);

        if (priorityDiff !== 0) {
            return priorityDiff;
        }

        return a.code.localeCompare(b.code, "el-GR", { numeric: true });
    });
}
