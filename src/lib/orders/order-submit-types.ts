
export type OrderSubmitType = "basket" | "endo" | "anatrof";

export type MassDeleteTableAction = "USRCUST" | "ENDO" | "ANATROF";

export type MassDeletePayload = {
    service: "SqlData";
    clientID: string;
    appId: "1305";
    SqlName: "MASS_DELETE";
    BASKET_IDS: string;
    TABLE_ACTION: MassDeleteTableAction;
    METHOD: "LINK_S1";
    S1_KEY: string;
    APPUSER_ID: string;
};
