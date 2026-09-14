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
};

export type AnatrofMtrdoc = {
    TRUCKS: number;
    DELIVDATE: string;
    DEPTRDR_CUSTOMER_CODE: "";
    BILLTRDR_CUSTOMER_CODE: "";
    BRANCHSEC: number;
    WHOUSESEC: number;
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
    comments: string;
    remarks: string;
    shipKind: number;
    socash: number;
    requestingBranch: number;
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
    comments,
    remarks,
    shipKind,
    socash,
    requestingBranch,
    lines,
}: BuildAnatrofPayloadParams): AnatrofSetDataPayload {
    return setDataEnvelope(clientID, {
        SALDOC: [
            {
                SERIES: series, // per requesting branch
                TRDR: trdr,
                TRDBRANCH: trdBranch,
                PAYMENT: payment,
                TRUCKS: trucks,
                DELIVDATE: deliveryDate,
                COMMENTS: comments, // ANATROF BASKET
                REMARKS: remarks,
                SHIPKIND: shipKind,
                SOCASH: socash,
            },
        ],
        MTRDOC: [
            {
                TRUCKS: trucks,
                DELIVDATE: deliveryDate,
                DEPTRDR_CUSTOMER_CODE: "", // fixed
                BILLTRDR_CUSTOMER_CODE: "", // fixed
                BRANCHSEC: requestingBranch,
                WHOUSESEC: requestingBranch,
            },
        ],
        ITELINES: lines,
    });
}
