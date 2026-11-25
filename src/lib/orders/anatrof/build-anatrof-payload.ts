import {
    setDataEnvelope,
    type SetDataEnvelope,
    type SetDataIteLine,
} from "../shared/setdata-envelope";
import {
    ANATROF_SUPPLYING_BRANCH,
    ANATROF_SUPPLYING_BRANCH_NAME,
} from "./anatrof-constants";

export type AnatrofSaldoc = {
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

export type AnatrofMtrdoc = {
    TRUCKS: number;
    DELIVDATE: string;
    DEPTRDR_CUSTOMER_CODE: "";
    BILLTRDR_CUSTOMER_CODE: "";
    BRANCHSEC: number;
    WHOUSESEC: number;
    WHOUSE: number;
};

export type AnatrofSetDataPayload = SetDataEnvelope<{
    SALDOC: [AnatrofSaldoc];
    MTRDOC: [AnatrofMtrdoc];
    ITELINES: SetDataIteLine[];
}>;

export type BuildAnatrofPayloadParams = {
    clientID: string;
    series: string;
    taxSeries: string;
    trdr: number;
    trdBranch: number;
    payment: number;
    trucks: number;
    deliveryDate: string;
    basketId: string;
    requestingBranchCode: number;
    requestingBranchName: string;
    /** Free-text notes typed by the user. */
    remarks: string;
    shipKind: number;
    socash: number;
    /** Username of the logged-in user. */
    cccExtUser: string;
    lines: SetDataIteLine[];
};

export function buildAnatrofPayload({
    clientID,
    series,
    taxSeries,
    trdr,
    trdBranch,
    payment,
    trucks,
    deliveryDate,
    basketId,
    requestingBranchCode,
    requestingBranchName,
    remarks,
    shipKind,
    socash,
    cccExtUser,
    lines,
}: BuildAnatrofPayloadParams): AnatrofSetDataPayload {
    return setDataEnvelope(clientID, {
        SALDOC: [
            {
                SERIES: series,
                TAXSERIES: taxSeries,
                BRANCH: ANATROF_SUPPLYING_BRANCH,
                TRDR: trdr,
                TRDBRANCH: trdBranch, // requesting branch
                PAYMENT: payment,
                TRUCKS: trucks,
                DELIVDATE: deliveryDate,
                COMMENTS: `ΑΝΑΤΡΟΦΟΔΟΣΙΑ Νο${basketId} ΑΠΟ ${ANATROF_SUPPLYING_BRANCH_NAME} (${ANATROF_SUPPLYING_BRANCH}) ΠΡΟΣ ${requestingBranchName} (${requestingBranchCode})`,
                REMARKS: remarks,
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
                BRANCHSEC: ANATROF_SUPPLYING_BRANCH,
                WHOUSESEC: ANATROF_SUPPLYING_BRANCH,
                WHOUSE: ANATROF_SUPPLYING_BRANCH,
            },
        ],
        ITELINES: lines,
    });
}
