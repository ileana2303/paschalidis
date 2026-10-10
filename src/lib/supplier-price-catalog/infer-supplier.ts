import type { SupplierPriceCatalogCode } from "@/lib/supplier-price-catalog/types";

export function inferSupplierFromSheetName(
  sheetName: string
): SupplierPriceCatalogCode | null {
  const normalized = sheetName.trim().toUpperCase();
  if (normalized === "FEBI") return "FEBI";
  if (normalized === "PRICES" || normalized === "TRISCAN") return "TRISCAN";
  return null;
}

export function getSupplierFromSheetName(sheetName: string) {
  const supplier = inferSupplierFromSheetName(sheetName);
  if (!supplier) {
    throw new Error(
      `Το φύλλο «${sheetName}» δεν αντιστοιχεί σε γνωστό προμηθευτή (FEBI, PRICES, TRISCAN).`
    );
  }
  return supplier;
}
