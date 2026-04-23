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

    BasketReserved: string;

    PRICE_WHOLE: string;
    PRICE_RETAIL: string;
    PRICER01: string;
    PRICER02: string;
    PRICER03: string;
    STANDCOST: string;
    PRICE_MESSAGE: string;

    BASKET_QTY: string;
    BASKET_DATE: string;
    BASKET_REQ_PRICE: string;
    BASKET_ERP_PRICE: string;
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
    TOTAL_QTY?: string;
    PRICE_ERP: string;
    PRICE_REQ: string;
    BRANCH: string;
    TRD_BRANCH: string;
    IS_APROVED: string;
    APPUSER_ID: string;
    BASKET_DATE: string;
    INS_DATE: string;
    MAX_INS_DATE?: string;
    COMPANY: string;
    CODE: string;
    NAME: string;
    CODE2: string;
    CUST_NAME: string;
    BASKET_QTY?: string | number;
    BASKET_ERP_PRICE?: string | number;
    BASKET_REQ_PRICE?: string | number;
    BargainStatus?: string | number;
    ITEM_CODE?: string;
    ITEM_DESCR?: string;
}

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

export interface BasketAllRoutePayload {
    search?: string;
    page?: number;
    pageSize?: number;
}

export interface BasketAllCustomerGroup {
    TRDR?: string | number;
    CUSTOMER_NAME?: string;
    TOT_QTY?: string | number;
    TOTAL_VALUE?: string | number;
    BASKETROWS?: string | number;
    MINDATE?: string;
    MAXDATE?: string;
    CODE?: string;
    NAME?: string;
    CUST_NAME?: string;
    totalcount?: number;
    basketTotal?: string | number;
    rows?: Array<Partial<IBasketItem>>;
    items?: Array<Partial<IBasketItem>>;
}

export interface BasketAllResponse {
    success: boolean;
    message?: string;
    totalcount: number;
    page?: number;
    pageSize?: number;
    rows: BasketAllCustomerGroup[] | Array<Partial<IBasketItem>>;
}

export interface BasketItemsRoutePayload {
    trdr: string;
}

export interface BasketItemsPayload {
    service: "SqlData";
    clientID: string;
    appId: "1305";
    SqlName: "BASKET_OUT";
    TRDR: string;
}

export interface BasketInRoutePayload {
    TRDR: string | number;
    MTRL: number;
    QTY: number;
    PRICE_ERP: number;
    PRICE_REQ?: number;
    BRANCH?: number;
    TRD_BRANCH?: number;
    COMPANY?: number;
    APPUSER_ID?: string;
}

export interface BasketRequestPriceRoutePayload extends BasketInRoutePayload {
    PRICE_REQ: number;
}

export interface BasketInPayload {
    service: "SqlData";
    clientID: string;
    appId: "1305";
    SqlName: "BASKET_IN";
    TRDR: number;
    MTRL: number;
    QTY: number;
    PRICE_ERP: number;
    PRICE_REQ: number;
    BRANCH: number;
    TRD_BRANCH: number;
    APPUSER_ID: string;
    COMPANY: number;
}

export interface BasketUpdateRoutePayload {
    BASKETID: string | number;
    QTY: number;
    PRICE_ERP?: number;
    PRICE_REQ?: number;
}

export interface BasketUpdatePayload {
    service: "SqlData";
    clientID: string;
    appId: "1305";
    SqlName: "BASKET_UPDATE";
    QTY: number;
    BASKETID: number;
    PRICE_ERP?: number;
    PRICE_REQ?: number;
}

export interface BasketOutRoutePayload {
    trdr: string;
}

export interface BasketOutPayload {
    service: "SqlData";
    clientID: string;
    appId: "1305";
    SqlName: "BASKET_OUT";
    TRDR: string;
}

export interface BasketActionResponse {
    success: boolean;
    message?: string;
    id?: string;
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

export interface StockRequestListRoutePayload {
    branch: string;
}

export interface StockRequestListPayload {
    service: "SqlData";
    clientID: string;
    appId: "1305";
    SqlName: "ANTROF_LIST";
    BRANCH: string;
}

export interface IStockRequestListRow {
    BASKETID: string;
    MTRL: string;
    ITEM_CODE: string;
    ITEM_NAME: string;
    QTY: string;
    QTY_REQUESTED: string;
    BRANCH: string;
    INS_DATE: string;
    APPROVED_TS?: string;
    STATUS: string;
}

export interface StockRequestListResponse extends ApiResponse<IStockRequestListRow> { }

export type StockRequestUpdateAction = "APPROVE" | "DECLINE";

export interface StockRequestUpdateRoutePayload {
    action: StockRequestUpdateAction;
    basketId: number;
    mtrl: string;
    qty: string;
}

export interface StockRequestUpdatePayload {
    service: "SqlData";
    clientID: string;
    appId: "1305";
    SqlName: "ANATROF_UPDATE";
    ACTION: StockRequestUpdateAction;
    BASKETID: number;
    MTRL: string;
    QTY: string;
    APPUSER_ID: string;
}

export interface IStockRequestMessageRow {
    MESSAGE_TO_CALLER: string;
}

export interface StockRequestUpdateResponse extends ApiResponse<IStockRequestMessageRow> { }

export interface StockRequestMassDeleteRoutePayload {
    basketIds: Array<string | number>;
}

export interface StockRequestMassDeletePayload {
    service: "SqlData";
    clientID: string;
    appId: "1305";
    SqlName: "ANTROF_MASS_DELETE";
    BASKET_IDS: string;
    APPUSER_ID: string;
}

export interface StockRequestMassDeleteResponse extends ApiResponse<IStockRequestMessageRow> { }

export interface StockRequestProps {
    mtrl: string;
    stock: number;
    quantity: number;
    onQuantityChange: (nextQuantity: number) => void;
    onSubmitRequest: () => void;
    requestStatus: StockRequestStatus | null;
    isSubmittingRequest: boolean;
    requestError: string;
}
