
import type { ANATROF_TABLE_ACTION } from "./anatrof/anatrof-constants";
import type { BASKET_TABLE_ACTION } from "./customer-basket/basket-constants";
import type { ENDO_TABLE_ACTION } from "./endo/endo-constants";
import type { SUPPLIER_BASKET_TABLE_ACTION } from "./supplier-basket/supplier-basket-constants";

export type OrderSubmitType = "basket" | "endo" | "anatrof" | "supplier-basket";

export type MassDeleteTableAction =
    | typeof BASKET_TABLE_ACTION
    | typeof ENDO_TABLE_ACTION
    | typeof ANATROF_TABLE_ACTION
    | typeof SUPPLIER_BASKET_TABLE_ACTION;

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
