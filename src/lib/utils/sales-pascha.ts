import type { IItem, ISalesPaschaRow } from "@/lib/interface";

interface SalesPaschaSearchRowOptions {
    days: string;
    branch: string;
}

export function itemSearchResultToSalesPaschaRow(
    item: IItem,
    { days, branch }: SalesPaschaSearchRowOptions
): ISalesPaschaRow {
    return {
        MTRL: item.MTRL,
        CODE: item.ITEM_CODE,
        NAME: item.ITEM_DESCR,
        CODE1: item.CODE1_0,
        CODE2: item.ITEM_CODE2,
        CCCSUFIX: item.SUFIX,
        ZGROUP_CODE: item.ZGROUP_CODE,
        ZB2B_CODE: item.ZB2B_CODE,
        SUGGESTED_TRDR: item.SUGGESTED_TRDR,
        SUGGESTED_TRDR_CODE: item.SUGGESTED_TRDR_CODE,
        SUGGESTED_TRDR_NAME: item.SUGGESTED_TRDR_NAME,
        DAYS: days,
        BRANCH: branch,
        MINES: "0",
        QTY_WIN: "0",
        RYTHMOS_MINA: "0",
        Y0: "0",
        Y1: "0",
        Y2: "0",
        Y3: "0",
        Y4: "0",
        M0: "0",
        M1: "0",
        M2: "0",
        M3: "0",
        M4: "0",
        R1: "0",
        PCT_VS_M1: "0",
        TASI_WIN: "",
        ONGOING: item.ONGOING,
        YP1000: item.YP1000,
        YP1006: item.YP1006,
        YP1007: item.YP1007,
        TOTAL_AVAIL: item.TOTAL_AVAIL,
        RES1000: item.RES1000,
        RES1006: item.RES1006,
        RES1007: item.RES1007,
        RES_TOTAL: item.RES_TOTAL,
        END1000: item.END1000,
        END1006: item.END1006,
        END1007: item.END1007,
        END_TOTAL: item.END_TOTAL,
        FREE_AVAIL: item.NET_QTY_AVAILABLE,
        YP_BRANCH: "0",
        RES_BRANCH: "0",
        END_BRANCH: "0",
        SIM_ITEMS: "0",
        SIM_AVAIL: "0",
        GRP_ITEMS: "0",
        GRP_AVAIL: "0",
        B2B_ITEMS: "0",
        B2B_AVAIL: "0",
    };
}
