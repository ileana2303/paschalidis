import {
    setDataEnvelope,
    type BasketSetDataIteLine,
    type SetDataEnvelope,
} from "../shared/setdata-envelope";
import {
    BASKET_INVOICE_COMMENTS,
    BASKET_RECEIPT_COMMENTS,
    BASKET_RETAIL_TRDR,
    type BasketReceiptType,
} from "./basket-constants";

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
    /** The real selected customer's TRDR, including for retail comments. */
    customerTrdr: number;
    receiptType: BasketReceiptType;
    /** TRDBRANCH of the customer. */
    trdBranch: number;
    payment: number;
    trucks: number;
    deliveryDate: string;
    /** Free-text notes typed by the user. */
    remarks: string;
    shipKind: number;
    socash: number;
    cccExtUser: string;
    lines: BasketSetDataIteLine[];
};

/**
 * Builds the complete customer basket setData payload. Pure: no env reads, no branch
 * lookups - what you see here is exactly what is POSTed to S1_BASKET_ENDPOINT.
 *
 * Unlike ENDO, a customer order carries no BRANCHSEC/WHOUSESEC and is submitted
 * as one document for the whole basket.
 */
export function buildBasketPayload({
    clientID,
    series,
    customerTrdr,
    receiptType,
    trdBranch,
    payment,
    trucks,
    deliveryDate,
    remarks,
    shipKind,
    socash,
    cccExtUser,
    lines,
}: BuildBasketPayloadParams): BasketSetDataPayload {
    const isReceipt = receiptType === "receipt";

    return setDataEnvelope(clientID, {
        SALDOC: [
            {
                SERIES: series,
                TRDR: isReceipt ? BASKET_RETAIL_TRDR : customerTrdr,
                TRDBRANCH: trdBranch, // customer branch
                PAYMENT: payment,
                TRUCKS: trucks,
                DELIVDATE: deliveryDate,
                COMMENTS: isReceipt
                    ? `${BASKET_RECEIPT_COMMENTS}${customerTrdr}`
                    : BASKET_INVOICE_COMMENTS,
                REMARKS: remarks, // user notes
                SHIPKIND: shipKind,
                SOCASH: socash,
                VARCHAR02: "S1",
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
