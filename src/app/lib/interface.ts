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
    MTRL: number;
    ITEM_CODE: string;
    ITEM_OMOIO: string;
    CODE1_0: string;
    ITEM_CODE2: string;
    ITEM_DESCR: string;
    MNF_DESCR: string;

    STATUS_LABEL: string;
    STATUS_NOW: number;
    STATUS_MOBILE: string;

    YP1001: number;
    THESI1001: string;
    YP1006: number;
    THESI1006: string;
    YP1007: number;
    THESI1007: string;

    TOTAL_AVAIL: number;
    ONGOING: number;
    NET_QTY_AVAILABLE: number;

    SoOrdered: number;
    SoReserved: number;

    PRICE_WHOLE: number;
    PRICE_RETAIL: number;
    PRICER01: number;
    PRICER02: number;
    PRICER03: number;
    STANDCOST: number;
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
