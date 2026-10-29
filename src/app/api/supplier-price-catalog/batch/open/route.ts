import { NextRequest, NextResponse } from "next/server";
import { requireSupplierPriceCatalogSession } from "@/app/api/supplier-price-catalog/_lib/session";
import { openSupplierPriceBatch } from "@/lib/supplier-price-catalog/softone-batch";
import {
  isValidSupplierPriceCatalogCode,
  normalizeSupplierPriceCatalogCode,
} from "@/lib/supplier-price-catalog/normalize-supplier";

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
    const supplier = normalizeSupplierPriceCatalogCode(
      String(body.supplier ?? "")
    );
    const descr = String(body.descr ?? "").trim();
    const filePath = String(body.filePath ?? "").trim();
    const prefixes = String(body.prefixes ?? "").trim();

    if (!isValidSupplierPriceCatalogCode(supplier) || !descr || !filePath) {
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
