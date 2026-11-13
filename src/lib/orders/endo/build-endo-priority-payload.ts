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

type EndoPrioritySaldoc = {
    SERIES: string;
    TAXSERIES: string;
    BRANCH: number;
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

type EndoPriorityMtrdoc = {
    TRUCKS: number;
    DELIVDATE: string;
    DEPTRDR_CUSTOMER_CODE: "";
    BILLTRDR_CUSTOMER_CODE: "";
    BRANCHSEC: number;
    WHOUSESEC: number;
    WHOUSE: number;
};

export type EndoPrioritySetDataPayload = SetDataEnvelope<{
    SALDOC: [EndoPrioritySaldoc];
    MTRDOC: [EndoPriorityMtrdoc];
    ITELINES: SetDataIteLine[];
}>;

type BuildEndoPriorityPayloadParams = {
    clientID: string;
    trdr: number;
    trdBranch: number;
    deliveryDate: string;
    comments: string;
    remarks: string;
    requestingBranch: number;
    cccExtUser: string;
    lines: SetDataIteLine[];
};

/**
 * Builds a direct Priority ENDO document. Unlike the request-based ENDO flow,
 * every document/warehouse branch belongs to the requesting branch because it
 * is the branch creating the SoftOne document.
 */
export function buildEndoPriorityPayload({
    clientID,
    trdr,
    trdBranch,
    deliveryDate,
    comments,
    remarks,
    requestingBranch,
    cccExtUser,
    lines,
}: BuildEndoPriorityPayloadParams): EndoPrioritySetDataPayload {
    return setDataEnvelope(clientID, {
        SALDOC: [
            {
                SERIES: ENDO_SERIES,
                TAXSERIES: ENDO_TAXSERIES,
                BRANCH: requestingBranch,
                TRDR: trdr,
                TRDBRANCH: trdBranch,
                PAYMENT: ENDO_PAYMENT,
                TRUCKS: ENDO_TRUCKS,
                DELIVDATE: deliveryDate,
                COMMENTS: comments,
                REMARKS: remarks,
                SHIPKIND: ENDO_SHIPKIND,
                SOCASH: ENDO_SOCASH,
                VARCHAR02: "S1",
                CCCEXTUSER: cccExtUser,
            },
        ],
        MTRDOC: [
            {
                TRUCKS: ENDO_TRUCKS,
                DELIVDATE: deliveryDate,
                DEPTRDR_CUSTOMER_CODE: "",
                BILLTRDR_CUSTOMER_CODE: "",
                BRANCHSEC: requestingBranch,
                WHOUSESEC: requestingBranch,
                WHOUSE: requestingBranch,
            },
        ],
        ITELINES: lines,
    });
}
