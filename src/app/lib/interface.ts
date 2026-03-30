export interface ICustomerInfo {
    TRDR: string;
    NAME: string;
    AFM: string;
    EMAIL?: string;
    PHONE01?: string;
    MAIN_ADDRESS: string;
    MAIN_CITY: string;
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