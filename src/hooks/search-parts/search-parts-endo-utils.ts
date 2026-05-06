import type { IEndoListRow, IItem } from "@/lib/interface";
import type { EndoBasketUiItem } from "@/components/endo/endo-order-summary";

export function getBranchCodesFromItem(item: IItem) {
    const codes = new Set<string>();

    Object.keys(item).forEach((key) => {
        const match = key.match(/^YP(\d+)$/i);
        if (match?.[1]) {
            codes.add(match[1]);
        }
    });

    return Array.from(codes);
}

export function getEndoQtyKey(mtrl: string | number, sourceBranch: string) {
    return `${mtrl}:${sourceBranch}`;
}

export function getEndoItemKey(item: IItem) {
    return `${item.ITEM_CODE}-${item.MTRL}`;
}

function parsePositiveInt(value: unknown) {
    const parsed = Number(String(value ?? "").trim().replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
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
