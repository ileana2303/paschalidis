export type InferredSupplierPriceCatalogCode = "FEBI" | "PRICES" | "TRISCAN";

export function inferSupplierFromSheetName(
  sheetName: string
): InferredSupplierPriceCatalogCode | null {
  const normalized = sheetName.trim().toUpperCase();
  if (normalized === "FEBI") return "FEBI";
  if (normalized === "PRICES") return "PRICES";
  if (normalized === "TRISCAN") return "TRISCAN";
  return null;
}
