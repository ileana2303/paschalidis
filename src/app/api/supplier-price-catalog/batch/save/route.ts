import { NextRequest, NextResponse } from "next/server";
import { requireSupplierPriceCatalogSession } from "@/app/api/supplier-price-catalog/_lib/session";
import { saveSupplierPriceBatchChunk } from "@/lib/supplier-price-catalog/softone-batch";
import type { SupplierPriceRow } from "@/lib/supplier-price-catalog/types";

function isSupplierPriceRow(value: unknown): value is SupplierPriceRow {
  if (!value || typeof value !== "object") return false;

  const row = value as Record<string, unknown>;
  return (
    typeof row.code === "string" &&
    typeof row.ean === "string" &&
    typeof row.price === "string"
  );
}

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
    const batchId = Number(body.batchId);
    const rowOffset = Number(body.rowOffset);
    const rows = body.rows;

    if (
      !Number.isFinite(batchId) ||
      !Number.isFinite(rowOffset) ||
      rowOffset < 0 ||
      !Array.isArray(rows) ||
      rows.length === 0 ||
      !rows.every(isSupplierPriceRow)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Μη έγκυρα δεδομένα αποθήκευσης τιμών.",
        },
        { status: 400 }
      );
    }

    await saveSupplierPriceBatchChunk(batchId, rowOffset, rows);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[supplier-price-catalog:batch:save] Server error", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Αποτυχία αποθήκευσης γραμμών τιμών.",
      },
      { status: 500 }
    );
  }
}
