import { callMassDelete } from "@/app/api/mass-delete/mass-delete";
import type {
    MassDeleteTableAction,
    OrderSubmitType,
} from "../order-submit-types";

type LinkBasketRowsToDocumentParams = {
    /** SQL clientID (`S1_CLIENT_ID`), not the setData one. */
    sqlClientID: string;
    basketIds: string[];
    tableAction: MassDeleteTableAction;
    submitType: OrderSubmitType;
    /** SoftOne document id returned by setData. */
    documentId: string;
    appUserId: string;
    logLabel: string;
};

/**
 * MASS_DELETE / METHOD=LINK_S1: clears the submitted basket rows and links them
 * to the SoftOne document that was just created. Always runs after a successful
 * setData - per line for ENDO, once per order for CUST BASKET and ANATROF.
 */
export async function linkBasketRowsToDocument({
    sqlClientID,
    basketIds,
    tableAction,
    submitType,
    documentId,
    appUserId,
    logLabel,
}: LinkBasketRowsToDocumentParams) {
    console.info(
        `${logLabel} MASS_DELETE LINK_S1 ${tableAction} basketIds=${basketIds.join(",")} S1_KEY=${documentId}`
    );

    return callMassDelete({
        clientID: sqlClientID,
        basketIds,
        tableAction,
        method: "LINK_S1",
        s1Key: documentId,
        appUserId,
        logLabel,
        submitType,
    });
}
