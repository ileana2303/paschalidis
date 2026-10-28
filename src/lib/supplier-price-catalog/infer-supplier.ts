import type { SupplierPriceCatalogCode } from "@/lib/supplier-price-catalog/types";

export function inferSupplierFromSheetName(
  sheetName: string
): SupplierPriceCatalogCode | null {
  const normalized = sheetName.trim().toUpperCase();
  if (normalized === "FEBI") return "FEBI";
  if (normalized === "PRICES") return "PRICES";
  if (normalized === "TRISCAN") return "TRISCAN";
  return null;
}
