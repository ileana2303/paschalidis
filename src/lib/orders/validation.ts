import type {
    MassDeleteTableAction,
    OrderSubmitLine,
    OrderSubmitType,
} from "./order-submit-types";

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
        throw new Error("No basket IDs found for cleanup.");
    }

    const invalidBasketId = basketIds.find((id) => {
        const cleaned = String(id ?? "").trim();
        return !cleaned || cleaned === "0";
    });

    if (invalidBasketId) {
        throw new Error(`Invalid basket ID: ${invalidBasketId}`);
    }
}

export function uniqueBasketIds(lines: OrderSubmitLine[]) {
    return [...new Set(lines.map((line) => String(line.basketId).trim()))];
}

export function validateMassDeleteSafety(params: {
    submitType: OrderSubmitType;
    tableAction: MassDeleteTableAction;
}) {
    const expectedTableActionByType: Record<OrderSubmitType, MassDeleteTableAction> =
        {
            basket: "USRCUST",
            endo: "ENDO",
            anatrof: "ANATROF",
        };

    const expected = expectedTableActionByType[params.submitType];

    if (params.tableAction !== expected) {
        throw new Error(
            `Unsafe MASS_DELETE configuration. ${params.submitType} must use TABLE_ACTION=${expected}, received ${params.tableAction}.`
        );
    }
}

export function isMassDeleteTableAction(
    value: unknown
): value is MassDeleteTableAction {
    return value === "USRCUST" || value === "ENDO" || value === "ANATROF";
}

export function normalizeSubmitLine(
    rawItem: {
        basketId?: unknown;
        basketIds?: unknown;
        mtrl?: unknown;
        MTRL?: unknown;
        qty?: unknown;
        QTY1?: unknown;
        sourceBranch?: unknown;
        destinationBranch?: unknown;
        branch?: unknown;
        toBranch?: unknown;
    },
    submitType: OrderSubmitType
): OrderSubmitLine | null {
    const mtrl = jsonSafeNumber(rawItem.mtrl ?? rawItem.MTRL);
    const qty = jsonSafeNumber(rawItem.qty ?? rawItem.QTY1);

    const basketId =
        String(rawItem.basketId ?? "").trim() ||
        (Array.isArray(rawItem.basketIds)
            ? String(rawItem.basketIds[0] ?? "").trim()
            : "");

    if (!mtrl || !qty || !basketId) {
        return null;
    }

    if (submitType === "endo") {
        const sourceBranch = jsonSafeNumber(
            rawItem.sourceBranch ?? rawItem.toBranch
        );
        const destinationBranch = jsonSafeNumber(
            rawItem.destinationBranch ?? rawItem.branch
        );

        if (!sourceBranch || !destinationBranch) {
            return null;
        }

        if (sourceBranch === destinationBranch) {
            return null;
        }

        return {
            basketId,
            mtrl,
            qty,
            sourceBranch,
            destinationBranch,
        };
    }

    return {
        basketId,
        mtrl,
        qty,
    };
}
