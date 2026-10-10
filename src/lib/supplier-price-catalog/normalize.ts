import type { SupplierPriceRow } from "@/lib/supplier-price-catalog/types";

function normalizeCell(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

export function normalizePriceString(value: unknown) {
  const raw = normalizeCell(value);
  if (!raw) return "";

  const withoutCurrency = raw.replace(/€/g, "").replace(/\s/g, "").replace(/,/g, "");
  const parsed = Number(withoutCurrency);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return "";
  }

  return parsed.toFixed(2);
}

export function normalizeSupplierPriceRow(
  code: unknown,
  ean: unknown,
  price: unknown
): SupplierPriceRow | null {
  const normalizedCode = normalizeCell(code);
  const normalizedPrice = normalizePriceString(price);

  if (!normalizedCode || !normalizedPrice) {
    return null;
  }

  return {
    code: normalizedCode,
    ean: normalizeCell(ean),
    price: normalizedPrice,
  };
}
