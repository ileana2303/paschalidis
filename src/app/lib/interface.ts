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
    ITEM_DESCR: string;
    STATUS_LABEL: string;
    PRICE_MESSAGE: string;
}

export interface ApiResponse<T> {
    success: boolean;
    totalcount: number;
    rows: T[];
}