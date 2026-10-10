import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/session-token";
import { SUPPLIER_PRICE_CATALOG_OPTIONS } from "@/lib/supplier-price-catalog/constants";
import { uploadSupplierPriceCatalogToSoftOne } from "@/lib/supplier-price-catalog/softone-batch";
import type {
  SupplierPriceCatalogCode,
  SupplierPriceRow,
  UploadSupplierPriceCatalogRequest,
  UploadSupplierPriceCatalogResponse,
} from "@/lib/supplier-price-catalog/types";

const SUPPLIER_CODES = new Set(
  SUPPLIER_PRICE_CATALOG_OPTIONS.map((option) => option.value)
);

function unauthorizedResponse() {
  return NextResponse.json(
    {
      success: false,
      message: "Απαιτείται σύνδεση.",
    },
    { status: 401 }
  );
}

function isSupplierPriceRow(value: unknown): value is SupplierPriceRow {
  if (!value || typeof value !== "object") return false;

  const row = value as Record<string, unknown>;
  return (
    typeof row.code === "string" &&
    typeof row.ean === "string" &&
    typeof row.price === "string"
  );
}

function parseRequest(body: unknown): UploadSupplierPriceCatalogRequest | null {
  if (!body || typeof body !== "object") return null;

  const record = body as Record<string, unknown>;
  const supplier = String(record.supplier ?? "").trim() as SupplierPriceCatalogCode;
  const descr = String(record.descr ?? "").trim();
  const filePath = String(record.filePath ?? "").trim();
  const prefixes = String(record.prefixes ?? "").trim();
  const rows = record.rows;

  if (
    !SUPPLIER_CODES.has(supplier) ||
    !descr ||
    !filePath ||
    !Array.isArray(rows) ||
    rows.length === 0 ||
    !rows.every(isSupplierPriceRow)
  ) {
    return null;
  }

  return {
    supplier,
    descr,
    filePath,
    prefixes,
    rows,
  };
}

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await verifySessionToken(sessionCookie);

    if (!session) {
      return unauthorizedResponse();
    }

    const payload = parseRequest(await req.json().catch(() => null));

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          message: "Μη έγκυρα δεδομένα ανέβασματος τιμοκαταλόγου.",
        },
        { status: 400 }
      );
    }

    const result = await uploadSupplierPriceCatalogToSoftOne(
      {
        supplier: payload.supplier,
        descr: payload.descr,
        filePath: payload.filePath,
        prefixes: payload.prefixes,
        by: session.username,
      },
      payload.rows
    );

    const response: UploadSupplierPriceCatalogResponse = {
      success: true,
      message: "Ο τιμοκατάλογος ανέβηκε επιτυχώς.",
      batchId: result.batchId,
      rowsUploaded: result.rowsUploaded,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[supplier-price-catalog:upload] Server error", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Σφάλμα ανέβασματος τιμοκαταλόγου.",
      },
      { status: 500 }
    );
  }
}
