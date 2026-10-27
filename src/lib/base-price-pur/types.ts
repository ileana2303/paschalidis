import type { ApiResponse } from "@/lib/interface";

/** Flat row from BASE_PRICE_PUR_LIST (document + line fields on each row). */
export interface IBasePricePurListRow {
    FINDOC: string;
    FINCODE: string;
    TRNDATE: string;
    SOSOURCE: string;
    SERIES: string;
    PARASTATIKO: string;
    TFPRMS: string;
    TRDR_CODE: string;
    PROMITHEYTIS: string;
    BRANCH: string;
    ELEGMENO: string;
    AKSIA: string;
    EIDI: string;
    PROS_ANATIMISI: string;
    ME_NEO_KOSTOS: string;
    FTHINOTERA: string;
    KOSTOS_ASYNCHRONISTO: string;
    XORIS_SUFIX: string;
    MTRL: string;
    CODE: string;
    NAME: string;
    CCCSUFIX: string;
    SUFIX_NAME: string;
    LOGOS: string;
    FALLBACK_PCT: string;
    TIMI_AGORAS: string;
    KOSTOS_HIST: string;
    KOSTOS_MTRL: string;
    SNAPSHOT: string;
    ME_NEO_KOSTOS_EIDOS: string;
    ASYNCHRONISTO_EIDOS: string;
    PERCNT00: string;
    PERCNT01: string;
    PERCNT02: string;
    PERCNT03: string;
    PERCNT04: string;
    PERCNT05: string;
    OLD_W: string;
    NEW_W: string;
    OLD_01: string;
    NEW_01: string;
    OLD_02: string;
    NEW_02: string;
    OLD_03: string;
    NEW_03: string;
    OLD_04: string;
    NEW_04: string;
    OLD_05: string;
    NEW_05: string;
    CH_W: string;
    CH_01: string;
    CH_02: string;
    CH_03: string;
    CH_04: string;
    CH_05: string;
}

export interface IBasePricePurItemRow {
    MTRL: string;
    CODE: string;
    NAME: string;
    FALLBACK_PCT: string;
    LOGOS: string;
    QTY: string;
    TIMI_GRAMMIS: string;
    KOSTOS: string;
    SNAPSHOT: string;
    ME_NEO_KOSTOS: string;
    PERCNT00: string;
    PERCNT01: string;
    PERCNT02: string;
    PERCNT03: string;
    PERCNT04: string;
    PERCNT05: string;
    OLD_W: string;
    NEW_W: string;
    OLD_01: string;
    NEW_01: string;
    OLD_02: string;
    NEW_02: string;
    OLD_03: string;
    NEW_03: string;
    OLD_04: string;
    NEW_04: string;
    OLD_05: string;
    NEW_05: string;
    CH_W: string;
    CH_01: string;
    CH_02: string;
    CH_03: string;
    CH_04: string;
    CH_05: string;
    ISCHECKED: string;
}

export interface IBasePricePurApplyRow {
    SUCCESS: string;
    FINDOC: string;
    MTRL: string;
    EIDI_ENIMEROTHIKAN: string;
    SIMANTHIKE: string;
    KOSTOS_SYNC: string;
    ERROR: string;
}

export type BasePricePurListResponse = ApiResponse<IBasePricePurListRow>;
export type BasePricePurItemsResponse = ApiResponse<IBasePricePurItemRow>;
export type BasePricePurApplyResponse = ApiResponse<IBasePricePurApplyRow>;

export interface BasePricePurItemsRoutePayload {
    findoc: string;
}

export interface BasePricePurApplyRoutePayload {
    findoc: string;
}

export interface BasePricePurDocumentHeader {
    FINDOC: string;
    FINCODE: string;
    TRNDATE: string;
    SOSOURCE: string;
    SERIES: string;
    PARASTATIKO: string;
    TFPRMS: string;
    TRDR_CODE: string;
    PROMITHEYTIS: string;
    BRANCH: string;
    ELEGMENO: string;
    AKSIA: string;
    EIDI: string;
    PROS_ANATIMISI: string;
    ME_NEO_KOSTOS: string;
    FTHINOTERA: string;
    KOSTOS_ASYNCHRONISTO: string;
    XORIS_SUFIX: string;
}

export interface BasePricePurDocument {
    findoc: string;
    header: BasePricePurDocumentHeader;
    lines: IBasePricePurListRow[];
}
