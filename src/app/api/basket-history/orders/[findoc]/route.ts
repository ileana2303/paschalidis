import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { canAccessPath } from "@/lib/auth/permissions";
import { verifySessionToken } from "@/lib/auth/session-token";
import {
  BASKET_HISTORY_ORDER_ERROR,
  BASKET_HISTORY_ORDER_SECTIONS,
  BASKET_HISTORY_PATH,
  basketHistoryShowsPrices,
  type BasketHistoryOrderDetails,
  type BasketHistoryOrderResponse,
} from "@/lib/basket-history";
import { getSoftOneClientID, getSoftOneData } from "@/lib/softone";

const sections = Object.entries(BASKET_HISTORY_ORDER_SECTIONS);

function failure(message: string, status: number) {
  return NextResponse.json(
    { success: false, message } satisfies BasketHistoryOrderResponse,
    { status }
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ findoc: string }> }
) {
  const session = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value
  );
  if (!session) return failure("Απαιτείται σύνδεση.", 401);
  if (!canAccessPath(session, BASKET_HISTORY_PATH)) {
    return failure("Δεν έχετε πρόσβαση στο ιστορικό καλαθιών.", 403);
  }

  const { findoc } = await params;
  if (!/^\d+$/.test(findoc)) return failure("Μη έγκυρο FINDOC.", 400);

  const clientID = getSoftOneClientID();
  if (!clientID) {
    return failure("Δεν έχει ρυθμιστεί ο πελάτης SoftOne.", 500);
  }

  const includePrices = basketHistoryShowsPrices(
    request.nextUrl.searchParams.get("source") ?? ""
  );
  const requestedSections = sections.map(([name, { fields }]) => ({
    name,
    fields: Object.keys(fields).filter((field) => includePrices || field !== "PRICE"),
  }));
  const locateInfo = requestedSections
    .map(({ name, fields }) => `${name}: ${fields.join(",")}`)
    .join(" ;");

  try {
    const result = await getSoftOneData<Record<string, unknown>>({
      clientID,
      appId: "1305",
      object: "SALDOC",
      key: findoc,
      locateInfo,
    });
    const data = Object.fromEntries(
      requestedSections.map(({ name, fields }) => {
        const rows = result.data?.[name];
        if (!Array.isArray(rows)) return [name, []];

        return [
          name,
          rows
            .filter((row) => row && typeof row === "object" && !Array.isArray(row))
            .map((row) =>
              Object.fromEntries(
                fields.map((field) => [field, String(row[field] ?? "").trim()])
              )
            ),
        ];
      })
    ) as BasketHistoryOrderDetails;

    if (!data.SALDOC?.length) return failure("Δεν βρέθηκε το παραστατικό.", 404);

    return NextResponse.json({ success: true, data } satisfies BasketHistoryOrderResponse);
  } catch {
    return failure(BASKET_HISTORY_ORDER_ERROR, 502);
  }
}
