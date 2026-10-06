import {
    setDataEnvelope,
    type BasketSetDataIteLine,
    type SetDataEnvelope,
} from "../shared/setdata-envelope";

/** SALDOC header of a customer order (Παραγγελία Πελάτη). */
export type BasketSaldoc = {
    SERIES: string;
    TRDR: number;
    TRDBRANCH: number;
    PAYMENT: number;
    TRUCKS: number;
    DELIVDATE: string;
    COMMENTS: string;
    REMARKS: string;
    SHIPKIND: number;
    SOCASH: number;
    VARCHAR02: "S1";
    CCCEXTUSER: string;
};

export type BasketMtrdoc = {
    TRUCKS: number;
    DELIVDATE: string;
    DEPTRDR_CUSTOMER_CODE: "";
    BILLTRDR_CUSTOMER_CODE: "";
};

export type BasketSetDataPayload = SetDataEnvelope<{
    SALDOC: [BasketSaldoc];
    MTRDOC: [BasketMtrdoc];
    ITELINES: BasketSetDataIteLine[];
}>;

export type BuildBasketPayloadParams = {
    /** setData clientID of the branch that sends the order. */
    clientID: string;
    /** Per-branch SALDOC series (7002 / 17002 / 27002). */
    series: string;
    /** The customer. */
    trdr: number;
    /** TRDBRANCH of the customer. */
    trdBranch: number;
    payment: number;
    trucks: number;
    deliveryDate: string;
    comments: string;
    /** Free-text notes typed by the user. */
    remarks: string;
    shipKind: number;
    socash: number;
    cccExtUser: string;
    lines: BasketSetDataIteLine[];
};

/**
 * Builds the complete CUST BASKET setData payload. Pure: no env reads, no branch
 * lookups - what you see here is exactly what is POSTed to S1_BASKET_ENDPOINT.
 *
 * Unlike ENDO, a customer order carries no BRANCHSEC/WHOUSESEC and is submitted
 * as one document for the whole basket.
 */
export function buildBasketPayload({
    clientID,
    series,
    trdr,
    trdBranch,
    payment,
    trucks,
    deliveryDate,
    comments,
    remarks,
    shipKind,
    socash,
    cccExtUser,
    lines,
}: BuildBasketPayloadParams): BasketSetDataPayload {
    return setDataEnvelope(clientID, {
        SALDOC: [
            {
                SERIES: series, // per sending branch
                TRDR: trdr, // customer
                TRDBRANCH: trdBranch, // customer branch
                PAYMENT: payment,
                TRUCKS: trucks,
                DELIVDATE: deliveryDate,
                COMMENTS: comments, // KALATHI PELATI
                REMARKS: remarks, // user notes
                SHIPKIND: shipKind,
                SOCASH: socash,
                VARCHAR02: "S1", // initial Picking List workflow status
                CCCEXTUSER: cccExtUser,
            },
        ],
        MTRDOC: [
            {
                TRUCKS: trucks,
                DELIVDATE: deliveryDate,
                DEPTRDR_CUSTOMER_CODE: "", // fixed
                BILLTRDR_CUSTOMER_CODE: "", // fixed
            },
        ],
        ITELINES: lines,
    });
}
