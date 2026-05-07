import type {
    MassDeleteTableAction,
    OrderSubmitType,
    SubmitMode,
} from "./order-submit-types";

type OrderSubmitConfig = {
    submitType: OrderSubmitType;
    submitMode: SubmitMode;
    comments: string;
    tableAction: MassDeleteTableAction;
    massDeleteMethod: "LINK_S1";
    setDataEndpointEnvKey?: string;
};

export const ORDER_SUBMIT_CONFIG: Record<OrderSubmitType, OrderSubmitConfig> = {
    basket: {
        submitType: "basket",
        submitMode: "single-order",
        comments: "CUST BASKET",
        tableAction: "USRCUST",
        massDeleteMethod: "LINK_S1",
        setDataEndpointEnvKey: "S1_BASKET_ENDPOINT",
    },
    endo: {
        submitType: "endo",
        submitMode: "per-line",
        comments: "ENDO BASKET",
        tableAction: "ENDO",
        massDeleteMethod: "LINK_S1",
        setDataEndpointEnvKey: "S1_ENDO_ENDPOINT",
    },
    anatrof: {
        submitType: "anatrof",
        submitMode: "single-order",
        comments: "ANATROF BASKET",
        tableAction: "ANATROF",
        massDeleteMethod: "LINK_S1",
        setDataEndpointEnvKey: "S1_ANATROF_ENDPOINT",
    },
} as const;

export function getOrderSubmitConfig(submitType: unknown) {
    if (
        submitType !== "basket" &&
        submitType !== "endo" &&
        submitType !== "anatrof"
    ) {
        return null;
    }

    return ORDER_SUBMIT_CONFIG[submitType];
}
