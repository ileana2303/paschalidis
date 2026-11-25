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
    /** Branch that supplies and sends the items -> BRANCHSEC / WHOUSESEC / WHOUSE. */
    supplyingBranch: number;
    cccExtUser: string;
    lines: SetDataIteLine[];
};

/**
 * Builds a direct Priority ENDO document. Same branch wiring as ENDO:
 * SALDOC.BRANCH and MTRDOC BRANCHSEC / WHOUSESEC / WHOUSE are the supplying
 * branch, TRDBRANCH is the requesting branch.
 */
export function buildEndoPriorityPayload({
    clientID,
    trdr,
    trdBranch,
    deliveryDate,
    comments,
    remarks,
    supplyingBranch,
    cccExtUser,
    lines,
}: BuildEndoPriorityPayloadParams): EndoPrioritySetDataPayload {
    return setDataEnvelope(clientID, {
        SALDOC: [
            {
                SERIES: ENDO_SERIES,
                TAXSERIES: ENDO_TAXSERIES,
                BRANCH: supplyingBranch, // supplying branch: picks the items (picking list filters on it)
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
                BRANCHSEC: supplyingBranch, // supplying branch: sends the items
                WHOUSESEC: supplyingBranch, // same as BRANCHSEC
                WHOUSE: supplyingBranch, // supplying branch warehouse
            },
        ],
        ITELINES: lines,
    });
}
