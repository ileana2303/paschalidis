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

export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    totalcount: number;
    rows: T[];
}
