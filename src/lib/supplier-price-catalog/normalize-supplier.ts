export const SUPPLIER_PRICE_GENERIC_CODE = "GENERIC";

export function normalizeSupplierPriceCatalogCode(raw: string) {
  return (raw.trim() || SUPPLIER_PRICE_GENERIC_CODE).toUpperCase();
}

export function isValidSupplierPriceCatalogCode(normalized: string) {
  return (
    normalized.length >= 1 &&
    normalized.length <= 64 &&
    /^[A-Z0-9_-]+$/.test(normalized)
  );
}
