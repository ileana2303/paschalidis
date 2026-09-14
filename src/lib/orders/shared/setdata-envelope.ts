export const S1_APP_ID = "1305";

export type SetDataEnvelope<TData> = {
    service: "setData";
    clientID: string;
    appId: typeof S1_APP_ID;
    OBJECT: "SALDOC";
    KEY: "";
    data: TData;
};

export type SetDataIteLine = {
    MTRL: number;
    QTY1: number;
};

export function setDataEnvelope<TData>(
    clientID: string,
    data: TData
): SetDataEnvelope<TData> {
    return {
        service: "setData",
        clientID,
        appId: S1_APP_ID,
        OBJECT: "SALDOC",
        KEY: "",
        data,
    };
}
