// sqlCustomerSEARCH :: Search customers for customer selection in search parts page.
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

// SEARCH ITEM :: Search items without customer - no basket info.
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

// SEARCH_PARTS_TRDR :: Search items with selected customer - includes basket info. 
export interface IItemTRDR extends IItem {
    BasketReserved: string;
    BASKET_QTY: string;
    BASKET_DATE: string;
    BASKET_REQ_PRICE: string;
    BASKET_ERP_PRICE: string;
}

// BASKET_OUT :: Basket items for a selected customer.
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

//BASKET_OUT LIST :: List of customers with basket info.
interface BasketAllCustomerGroup {
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

export interface BasketRequestPriceRoutePayload {
    BASKETID: string | number;
    NEW_PRICE: number;
}

// BASKET_IN :: Payload for adding an item to the basket.
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

// BASKET_UPDATE_QTY :: Payload for updating item quantity or price in the basket.
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

// BASKET_REQUESTED_PRICE :: Payload for requesting a new price on an existing basket item.
export interface BasketRequestPricePayload {
    service: "SqlData";
    clientID: string;
    appId: "1305";
    SqlName: "BASKET_REQUESTED_PRICE";
    NEW_PRICE: number;
    BASKETID: number;
}

export interface RequestedPriceListPayload {
    service: "SqlData";
    clientID: string;
    appId: "1305";
    SqlName: "TO_APROVE";
}

export interface IRequestedPriceListRow {
    BASKETID: string;
    TRDR: string;
    MTRL: string;
    CUSTOMER_NAME: string;
    ITEM_CODE: string;
    ITEM_DESCR: string;
    PRICE_ERP: string;
    PRICE_REQ: string;
    KATASTIMA: string;
    APPUSER_ID: string;
}

export interface RequestedPriceListResponse
    extends ApiResponse<IRequestedPriceListRow> {}

export type RequestedPriceUpdateAction = "APPROVE" | "APPROVE_WITH_PRICE";

export interface RequestedPriceUpdateRoutePayload {
    action: RequestedPriceUpdateAction;
    basketId: number;
    paschaPrice?: number;
}

export interface RequestedPriceApprovePayload {
    service: "SqlData";
    clientID: string;
    appId: "1305";
    SqlName: "APPROVAL";
    BASKETID: number;
}

export interface RequestedPriceApproveWithPricePayload {
    service: "SqlData";
    clientID: string;
    appId: "1305";
    SqlName: "APPROVED_W_PRICE";
    PASCHA_PRICE: number;
    BASKETID: number;
}

export interface BasketMassDeleteRoutePayload {
    basketIds: Array<string | number>;
    tableAction?: string;
    method?: string;
    s1Key?: string | number;
    appUserId?: string;
}

export interface BasketMassDeletePayload {
    service: "SqlData";
    clientID: string;
    appId: "1305";
    SqlName: "MASS_DELETE";
    BASKET_IDS: string;
    TABLE_ACTION: string;
    METHOD: string;
    S1_KEY: string;
    APPUSER_ID: string;
}

export interface BasketSubmitRoutePayload {
    TRDR: string;
    NOTES?: string;
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
    soReserved?: number;
}

export type StockRequestStatus = "approved" | "pending" | "deleted";

export type StockRequestUpdateAction = "APPROVE" | "DELETE" | "UPDATE";

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

interface IStockRequestInsertRow {
  MESSAGE_TO_CALLER: string;
  NEW_ID: string;
}

export interface StockRequestInsertResponse
  extends ApiResponse<IStockRequestInsertRow> {}

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
  STATUS: string;
  TOTAL_AVAIL: string;
  YP1001: string;
  YP1006: string;
  YP1007: string;
  ONGOING: string;
  ORDERED: string;
  QTY_IN_BASKETS: string;
  APPROVED_TS?: string;
}

export interface StockRequestListResponse
  extends ApiResponse<IStockRequestListRow> {}

export interface StockRequestUpdateRoutePayload {
  action: StockRequestUpdateAction;
  basketId: number;
  qty: string;
}

export interface StockRequestUpdatePayload {
  service: "SqlData";
  clientID: string;
  appId: "1305";
  SqlName: "ANATROF_UPDATE";
  ACTION: StockRequestUpdateAction;
  BASKETID: number;
  QTY: string;
  APPUSER_ID: string;
}

interface IStockRequestMessageRow {
  MESSAGE_TO_CALLER: string;
}

export interface StockRequestUpdateResponse
  extends ApiResponse<IStockRequestMessageRow> {}

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

export interface StockRequestMassDeleteResponse
  extends ApiResponse<IStockRequestMessageRow> {}

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

export interface EndoBasketAddRoutePayload {
    MTRL: number;
    QTY: number;
    BRANCH: number; // source branch (where stock is requested from)
    TO_BRANCH: number; // destination/requester branch (logged-in branch)
    APPUSER_ID?: string;
    ITEM_CODE?: string;
    ITEM_DESCR?: string;
    MNF_DESCR?: string;
}

export interface EndoBasketAddPayload {
    service: "SqlData";
    clientID: string;
    appId: "1305";
    SqlName: "NOW_ENDO_INSERT";
    MTRL: number;
    QTY: number;
    BRANCH: number; // source branch (where stock is requested from)
    TO_BRANCH: number; // destination/requester branch (logged-in branch)
    APPUSER_ID: string;
}

export interface EndoBasketActionResponse {
    success: boolean;
    message?: string;
    basketId?: string;
    id?: string;
    orderIds?: string[];
}

export interface EndoBasketSubmitLineRoutePayload {
    basketIds: string[];
    mtrl: number;
    qty: number;
    branch: number;
    toBranch: number;
    itemCode?: string;
    itemDescr?: string;
}

export interface EndoBasketSubmitRoutePayload {
    items: EndoBasketSubmitLineRoutePayload[];
    appUserId?: string;
    deliveryDate?: string;
    notes?: string;
}

export interface IEndoListRow {
    [key: string]: string;
}

export interface EndoListRoutePayload {
    branch: string;
    scope?: "requested" | "received" | "both";
}

export interface EndoListEsoPayload {
    service: "SqlData";
    clientID: string;
    appId: "1305";
    SqlName: "ENDO_LIST_ESO";
    TO_BRANCH: string; // source branch (optional filter)
    BRANCH: string; // logged-in branch
}

export interface EndoListExoPayload {
    service: "SqlData";
    clientID: string;
    appId: "1305";
    SqlName: "ENDO_LIST_EXO";
    BRANCH: string;
}

export interface EndoListUpdateQtyRoutePayload {
    basketId: string | number;
    qty: string | number;
    mtrl: string | number;
    toBranch: string | number;
    branch: string;
    appUserId?: string;
}

export interface EndoListUpdateQtyPayload {
    service: "SqlData";
    clientID: string;
    appId: "1305";
    SqlName: "NOW_ENDO_UPD_QTY";
    BASKETID: string;
    QTY: string;
    MTRL: string;
    TO_BRANCH: string;
    ACTION: "UPDATE";
    APPUSER_ID: string;
}

export interface EndoListSection {
    totalcount: number;
    rows: IEndoListRow[];
}

export interface EndoListsResponse {
    success: boolean;
    message?: string;
    requested: EndoListSection;
    received: EndoListSection;
}
