export type OrderSubmitType = "basket" | "endo" | "anatrof";

export type SubmitMode = "single-order" | "per-line";

export type MassDeleteTableAction = "USRCUST" | "ENDO" | "ANATROF";

export type OrderSubmitLine = {
    basketId: string;
    mtrl: number;
    qty: number;
    sourceBranch?: number;
    destinationBranch?: number;
};

export type OrderSubmitRequestBody = {
    submitType: OrderSubmitType;
    appUserId: string;
    deliveryDate?: string;
    notes?: string;
    trdr?: number;
    trdBranch?: number;
    payment?: number;
    trucks?: number;
    shipKind?: number;
    socash?: number;
    branchSec?: number;
    whouseSec?: number;
    items: Array<{
        basketId?: string | number;
        basketIds?: Array<string | number>;
        mtrl?: number | string;
        MTRL?: number | string;
        qty?: number | string;
        QTY1?: number | string;
        sourceBranch?: number | string;
        destinationBranch?: number | string;
        branch?: number | string;
        toBranch?: number | string;
    }>;
};

export type SetDataOrderPayload = {
    service: "setData";
    clientID: string;
    appId: "1305";
    OBJECT: "SALDOC";
    KEY: "";
    data: {
        SALDOC: Array<{
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
        }>;
        MTRDOC: Array<{
            TRUCKS: number;
            DELIVDATE: string;
            DEPTRDR_CUSTOMER_CODE: string;
            BILLTRDR_CUSTOMER_CODE: string;
            BRANCHSEC: number;
            WHOUSESEC: number;
        }>;
        ITELINES: Array<{
            MTRL: number;
            QTY1: number;
        }>;
    };
};

export type MassDeletePayload = {
    service: "SqlData";
    clientID: string;
    appId: "1305";
    SqlName: "MASS_DELETE";
    BASKET_IDS: string;
    TABLE_ACTION: MassDeleteTableAction;
    METHOD: "LINK_S1";
    S1_KEY: string;
    APPUSER_ID: string;
};
