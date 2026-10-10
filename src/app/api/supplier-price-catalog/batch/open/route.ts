import { NextRequest, NextResponse } from "next/server";
import { requireSupplierPriceCatalogSession } from "@/app/api/supplier-price-catalog/_lib/session";
import { SUPPLIER_PRICE_CATALOG_OPTIONS } from "@/lib/supplier-price-catalog/constants";
import { openSupplierPriceBatch } from "@/lib/supplier-price-catalog/softone-batch";
import type { SupplierPriceCatalogCode } from "@/lib/supplier-price-catalog/types";

const SUPPLIER_CODES = new Set(
  SUPPLIER_PRICE_CATALOG_OPTIONS.map((option) => option.value)
);

export async function POST(req: NextRequest) {
  try {
    const session = await requireSupplierPriceCatalogSession(req);

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Απαιτείται σύνδεση." },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const supplier = String(body.supplier ?? "").trim() as SupplierPriceCatalogCode;
    const descr = String(body.descr ?? "").trim();
    const filePath = String(body.filePath ?? "").trim();
    const prefixes = String(body.prefixes ?? "").trim();

    if (!SUPPLIER_CODES.has(supplier) || !descr || !filePath) {
      return NextResponse.json(
        {
          success: false,
          message: "Μη έγκυρα δεδομένα για άνοιγμα batch.",
        },
        { status: 400 }
      );
    }

    const batchId = await openSupplierPriceBatch({
      supplier,
      descr,
      filePath,
      prefixes,
      by: session.username,
    });

    return NextResponse.json({ success: true, batchId });
  } catch (error) {
    console.error("[supplier-price-catalog:batch:open] Server error", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Αποτυχία ανοίγματος batch.",
      },
      { status: 500 }
    );
  }
}
