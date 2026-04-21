import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import type {
    BasketItemsPayload,
    BasketItemsRoutePayload,
    BasketResponse,
    IBasketItem,
} from "@/app/lib/interface";

const S1_ENDPOINT = "https://fordps.oncloud.gr/s1services";
const GREEK_FALLBACK_ENCODINGS = ["windows-1253", "iso-8859-7"] as const;

function getClientID() {
    return process.env.S1_CLIENT_ID?.trim().replace(/^['"]|['"]$/g, "");
}

function getCharset(contentType: string | null) {
    if (!contentType) {
        return null;
    }

    const match = contentType.match(/charset=([^;]+)/i);
    return match?.[1]?.trim().toLowerCase() ?? null;
}

async function parseJsonWithEncodingFallback(response: Response) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    const candidateEncodings = new Set<string>();
    const declaredCharset = getCharset(response.headers.get("content-type"));

    if (declaredCharset) {
        candidateEncodings.add(declaredCharset);
    }

    candidateEncodings.add("utf-8");

    for (const encoding of GREEK_FALLBACK_ENCODINGS) {
        candidateEncodings.add(encoding);
    }

    let lastError: Error | null = null;

    for (const encoding of candidateEncodings) {
        try {
            const text = new TextDecoder(encoding).decode(bytes);

            if (encoding === "utf-8" && text.includes("\uFFFD")) {
                continue;
            }

            return JSON.parse(text);
        } catch (error) {
            lastError =
                error instanceof Error
                    ? error
                    : new Error("Failed to decode upstream response");
        }
    }

    throw lastError ?? new Error("Failed to decode upstream response");
}

function firstDefined<T>(...values: Array<T | null | undefined>): T | undefined {
    for (const value of values) {
        if (value !== null && value !== undefined) {
            return value;
        }
    }

    return undefined;
}

function asString(value: unknown, fallback = ""): string {
    if (value === null || value === undefined) {
        return fallback;
    }

    return String(value);
}

function mapRowToBasketItem(
    row: Partial<IBasketItem>,
    trdr: string,
    index: number
): IBasketItem {
    const mtrl = asString(firstDefined(row.MTRL), "");
    const code = asString(firstDefined(row.CODE, row.ITEM_CODE), "");
    const maxInsDate = asString(firstDefined(row.MAX_INS_DATE), "");
    const appUserId = asString(firstDefined(row.APPUSER_ID), "");
    const totalQty = asString(firstDefined(row.TOTAL_QTY, row.QTY, row.BASKET_QTY), "0");
    const fallbackUid = [mtrl, code, appUserId, maxInsDate, String(index)]
        .filter(Boolean)
        .join("-");
    const basketId = asString(
        firstDefined(row.BASKETID, row.MTRL, row.ITEM_CODE),
        fallbackUid || String(index)
    );

    const priceErp = asString(
        firstDefined(row.PRICE_ERP, row.BASKET_ERP_PRICE),
        "0"
    );
    const priceReq = asString(
        firstDefined(row.PRICE_REQ, row.BASKET_REQ_PRICE),
        priceErp
    );

    return {
        BASKETID: basketId,
        TRDR: asString(firstDefined(row.TRDR), trdr),
        MTRL: mtrl,
        QTY: totalQty,
        TOTAL_QTY: totalQty,
        PRICE_ERP: priceErp,
        PRICE_REQ: priceReq,
        BRANCH: asString(firstDefined(row.BRANCH), ""),
        TRD_BRANCH: asString(firstDefined(row.TRD_BRANCH), ""),
        IS_APROVED: asString(firstDefined(row.IS_APROVED, row.BargainStatus), ""),
        APPUSER_ID: appUserId,
        BASKET_DATE: asString(firstDefined(row.BASKET_DATE, row.MAX_INS_DATE), ""),
        INS_DATE: asString(firstDefined(row.INS_DATE, row.MAX_INS_DATE), ""),
        MAX_INS_DATE: maxInsDate,
        COMPANY: asString(firstDefined(row.COMPANY), ""),
        CODE: code,
        NAME: asString(firstDefined(row.NAME, row.ITEM_DESCR), ""),
        CODE2: asString(firstDefined(row.CODE2), ""),
        CUST_NAME: asString(firstDefined(row.CUST_NAME), ""),
    };
}

export async function POST(req: NextRequest) {
    try {
        const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
        if (!sessionCookie?.trim()) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await req.json() as BasketItemsRoutePayload & { TRDR?: string };
        const normalizedTrdr = String(body.trdr ?? body.TRDR ?? "").trim();

        if (!normalizedTrdr || !Number.isFinite(Number(normalizedTrdr))) {
            return NextResponse.json(
                { success: false, message: "Customer TRDR is required", totalcount: 0, rows: [] },
                { status: 400 }
            );
        }

        const clientID = getClientID();

        if (!clientID) {
            return NextResponse.json(
                { success: false, message: "S1 client is not configured", totalcount: 0, rows: [] },
                { status: 500 }
            );
        }

        const payload: BasketItemsPayload = {
            service: "SqlData",
            clientID,
            appId: "1305",
            SqlName: "ITEM_PER_CUST_ITEM",
            TRDR: normalizedTrdr,
        };

        const response = await fetch(S1_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[basket/items] Upstream error body:", errorText);

            return NextResponse.json(
                { success: false, message: "Upstream request failed", totalcount: 0, rows: [] },
                { status: response.status }
            );
        }

        const upstreamData = await parseJsonWithEncodingFallback(response) as {
            success?: boolean;
            message?: string;
            totalcount?: number;
            rows?: Array<Partial<IBasketItem>>;
        };

        if (upstreamData?.success === false) {
            return NextResponse.json(
                {
                    success: false,
                    message: upstreamData.message ?? "Upstream basket request failed",
                    totalcount: 0,
                    rows: [],
                },
                { status: 502 }
            );
        }

        const sourceRows = Array.isArray(upstreamData?.rows) ? upstreamData.rows : [];
        const rows = sourceRows.map((row, index) =>
            mapRowToBasketItem(row, normalizedTrdr, index)
        );

        const data: BasketResponse = {
            success: true,
            message: typeof upstreamData?.message === "string" ? upstreamData.message : undefined,
            totalcount:
                typeof upstreamData?.totalcount === "number"
                    ? upstreamData.totalcount
                    : rows.length,
            rows,
        };

        return NextResponse.json(data);
    } catch (error) {
        console.error("[basket/items] Server error", error);

        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}
