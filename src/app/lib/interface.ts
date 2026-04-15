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

export interface IBasketItem {
    Uid: string;
    ProductCode: string | null;
    ProductName: string | null;
    ProductS1MTRL: number;
    Qty: number | null;
    ProductPrice: number | null;
    ProductBargainPrice: number | null;
    BargainStatus: number | null;
}

export interface IBasket {
    Uid: string;
    CustomerS1TRDR: number;
    CountProducts: number | null;
    TotalCost: number | null;
    Items: IBasketItem[];
}

export interface BasketResponse {
    success: boolean;
    message?: string;
    basket: IBasket | null;
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
