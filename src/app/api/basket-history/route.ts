import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { canAccessPath } from "@/lib/auth/permissions";
import { verifySessionToken } from "@/lib/auth/session-token";
import {
  BASKET_HISTORY_ERROR,
  BASKET_HISTORY_FIELDS,
  BASKET_HISTORY_PATH,
  type BasketHistoryResponse,
  type BasketHistoryRow,
} from "@/lib/basket-history";
import {
  getSoftOneClientID,
  parseJsonWithEncodingFallback,
  postSoftOne,
} from "@/lib/softone";

function failure(message: string, status: number) {
  return NextResponse.json(
    { success: false, message, totalcount: 0, rows: [] } satisfies BasketHistoryResponse,
    { status }
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function GET(request: NextRequest) {
  const session = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value
  );

  if (!session) return failure("Απαιτείται σύνδεση.", 401);
  if (!canAccessPath(session, BASKET_HISTORY_PATH)) {
    return failure("Δεν έχετε πρόσβαση στο ιστορικό καλαθιών.", 403);
  }

  // ALL_BASKET_HISTORY uses the Athens credential to read all branches.
  const clientID = getSoftOneClientID("1006");
  if (!clientID) {
    return failure("Δεν έχει ρυθμιστεί ο πελάτης SoftOne.", 500);
  }

  try {
    const response = await postSoftOne({
      service: "SqlData",
      clientID,
      appId: "1305",
      SqlName: "ALL_BASKET_HISTORY",
    });

    if (!response.ok) return failure(BASKET_HISTORY_ERROR, 502);

    const data = await parseJsonWithEncodingFallback<unknown>(response);
    if (!isRecord(data) || data.success !== true || !Array.isArray(data.rows)) {
      return failure(BASKET_HISTORY_ERROR, 502);
    }

    const rows = data.rows.filter(isRecord).map((row) =>
      Object.fromEntries(
        BASKET_HISTORY_FIELDS.map((field) => [field, String(row[field] ?? "").trim()])
      ) as BasketHistoryRow
    );

    return NextResponse.json({
      success: true,
      totalcount: typeof data.totalcount === "number" ? data.totalcount : rows.length,
      rows,
    } satisfies BasketHistoryResponse);
  } catch {
    return failure(BASKET_HISTORY_ERROR, 502);
  }
}
