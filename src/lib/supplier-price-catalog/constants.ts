import type { SupplierPriceCatalogCode } from "@/lib/supplier-price-catalog/types";

export const SUPPLIER_PRICE_CATALOG_OPTIONS: Array<{
  value: SupplierPriceCatalogCode;
  label: string;
}> = [
  { value: "FEBI", label: "FEBI" },
  { value: "PRICES", label: "PRICES" },
  { value: "TRISCAN", label: "TRISCAN" },
];

/** Rows per SoftOne `savePrices` request. */
export const SUPPLIER_PRICE_SAVE_CHUNK_SIZE = 500;

export const SUPPLIER_PRICE_SHEET_SKIP_NAMES = new Set([
  "ODIGIES",
  "ΟΔΗΓΙΕΣ",
  "INSTRUCTIONS",
]);

export const REQUIRED_SUPPLIER_PRICE_HEADERS = ["CODE", "EAN", "PRICE"] as const;

export const SUPPLIER_PRICE_INVALID_HEADERS_MESSAGE =
  "Οι στήλες επικεφαλίδας δεν είναι οι αναμενόμενες. Απαιτούνται ακριβώς: CODE, EAN, PRICE.";
