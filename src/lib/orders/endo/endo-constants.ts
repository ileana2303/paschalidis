/**
 * Ενδοδιακίνηση Ανταλλακτικών (ENDO) - fixed SALDOC values.
 *
 * Everything in this file is "σταθερό/planted" per the S1 spec: it does NOT
 * depend on the branches involved. Branch-dependent values (clientID, TRDBRANCH,
 * BRANCHSEC/WHOUSESEC, SHIPKIND source/destination wiring) are resolved in
 * `submit-endo-order.ts`.
 */

/** ENDO has its own S1 route; falls back to S1_ENDPOINT when unset. */
export const ENDO_ENDPOINT_ENV_KEY = "S1_ENDO_ENDPOINT";

/** Παραγγελία series - fixed, ENDO never uses the per-branch SALDOC series. */
export const ENDO_SERIES = "7004|πΔ";
export const ENDO_TAXSERIES = "πΔ";

export const ENDO_PAYMENT = 1011;
export const ENDO_TRUCKS = 2;
export const ENDO_SHIPKIND = 1007;
export const ENDO_SOCASH = 3800;

/** ΠΑΣΧΑΛΙΔΗΣ - the internal counterparty every ENDO document is issued to. */
export const ENDO_TRDR = 8674;

export const ENDO_TABLE_ACTION = "ENDO" as const;
export const ENDO_LOG_LABEL = "[orders/endo]";
