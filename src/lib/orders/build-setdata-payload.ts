import type {
    OrderSubmitLine,
    SetDataOrderPayload,
} from "./order-submit-types";

type BuildSetDataPayloadParams = {
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
    socash?: number;
    branchSec?: number;
    whouseSec?: number;
    lines: OrderSubmitLine[];
};

export function buildSetDataPayload({
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
    branchSec,
    whouseSec,
    lines,
}: BuildSetDataPayloadParams): SetDataOrderPayload {
    const saldoc: SetDataOrderPayload["data"]["SALDOC"][number] = {
        SERIES: series,
        TRDR: trdr,
        TRDBRANCH: trdBranch,
        PAYMENT: payment,
        TRUCKS: trucks,
        DELIVDATE: deliveryDate,
        COMMENTS: comments,
        REMARKS: remarks,
        SHIPKIND: shipKind,
    };
    const mtrdoc: SetDataOrderPayload["data"]["MTRDOC"][number] = {
        TRUCKS: trucks,
        DELIVDATE: deliveryDate,
        DEPTRDR_CUSTOMER_CODE: "",
        BILLTRDR_CUSTOMER_CODE: "",
    };

    if (socash != null) {
        saldoc.SOCASH = socash;
    }

    if (branchSec != null) {
        mtrdoc.BRANCHSEC = branchSec;
    }

    if (whouseSec != null) {
        mtrdoc.WHOUSESEC = whouseSec;
    }

    return {
        service: "setData",
        clientID,
        appId: "1305",
        OBJECT: "SALDOC",
        KEY: "",
        data: {
            SALDOC: [saldoc],
            MTRDOC: [mtrdoc],
            ITELINES: lines.map((line) => ({
                MTRL: line.mtrl,
                QTY1: line.qty,
            })),
        },
    };
}
