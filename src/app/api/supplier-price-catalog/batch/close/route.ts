import { NextRequest, NextResponse } from "next/server";
import { requireSupplierPriceCatalogSession } from "@/app/api/supplier-price-catalog/_lib/session";
import { closeSupplierPriceBatch } from "@/lib/supplier-price-catalog/softone-batch";

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

    if (!Number.isFinite(batchId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Μη έγκυρο batchId.",
        },
        { status: 400 }
      );
    }

    await closeSupplierPriceBatch(batchId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[supplier-price-catalog:batch:close] Server error", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Αποτυχία κλεισίματος batch.",
      },
      { status: 500 }
    );
  }
}
