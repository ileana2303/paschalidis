export const S1_APP_ID = "1305";

export type SetDataObject = "SALDOC" | "PURDOC";

export type SetDataEnvelope<
    TData,
    TObject extends SetDataObject = "SALDOC",
> = {
    service: "setData";
    clientID: string;
    appId: typeof S1_APP_ID;
    OBJECT: TObject;
    KEY: "";
    data: TData;
};

export type SetDataIteLine = {
    MTRL: number;
    QTY1: number;
};

/** ITELINES row for customer basket orders (POST /api/orders/basket). */
export type BasketSetDataIteLine = SetDataIteLine & {
    PRICE: number;
};

export function setDataEnvelope<TData>(
    clientID: string,
    data: TData
): SetDataEnvelope<TData, "SALDOC">;
export function setDataEnvelope<TData, TObject extends SetDataObject>(
    clientID: string,
    data: TData,
    object: TObject
): SetDataEnvelope<TData, TObject>;
export function setDataEnvelope<TData, TObject extends SetDataObject = "SALDOC">(
    clientID: string,
    data: TData,
    object?: TObject
): SetDataEnvelope<TData, TObject | "SALDOC"> {
    return {
        service: "setData",
        clientID,
        appId: S1_APP_ID,
        OBJECT: object ?? "SALDOC",
        KEY: "",
        data,
    };
}
