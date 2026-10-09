import {
    setDataEnvelope,
    type SetDataEnvelope,
    type SetDataIteLine,
} from "../shared/setdata-envelope";

export type AnatrofSaldoc = {
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
    trdr: number;
    trdBranch: number;
    payment: number;
    trucks: number;
    deliveryDate: string;
    basketId: string;
    requestingBranchCode: number;
    requestingBranchName: string;
    supplyingBranchName: string;
    /** Free-text notes typed by the user. */
    remarks: string;
    shipKind: number;
    socash: number;
    supplyingBranch: number;
    /** Username of the logged-in user. */
    cccExtUser: string;
    lines: SetDataIteLine[];
};

export function buildAnatrofPayload({
    clientID,
    series,
    trdr,
    trdBranch,
    payment,
    trucks,
    deliveryDate,
    basketId,
    requestingBranchCode,
    requestingBranchName,
    supplyingBranchName,
    remarks,
    shipKind,
    socash,
    supplyingBranch,
    cccExtUser,
    lines,
}: BuildAnatrofPayloadParams): AnatrofSetDataPayload {
    return setDataEnvelope(clientID, {
        SALDOC: [
            {
                SERIES: series, // per supplying branch
                TRDR: trdr,
                TRDBRANCH: trdBranch, // requesting branch
                PAYMENT: payment,
                TRUCKS: trucks,
                DELIVDATE: deliveryDate,
                COMMENTS: `Παραγγελία Ανατροφοδοσίας Νο${basketId} από ${supplyingBranchName} προς ${requestingBranchName} :: ${supplyingBranch}->${requestingBranchCode}`,
                REMARKS: remarks,
                SHIPKIND: shipKind,
                SOCASH: socash,
                CCCEXTUSER: cccExtUser,
            },
        ],
        MTRDOC: [
            {
                TRUCKS: trucks,
                DELIVDATE: deliveryDate,
                DEPTRDR_CUSTOMER_CODE: "", // fixed
                BILLTRDR_CUSTOMER_CODE: "", // fixed
                BRANCHSEC: supplyingBranch, // supplying branch
                WHOUSESEC: supplyingBranch, // supplying branch
                WHOUSE: supplyingBranch, // supplying branch warehouse
            },
        ],
        ITELINES: lines,
    });
}
