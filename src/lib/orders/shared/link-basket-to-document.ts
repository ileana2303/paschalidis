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

// These are the same values used by the working manual basket-delete route.
// DELETE does not link to a document; S1_KEY identifies the application and
// APPUSER_ID is the SoftOne system user used for basket maintenance actions.
const DELETE_S1_KEY = "1305";
const DELETE_APPUSER_ID = "00000001-0001-0001-0001-000000000001";

/**
 * Runs after a successful setData. LINK_S1 preserves the relationship to the
 * newly-created SoftOne document, then DELETE explicitly removes the source
 * rows so they cannot remain visible or be submitted again.
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

    const linkResult = await callMassDelete({
        clientID: sqlClientID,
        basketIds,
        tableAction,
        method: "LINK_S1",
        s1Key: documentId,
        appUserId,
        logLabel,
        submitType,
    });

    console.info(
        `${logLabel} MASS_DELETE LINK_S1 ok basketIds=${basketIds.join(",")} S1_KEY=${documentId}`
    );

    console.info(
        `${logLabel} MASS_DELETE DELETE ${tableAction} basketIds=${basketIds.join(",")}`
    );

    const deleteResult = await callMassDelete({
        clientID: sqlClientID,
        basketIds,
        tableAction,
        method: "DELETE",
        s1Key: DELETE_S1_KEY,
        appUserId: DELETE_APPUSER_ID,
        logLabel,
    });

    console.info(
        `${logLabel} MASS_DELETE DELETE ok basketIds=${basketIds.join(",")}`
    );

    return {
        link: linkResult,
        delete: deleteResult,
    };
}
