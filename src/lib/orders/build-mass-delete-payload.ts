import type {
    MassDeletePayload,
    MassDeleteTableAction,
    OrderSubmitType,
} from "./order-submit-types";
import {
    validateBasketIds,
    validateMassDeleteSafety,
} from "./validation";

type BuildMassDeletePayloadParams = {
    clientID: string;
    basketIds: string[];
    tableAction: MassDeleteTableAction;
    method: "LINK_S1";
    s1Key: string;
    appUserId: string;
    submitType: OrderSubmitType;
};

export function buildMassDeletePayload({
    clientID,
    basketIds,
    tableAction,
    method,
    s1Key,
    appUserId,
    submitType,
}: BuildMassDeletePayloadParams): MassDeletePayload {
    validateBasketIds(basketIds);
    validateMassDeleteSafety({
        submitType,
        tableAction,
    });

    if (!s1Key.trim()) {
        throw new Error('Λείπει το αναγνωριστικό εγγράφου SoftOne για τη μαζική διαγραφή.');
    }

    if (!appUserId.trim()) {
        throw new Error('Λείπει το APPUSER_ID για τη μαζική διαγραφή.');
    }

    return {
        service: "SqlData",
        clientID,
        appId: "1305",
        SqlName: "MASS_DELETE",
        BASKET_IDS: basketIds.join(","),
        TABLE_ACTION: tableAction,
        METHOD: method,
        S1_KEY: s1Key,
        APPUSER_ID: appUserId,
    };
}
