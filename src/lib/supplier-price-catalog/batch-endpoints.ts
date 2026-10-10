import { getEnvString, getSoftOneEndpoint, sanitizeEnvValue } from "@/lib/softone";

export type SupplierPriceBatchAction =
  | "openBatch"
  | "savePrices"
  | "closeBatch";

export function getSupplierPriceBatchEndpoint(action: SupplierPriceBatchAction) {
  const configuredBase = sanitizeEnvValue(
    getEnvString("S1_BATCH_ENDPOINT_BASE")
  );

  if (configuredBase) {
    return `${configuredBase.replace(/\/+$/, "")}/${action}`;
  }

  const root = getSoftOneEndpoint()
    .replace(/\/+$/, "")
    .replace(/\/JS\/SiteData\.Items(?:\/[^/]+)?$/i, "");

  return `${root}/JS/SiteData.BATCH/${action}`;
}
