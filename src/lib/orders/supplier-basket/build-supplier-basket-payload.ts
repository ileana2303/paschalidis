import {
    setDataEnvelope,
    type SetDataEnvelope,
} from "../shared/setdata-envelope";
import {
    SUPPLIER_BASKET_HEADER_BRANCH,
    SUPPLIER_BASKET_SERIES,
    SUPPLIER_BASKET_TAXSERIES,
} from "./supplier-basket-constants";

export type SupplierBasketPurdoc = {
    TRNDATE: string;
    FISCPRD: string;
    SERIES: string;
    TAXSERIES: string;
    BRANCH: string;
    SODTYPE?: string;
    TRDR: string;
};

export type SupplierBasketMtrdoc = {
    TRUCKS?: number;
    DELIVDATE: string;
    BRANCHSEC: number;
    WHOUSESEC: number;
};

export type SupplierBasketItemLine = {
    MTRL: number;
    QTY1: number;
};

export type SupplierBasketSetDataPayload = SetDataEnvelope<
    {
        PURDOC: [SupplierBasketPurdoc];
        MTRDOC: [SupplierBasketMtrdoc];
        ITELINES: SupplierBasketItemLine[];
    },
    "PURDOC"
>;

export type BuildSupplierBasketPayloadParams = {
    clientID: string;
    transactionDate: string;
    fiscalYear: string;
    supplierTrdr: string;
    branch: number;
    sodType?: string;
    trucks?: number;
    lines: SupplierBasketItemLine[];
};

export function buildSupplierBasketPayload({
    clientID,
    transactionDate,
    fiscalYear,
    supplierTrdr,
    branch,
    sodType,
    trucks,
    lines,
}: BuildSupplierBasketPayloadParams): SupplierBasketSetDataPayload {
    return setDataEnvelope(
        clientID,
        {
            PURDOC: [
                {
                    TRNDATE: `${transactionDate} 00:00:00`,
                    FISCPRD: `${fiscalYear}|ΧΡΗΣΗ ${fiscalYear}`,
                    SERIES: SUPPLIER_BASKET_SERIES,
                    TAXSERIES: SUPPLIER_BASKET_TAXSERIES,
                    BRANCH: SUPPLIER_BASKET_HEADER_BRANCH,
                    TRDR: supplierTrdr,
                    ...(sodType ? { SODTYPE: sodType } : {}),
                },
            ],
            MTRDOC: [
                {
                    DELIVDATE: transactionDate,
                    BRANCHSEC: branch,
                    WHOUSESEC: branch,
                    ...(trucks ? { TRUCKS: trucks } : {}),
                },
            ],
            ITELINES: lines,
        },
        "PURDOC"
    );
}
