export interface ICustomerInfo {
    TRDR: string;
    CODE: string;
    NAME: string;
    EMAIL?: string;
    AFM: string;
    PHONE01?: string;
    MAIN_ADDRESS: string;
    MAIN_ZIP: string;
    MAIN_CITY: string;
    NUMBER_OF_BRANCHES: string;
    INDEX_SEARCH: string;
}

export interface IItem {
    MTRL: string;
    ITEM_CODE: string;
    ITEM_OMOIO: string;
    CODE1_0: string;
    ITEM_CODE2: string;
    ITEM_DESCR: string;
    MNF_DESCR: string;

    STATUS_LABEL: string;
    STATUS_NOW: string;
    STATUS_MOBILE: string;

    YP1001: string;
    THESI1001: string;
    YP1006: string;
    THESI1006: string;
    YP1007: string;
    THESI1007: string;

    TOTAL_AVAIL: string;
    ONGOING: string;
    NET_QTY_AVAILABLE: string;

    SoOrdered: string;
    SoReserved: string;

    PRICE_WHOLE: string;
    PRICE_RETAIL: string;
    PRICER01: string;
    PRICER02: string;
    PRICER03: string;
    STANDCOST: string;
    PRICE_MESSAGE: string;
}

export interface IItemTRDR extends IItem {
    BasketReserved: string;
    BASKET_QTY: string;
    BASKET_DATE: string;
    BASKET_REQ_PRICE: string;
    BASKET_ERP_PRICE: string;
}

export interface IBasketItem {
    BASKETID: string;
    TRDR: string;
    MTRL: string;
    QTY: string;
    PRICE_ERP: string;
    PRICE_REQ: string;
    BRANCH: string;
    TRD_BRANCH: string;
    IS_APROVED: string;
    APPUSER_ID: string;
    BASKET_DATE: string;
    INS_DATE: string;
    COMPANY: string;
    CODE: string;
    NAME: string;
    CODE2: string;
    CUST_NAME: string;
}

// For compatibility, basket is just a list of items and totalcount
export interface IBasket {
    items: IBasketItem[];
    totalcount: number;
}

export interface BasketResponse {
    success: boolean;
    message?: string;
    totalcount: number;
    rows: IBasketItem[];
}

export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    totalcount: number;
    rows: T[];
}

export interface IProduct {
    mtrl: string;
    code: string;
    name: string;
    barcode: string;
    price: string;
    soft1Active: string;
    modifiedDate: string;
}

export interface ProductsResponse {
    success: boolean;
    page: number;
    totalPages: number;
    pageSize: number;
    totalCount: string;
    data: IProduct[];
}

export interface StockInfo {
    stock1001: number;
    stock1006: number;
    stock1007: number;
    totalAvail: number;
    ongoing: number;
    netAvail: number;
}

export type StockRequestStatus = "approved" | "pending" | "declined";

export interface StockRequestRoutePayload {
    mtrl: number;
    qty: number;
    branch: string;
}

export interface StockRequestInsertPayload {
    service: "SqlData";
    clientID: string;
    appId: "1305";
    SqlName: "ANTROF_INSERT";
    MTRL: string;
    BRANCH: string;
    QTY_REQUESTED: number;
    APPUSER_ID: string;
}

export interface IStockRequestInsertRow {
    MESSAGE_TO_CALLER: string;
    NEW_ID: string;
}

export interface StockRequestInsertResponse extends ApiResponse<IStockRequestInsertRow> { }
