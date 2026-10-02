export interface PartInsightsRoutePayload {
    trdr: string | number;
    mtrl: string | number;
}

export interface LastOrderRow {
    MATCH_TYPE?: string;
    SRC?: string;
    MTRL?: string | number;
    ITEM_CODE?: string;
    ITEM_DESCR?: string;
    TRNDATE?: string;
    PARASTATIKO?: string;
    QTY?: string | number;
    PRICE?: string | number;
    Turnover?: string | number;
}

export interface CompetitionSaleRow {
    MATCH_TYPE?: string;
    TRNDATE?: string;
    MTRL?: string | number;
    ITEM_CODE?: string;
    ITEM_DESCR?: string;
    QTY?: string | number;
    PRICE?: string | number;
    PEER_SCOPE?: string;
    MAGAZI?: string;
}

export interface PartInsightsResponse<TRow> {
    success: boolean;
    message?: string;
    totalcount: number;
    rows: TRow[];
}

export type LastOrdersResponse = PartInsightsResponse<LastOrderRow>;
export type CompetitionSalesResponse = PartInsightsResponse<CompetitionSaleRow>;

export interface PartInsightsSoftOnePayload {
    service: "SqlData";
    clientID: string;
    appId: "1305";
    SqlName: "LAST_ORDERS_TRDR_MTRL" | "LIST_ANTAGONISMOS";
    TRDR: string;
    MTRL: number;
}
