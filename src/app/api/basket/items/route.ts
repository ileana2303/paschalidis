import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
    getSoftOneClientID,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";
import type {
    BasketItemsPayload,
    BasketItemsRoutePayload,
    BasketResponse,
    IBasketItem,
} from "@/lib/interface";

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

function toFiniteNumber(value: unknown): number | null {
    if (value === null || value === undefined) {
        return null;
    }

    const raw = String(value).trim();
    if (!raw) {
        return null;
    }

    const parsed = Number(raw.replace(",", "."));
    if (!Number.isFinite(parsed)) {
        return null;
    }

    return parsed;
}

function resolveErpPrice(row: Partial<IBasketItem>) {
    const primary = toFiniteNumber(row.PRICE_ERP);
    if (primary !== null) {
        return String(primary);
    }

    const secondary = toFiniteNumber(row.BASKET_ERP_PRICE);
    if (secondary !== null) {
        return String(secondary);
    }

    return "0";
}

function resolveRequestedPrice(row: Partial<IBasketItem>, fallbackPrice: string) {
    const primary = toFiniteNumber(row.PRICE_REQ);
    const secondary = toFiniteNumber(row.BASKET_REQ_PRICE);

    if (primary !== null && primary > 0) {
        return String(primary);
    }

    if (secondary !== null && secondary > 0) {
        return String(secondary);
    }

    if (primary !== null) {
        return String(primary);
    }

    if (secondary !== null) {
        return String(secondary);
    }

    return fallbackPrice;
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

    const priceErp = resolveErpPrice(row);
    const priceReq = resolveRequestedPrice(row, priceErp);

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
        IS_APROVED: asString(firstDefined(row.IS_APROVED), ""),
        BargainStatus: asString(firstDefined(row.BargainStatus), ""),
        APPUSER_ID: appUserId,
        BASKET_DATE: asString(firstDefined(row.BASKET_DATE, row.MAX_INS_DATE), ""),
        INS_DATE: asString(firstDefined(row.INS_DATE, row.MAX_INS_DATE), ""),
        MAX_INS_DATE: maxInsDate,
        COMPANY: asString(firstDefined(row.COMPANY), ""),
        CODE: code,
        ITEM_CODE: asString(firstDefined(row.ITEM_CODE, row.CODE), code),
        NAME: asString(firstDefined(row.NAME, row.ITEM_DESCR), ""),
        ITEM_DESCR: asString(firstDefined(row.ITEM_DESCR, row.NAME), ""),
        CODE2: asString(firstDefined(row.CODE2), ""),
        CUST_NAME: asString(firstDefined(row.CUST_NAME), ""),
        BASKET_ERP_PRICE: asString(firstDefined(row.BASKET_ERP_PRICE), ""),
        BASKET_REQ_PRICE: asString(firstDefined(row.BASKET_REQ_PRICE), ""),
    };
}

export async function POST(req: NextRequest) {
    try {
        const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
        if (!sessionCookie?.trim()) {
            return NextResponse.json(
                { success: false, message: 'Απαιτείται σύνδεση.' },
                { status: 401 }
            );
        }

        const body = await req.json() as BasketItemsRoutePayload & { TRDR?: string };
        const normalizedTrdr = String(body.trdr ?? body.TRDR ?? "").trim();

        if (!normalizedTrdr || !Number.isFinite(Number(normalizedTrdr))) {
            return NextResponse.json(
                { success: false, message: 'Απαιτείται κωδικός πελάτη (TRDR).', totalcount: 0, rows: [] },
                { status: 400 }
            );
        }

        const clientID = getSoftOneClientID();

        if (!clientID) {
            return NextResponse.json(
                { success: false, message: 'Δεν έχει ρυθμιστεί ο πελάτης SoftOne.', totalcount: 0, rows: [] },
                { status: 500 }
            );
        }

        const payload: BasketItemsPayload = {
            service: "SqlData",
            clientID,
            appId: "1305",
            SqlName: "BASKET_OUT",
            TRDR: normalizedTrdr,
        };

        const response = await postSoftOne(payload);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[basket/items] Upstream error body:", errorText);
            
            if (response.status === 404) {
                const emptyData: BasketResponse = {
                    success: true,
                    message: "Δεν βρέθηκαν στοιχεία καλαθιού για τον συγκεκριμένο πελάτη",
                    totalcount: 0,
                    rows: [],
                };

                return NextResponse.json(emptyData);
            }

            return NextResponse.json(
                { success: false, message: 'Αποτυχία επικοινωνίας με το ERP.', totalcount: 0, rows: [] },
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
                    message: upstreamData.message ?? 'Αποτυχία φόρτωσης καλαθιού.',
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
            { success: false, message: 'Σφάλμα διακομιστή.' },
            { status: 500 }
        );
    }
}
