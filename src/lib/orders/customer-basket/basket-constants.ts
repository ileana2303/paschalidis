/**
 * Καλάθι Πελάτη - fixed SALDOC values.
 *
 * SERIES is NOT here: it depends on the branch and whether the order is an
 * invoice or retail receipt (see lib/auth/branches.ts).
 */

/** Customer baskets have their own S1 route; falls back to S1_ENDPOINT when unset. */
export const BASKET_ENDPOINT_ENV_KEY = "S1_BASKET_ENDPOINT";

export type BasketReceiptType = "receipt" | "invoice";

export const BASKET_RETAIL_TRDR = 11643;
export const BASKET_RECEIPT_COMMENTS = (customerTrdr: number, customerName?: string) => {
    const name = typeof customerName === "string" ? customerName.trim() : "";
    return `ΠΑΡΑΓΓΕΛΙΑ ΛΙΑΝΙΚΗΣ Α/Α${customerTrdr}${name ? ` - ${name}` : ""}`;
};
export const BASKET_INVOICE_COMMENTS = "ΠΑΡΑΓΓΕΛΙΑ ΧΟΝΔΡΙΚΗΣ B2B";
export const BASKET_PAYMENT = 1006;
export const BASKET_TRUCKS = 2;
export const BASKET_SHIPKIND = 1000;
export const BASKET_SOCASH = 1005;

export const BASKET_TABLE_ACTION = "USRCUST" as const;
export const BASKET_LOG_LABEL = "[orders/basket]";
