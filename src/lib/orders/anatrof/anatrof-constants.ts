export const ANATROF_ENDPOINT_ENV_KEY = "S1_ANATROF_ENDPOINT";
export const ANATROF_PAYMENT = 1006;
export const ANATROF_TRUCKS = 2;
export const ANATROF_SHIPKIND = 1000;
export const ANATROF_SOCASH = 1005;

/**
 * ΠΑΣΧΑΛΙΔΗΣ - stock replenishment is always issued to the same counterparty.
 * Branch 1006 always supplies the items; TRDBRANCH is resolved separately from
 * the branch requesting them.
 */
export const ANATROF_TRDR = 8674;
export const ANATROF_SUPPLYING_BRANCH = 1006;
export const ANATROF_DEFAULT_SERIES = "17002";
export const ANATROF_DEFAULT_BRANCH = 1006;

export const ANATROF_TABLE_ACTION = "ANATROF" as const;
export const ANATROF_LOG_LABEL = "[orders/anatrof]";
