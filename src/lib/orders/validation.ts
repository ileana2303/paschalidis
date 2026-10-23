import type {
    MassDeleteTableAction,
    OrderSubmitType,
} from "./order-submit-types";
import { ANATROF_TABLE_ACTION } from "./anatrof/anatrof-constants";
import { BASKET_TABLE_ACTION } from "./customer-basket/basket-constants";
import { ENDO_TABLE_ACTION } from "./endo/endo-constants";
import { SUPPLIER_BASKET_TABLE_ACTION } from "./supplier-basket/supplier-basket-constants";

const tableActionBySubmitType = {
    basket: BASKET_TABLE_ACTION,
    endo: ENDO_TABLE_ACTION,
    anatrof: ANATROF_TABLE_ACTION,
    "supplier-basket": SUPPLIER_BASKET_TABLE_ACTION,
} satisfies Record<OrderSubmitType, MassDeleteTableAction>;

const massDeleteTableActions = new Set<unknown>(
    Object.values(tableActionBySubmitType)
);

export function jsonSafeNumber(value: unknown): number | undefined {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return undefined;
    }

    return parsed;
}

export function resolveIsoDate(value: unknown) {
    const rawValue = String(value ?? "").trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
        return rawValue;
    }

    if (/^\d{4}-\d{2}-\d{2}T/.test(rawValue)) {
        return rawValue.slice(0, 10);
    }

    return new Date().toISOString().slice(0, 10);
}

export function validateBasketIds(basketIds: string[]) {
    if (!basketIds.length) {
        throw new Error('Δεν βρέθηκαν αναγνωριστικά καλαθιού για εκκαθάριση.');
    }

    const invalidBasketId = basketIds.find((id) => {
        const cleaned = String(id ?? "").trim();
        return !cleaned || cleaned === "0";
    });

    if (invalidBasketId) {
        throw new Error(`Μη έγκυρο αναγνωριστικό καλαθιού: ${invalidBasketId}`);
    }
}

export function uniqueBasketIds(lines: Array<{ basketId: string }>) {
    return [...new Set(lines.map((line) => String(line.basketId).trim()))];
}

export function validateMassDeleteSafety(params: {
    submitType: OrderSubmitType;
    tableAction: MassDeleteTableAction;
}) {
    const expected = tableActionBySubmitType[params.submitType];

    if (params.tableAction !== expected) {
        throw new Error('Μη ασφαλής ρύθμιση μαζικής διαγραφής για τον τύπο υποβολής.');
    }
}

export function isMassDeleteTableAction(
    value: unknown
): value is MassDeleteTableAction {
    return massDeleteTableActions.has(value);
}
