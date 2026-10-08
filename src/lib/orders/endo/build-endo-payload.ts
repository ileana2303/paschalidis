import {
    setDataEnvelope,
    type SetDataEnvelope,
    type SetDataIteLine,
} from "../shared/setdata-envelope";
import {
    ENDO_PAYMENT,
    ENDO_SERIES,
    ENDO_SHIPKIND,
    ENDO_SOCASH,
    ENDO_TAXSERIES,
    ENDO_TRUCKS,
} from "./endo-constants";

/** SALDOC header of an Ενδοδιακίνηση document. */
export type EndoSaldoc = {
    SERIES: string;
    TAXSERIES: string;
    TRDR: number;
    TRDBRANCH: number;
    PAYMENT: number;
    SERIESNUM: string;
    TRUCKS: number;
    DELIVDATE: string;
    COMMENTS: string;
    REMARKS: string;
    SHIPKIND: number;
    SOCASH: number;
    CCCEXTUSER: string;
};

export type EndoMtrdoc = {
    TRUCKS: number;
    DELIVDATE: string;
    DEPTRDR_CUSTOMER_CODE: "";
    BILLTRDR_CUSTOMER_CODE: "";
    BRANCHSEC: number;
    WHOUSESEC: number;
};

export type EndoSetDataPayload = SetDataEnvelope<{
    SALDOC: [EndoSaldoc];
    MTRDOC: [EndoMtrdoc];
    ITELINES: SetDataIteLine[];
}>;

export type BuildEndoPayloadParams = {
    /** setData clientID of the supplying branch (the one that sends the items). */
    clientID: string;
    /** Internal counterparty (TRDR). */
    trdr: number;
    /** TRDBRANCH of the requesting branch - the one that asked for the items. */
    trdBranch: number;
    /** BASKETID of the ENDO row -> SERIESNUM. */
    basketId: string;
    deliveryDate: string;
    /** `ΠΑΡΑΣΤΑΤΙΚΟ Νο... ΑΠΟ ... ΣΕ ... 1007-->1006`, see endo-comments.ts. */
    comments: string;
    /** Free-text notes typed by the user. */
    remarks: string;
    /** Branch that supplies and sends the items -> BRANCHSEC / WHOUSESEC. */
    supplyingBranch: number;
    /** Username of the logged-in user. */
    cccExtUser: string;
    lines: SetDataIteLine[];
};

/**
 * Builds the complete ENDO setData payload. Pure: no env reads, no branch
 * lookups - what you see here is exactly what is POSTed to S1_ENDO_ENDPOINT.
 *
 * ENDO is submitted one document per basket line, so `lines` normally holds a
 * single ITELINES row.
 */
export function buildEndoPayload({
    clientID,
    trdr,
    trdBranch,
    basketId,
    deliveryDate,
    comments,
    remarks,
    supplyingBranch,
    cccExtUser,
    lines,
}: BuildEndoPayloadParams): EndoSetDataPayload {
    return setDataEnvelope(clientID, {
        SALDOC: [
            {
                SERIES: ENDO_SERIES, // fixed - παραγγελία
                TAXSERIES: ENDO_TAXSERIES, // fixed
                TRDR: trdr,
                TRDBRANCH: trdBranch, // requesting branch: asked for the items
                PAYMENT: ENDO_PAYMENT, // fixed
                SERIESNUM: basketId, // BASKETID
                TRUCKS: ENDO_TRUCKS, // fixed
                DELIVDATE: deliveryDate,
                COMMENTS: comments, // ΠΑΡΑΣΤΑΤΙΚΟ Νο<basketId> ΑΠΟ ... ΣΕ ...
                REMARKS: remarks, // user notes
                SHIPKIND: ENDO_SHIPKIND, // fixed
                SOCASH: ENDO_SOCASH, // fixed
                CCCEXTUSER: cccExtUser,
            },
        ],
        MTRDOC: [
            {
                TRUCKS: ENDO_TRUCKS, // fixed
                DELIVDATE: deliveryDate,
                DEPTRDR_CUSTOMER_CODE: "", // fixed
                BILLTRDR_CUSTOMER_CODE: "", // fixed
                BRANCHSEC: supplyingBranch, // supplying branch: sends the items
                WHOUSESEC: supplyingBranch, // same as BRANCHSEC
            },
        ],
        ITELINES: lines,
    });
}
