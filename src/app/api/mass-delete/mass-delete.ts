import type { BasketMassDeletePayload } from "@/lib/interface";
import { parseJsonWithEncodingFallback, postSoftOne } from "@/lib/softone";

export class MassDeleteError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = "MassDeleteError";
        this.status = status;
    }
}

interface CallMassDeleteParams {
    clientID: string;
    basketIds: Array<string | number>;
    tableAction: string;
    method: string;
    s1Key: string | number;
    appUserId: string;
    logLabel: string;
}

interface MassDeleteResponseData {
    success?: boolean;
    message?: string;
    rows?: Array<{ MESSAGE_TO_CALLER?: string } | Record<string, unknown>>;
}

export function getMassDeleteMessage(data: MassDeleteResponseData) {
    if (data.message) {
        return data.message;
    }

    const firstRow = data.rows?.[0];
    if (
        firstRow &&
        typeof firstRow === "object" &&
        "MESSAGE_TO_CALLER" in firstRow &&
        typeof firstRow.MESSAGE_TO_CALLER === "string"
    ) {
        return firstRow.MESSAGE_TO_CALLER;
    }

    return undefined;
}

export async function callMassDelete({
    clientID,
    basketIds,
    tableAction,
    method,
    s1Key,
    appUserId,
    logLabel,
}: CallMassDeleteParams) {
    const normalizedIds = basketIds
        .map((id) => String(id).trim())
        .filter(Boolean);

    if (normalizedIds.length === 0) {
        throw new MassDeleteError("No BASKET IDs provided", 400);
    }

    const payload: BasketMassDeletePayload = {
        service: "SqlData",
        clientID,
        appId: "1305",
        SqlName: "MASS_DELETE",
        BASKET_IDS: normalizedIds.join(","),
        TABLE_ACTION: tableAction,
        METHOD: method,
        S1_KEY: String(s1Key),
        APPUSER_ID: appUserId,
    };

    const response = await postSoftOne(payload);

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`${logLabel} mass-delete error body:`, errorText);

        throw new MassDeleteError("Upstream mass-delete request failed", response.status);
    }

    const data = await parseJsonWithEncodingFallback(response) as MassDeleteResponseData;

    if (data?.success === false) {
        throw new MassDeleteError(
            getMassDeleteMessage(data) ?? "Mass delete failed",
            502
        );
    }

    return {
        data,
        message: getMassDeleteMessage(data),
    };
}
