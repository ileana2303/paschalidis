import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
    getEnvString,
    getSoftOneClientID,
    getSoftOneSetDataClientID,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";
import type {
    BasketActionResponse,
    BasketOutPayload,
    BasketSubmitRoutePayload,
    IBasketItem,
} from "@/lib/interface";
import { callMassDelete, MassDeleteError } from "@/app/api/mass-delete/mass-delete";

const DEFAULT_ORDER_SERIES = "17002";
const DEFAULT_ORDER_TAX_SERIES = "\u03c0\u0394";
const DEFAULT_ORDER_PAYMENT = 1006;
const DEFAULT_ORDER_SHIPKIND = 1000;
const DEFAULT_ORDER_SOCASH = 1005;
const DEFAULT_ORDER_TRUCKS = 2;
const DEFAULT_ORDER_BRANCH = 1006;
const DEFAULT_ORDER_TRD_BRANCH = 1000;
const DEFAULT_DELETE_TABLE_ACTION = "USRCUST";
const DEFAULT_DELETE_METHOD = "LINK_S1";
const ZERO_GUID = "00000000-0000-0000-0000-000000000000";

type BasketSubmitRequestBody = BasketSubmitRoutePayload & {
    BRANCH?: string | number;
    TRDBRANCH?: string | number;
    PAYMENT?: string | number;
    SHIPKIND?: string | number;
    SOCASH?: string | number;
    TRUCKS?: string | number;
    DELIVDATE?: string;
    SERIES?: string | number;
    SERIESNUM?: string | number;
    TAXSERIES?: string;
    COMMENTS?: string;
    REMARKS?: string;
    TABLE_ACTION?: string;
    METHOD?: string;
    APPUSER_ID?: string;
};

type SetDataOrderPayload = {
    service: "setData";
    clientID: string;
    appId: "1305";
    OBJECT: "SALDOC";
    KEY: "";
    data: {
        SALDOC: Array<{
            SERIES: string;
            TAXSERIES: string;
            TRDR: number;
            TRDBRANCH: number;
            PAYMENT: number;
            SERIESNUM: string;
            TRUCKS: number;
            DELIVDATE: string;
            COMMENTS: string;
            REMARKS: string;
            SHIPKIND: number;
            SOCASH: number;
        }>;
        MTRDOC: Array<{
            TRUCKS: number;
            DELIVDATE: string;
            DEPTRDR_CUSTOMER_CODE: string;
            BILLTRDR_CUSTOMER_CODE: string;
            BRANCHSEC: number;
            WHOUSESEC: number;
        }>;
        ITELINES: Array<{
            MTRL: number;
            QTY1: number;
        }>;
    };
};

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

function asPositiveNumber(value: unknown): number | undefined {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return undefined;
    }

    return parsed;
}

function getEnvPositiveNumber(name: string, fallback: number) {
    const parsed = asPositiveNumber(getEnvString(name));
    return parsed ?? fallback;
}

function resolveIsoDate(value: unknown) {
    const rawValue = asString(value).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
        return rawValue;
    }

    if (/^\d{4}-\d{2}-\d{2}T/.test(rawValue)) {
        return rawValue.slice(0, 10);
    }

    return new Date().toISOString().slice(0, 10);
}

function getMappedTrdBranchByBranch(branchCode: number | undefined) {
    if (branchCode === 1006) return 13;
    if (branchCode === 1007) return 14;
    if (branchCode === 1001) return 15;
    return undefined;
}

function buildOrderLines(rows: Array<Partial<IBasketItem>>) {
    const aggregatedByMtrl = new Map<number, number>();

    for (const row of rows) {
        const mtrl = asPositiveNumber(row.MTRL);
        const qty = asPositiveNumber(firstDefined(row.QTY, row.TOTAL_QTY, row.BASKET_QTY));

        if (!mtrl || !qty) {
            continue;
        }

        aggregatedByMtrl.set(mtrl, (aggregatedByMtrl.get(mtrl) ?? 0) + qty);
    }

    return Array.from(aggregatedByMtrl.entries()).map(([MTRL, QTY1]) => ({
        MTRL,
        QTY1,
    }));
}

function buildBasketIds(rows: Array<Partial<IBasketItem>>) {
    const ids = new Set<string>();

    for (const row of rows) {
        const basketId = asString(row.BASKETID).trim();
        if (basketId) {
            ids.add(basketId);
        }
    }

    return Array.from(ids);
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

        const body = await req.json() as BasketSubmitRequestBody;
        const normalizedTrdr = asString(body.TRDR).trim();
        const sqlClientID = getSoftOneClientID();

        if (!normalizedTrdr || !Number.isFinite(Number(normalizedTrdr))) {
            return NextResponse.json(
                { success: false, message: "Customer TRDR is required" },
                { status: 400 }
            );
        }

        if (!sqlClientID) {
            return NextResponse.json(
                { success: false, message: "S1 SQL client is not configured" },
                { status: 500 }
            );
        }

        const basketOutPayload: BasketOutPayload = {
            service: "SqlData",
            clientID: sqlClientID,
            appId: "1305",
            SqlName: "BASKET_OUT",
            TRDR: normalizedTrdr,
        };

        const basketOutResponse = await postSoftOne(basketOutPayload);

        if (!basketOutResponse.ok) {
            const errorText = await basketOutResponse.text();
            console.error("[basket/submit] Basket lookup error body:", errorText);

            return NextResponse.json(
                { success: false, message: "Upstream basket lookup failed" },
                { status: basketOutResponse.status }
            );
        }

        const basketOutData = await parseJsonWithEncodingFallback(basketOutResponse) as {
            success?: boolean;
            message?: string;
            rows?: Array<Partial<IBasketItem>>;
        };

        if (basketOutData?.success === false) {
            return NextResponse.json(
                {
                    success: false,
                    message: basketOutData.message ?? "Upstream basket lookup failed",
                },
                { status: 502 }
            );
        }

        const basketRows = Array.isArray(basketOutData?.rows) ? basketOutData.rows : [];
        const orderLines = buildOrderLines(basketRows);
        const basketIds = buildBasketIds(basketRows);

        if (orderLines.length === 0) {
            return NextResponse.json(
                { success: false, message: "Basket is empty. Add items before submitting order." },
                { status: 400 }
            );
        }

        if (basketIds.length === 0) {
            return NextResponse.json(
                { success: false, message: "Unable to resolve basket ids for cleanup." },
                { status: 400 }
            );
        }

        const firstRow = basketRows[0] ?? {};
        const firstAppUserId = basketRows
            .map((row) => asString(row.APPUSER_ID).trim())
            .find(Boolean);
        const fallbackBranch = getEnvPositiveNumber("S1_ORDER_BRANCH", DEFAULT_ORDER_BRANCH);
        const fallbackTrdBranch = getEnvPositiveNumber("S1_ORDER_TRDBRANCH", DEFAULT_ORDER_TRD_BRANCH);
        const fallbackPayment = getEnvPositiveNumber("S1_ORDER_PAYMENT", DEFAULT_ORDER_PAYMENT);
        const fallbackShipkind = getEnvPositiveNumber("S1_ORDER_SHIPKIND", DEFAULT_ORDER_SHIPKIND);
        const fallbackSocash = getEnvPositiveNumber("S1_ORDER_SOCASH", DEFAULT_ORDER_SOCASH);
        const fallbackTrucks = getEnvPositiveNumber("S1_ORDER_TRUCKS", DEFAULT_ORDER_TRUCKS);
        const tableAction =
            asString(
                body.TABLE_ACTION,
                getEnvString("S1_MASS_DELETE_TABLE_ACTION") || DEFAULT_DELETE_TABLE_ACTION
            ).trim() || DEFAULT_DELETE_TABLE_ACTION;
        const deleteMethod =
            asString(
                body.METHOD,
                getEnvString("S1_MASS_DELETE_METHOD") || DEFAULT_DELETE_METHOD
            ).trim() || DEFAULT_DELETE_METHOD;
        const deleteAppUserId =
            asString(
                firstDefined(body.APPUSER_ID, firstAppUserId),
                getEnvString("S1_MASS_DELETE_APPUSER_ID") || ZERO_GUID
            ).trim() || ZERO_GUID;

        const orderBranch =
            asPositiveNumber(firstDefined(body.BRANCH, firstRow.BRANCH)) ??
            fallbackBranch;
        const mappedOrderTrdBranch = getMappedTrdBranchByBranch(orderBranch);
        const orderTrdBranch =
            mappedOrderTrdBranch ??
            asPositiveNumber(firstDefined(body.TRDBRANCH, firstRow.TRD_BRANCH)) ??
            fallbackTrdBranch;
        const orderPayment =
            asPositiveNumber(body.PAYMENT) ??
            fallbackPayment;
        const orderShipkind =
            asPositiveNumber(body.SHIPKIND) ??
            fallbackShipkind;
        const orderSocash =
            asPositiveNumber(body.SOCASH) ??
            fallbackSocash;
        const orderTrucks =
            asPositiveNumber(body.TRUCKS) ??
            fallbackTrucks;

        const orderSeries =
            asString(
                body.SERIES,
                getEnvString("S1_ORDER_SERIES") || DEFAULT_ORDER_SERIES
            ).trim() || DEFAULT_ORDER_SERIES;
        const orderTaxSeries =
            asString(
                body.TAXSERIES,
                getEnvString("S1_ORDER_TAXSERIES") || DEFAULT_ORDER_TAX_SERIES
            ).trim() || DEFAULT_ORDER_TAX_SERIES;
        const orderSeriesNum = asString(
            body.SERIESNUM,
            getEnvString("S1_ORDER_SERIESNUM")
        ).trim();

        const deliveryDate = resolveIsoDate(body.DELIVDATE);

        const comments = asString(
            firstDefined(body.NOTES, body.COMMENTS)
        ).trim();
        const remarks = `Web order submission for TRDR ${normalizedTrdr}`;

        const setDataClientID = getSoftOneSetDataClientID(orderBranch);
        if (!setDataClientID) {
            return NextResponse.json(
                { success: false, message: "S1 setData client is not configured" },
                { status: 500 }
            );
        }

        const setDataPayload: SetDataOrderPayload = {
            service: "setData",
            clientID: setDataClientID,
            appId: "1305",
            OBJECT: "SALDOC",
            KEY: "",
            data: {
                SALDOC: [
                    {
                        SERIES: orderSeries,
                        TAXSERIES: orderTaxSeries,
                        TRDR: Number(normalizedTrdr),
                        TRDBRANCH: orderTrdBranch,
                        PAYMENT: orderPayment,
                        SERIESNUM: orderSeriesNum,
                        TRUCKS: orderTrucks,
                        DELIVDATE: deliveryDate,
                        COMMENTS: comments,
                        REMARKS: remarks,
                        SHIPKIND: orderShipkind,
                        SOCASH: orderSocash,
                    },
                ],
                MTRDOC: [
                    {
                        TRUCKS: orderTrucks,
                        DELIVDATE: deliveryDate,
                        DEPTRDR_CUSTOMER_CODE: "",
                        BILLTRDR_CUSTOMER_CODE: "",
                        BRANCHSEC: orderBranch,
                        WHOUSESEC: orderBranch,
                    },
                ],
                ITELINES: orderLines,
            },
        };

        const setDataResponse = await postSoftOne(setDataPayload);

        if (!setDataResponse.ok) {
            const errorText = await setDataResponse.text();
            console.error("[basket/submit] setData error body:", errorText);

            return NextResponse.json(
                { success: false, message: "Upstream order submission failed" },
                { status: setDataResponse.status }
            );
        }

        const setDataResult = await parseJsonWithEncodingFallback(setDataResponse) as {
            success?: boolean;
            message?: string;
            id?: string | number;
        };

        if (setDataResult?.success === false) {
            return NextResponse.json(
                {
                    success: false,
                    message: setDataResult.message ?? "Upstream order submission failed",
                },
                { status: 502 }
            );
        }

        const orderId = asString(setDataResult?.id).trim();
        if (!orderId) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Order submitted but response id is missing. Basket cleanup was not executed.",
                },
                { status: 502 }
            );
        }

        let massDeleteMessage: string | undefined;
        try {
            const massDeleteResult = await callMassDelete({
                clientID: sqlClientID,
                basketIds,
                tableAction,
                method: deleteMethod,
                s1Key: orderId,
                appUserId: deleteAppUserId,
                logLabel: "[basket/submit]",
            });
            massDeleteMessage = massDeleteResult.message;
        } catch (error) {
            if (error instanceof MassDeleteError) {
                return NextResponse.json(
                    {
                        success: false,
                        message:
                            `Order submitted (${orderId}) but basket cleanup failed`,
                    },
                    { status: error.status }
                );
            }

            throw error;
        }

        const submittedMessage =
            setDataResult?.message ?? `Order submitted (${orderId})`;
        const responseData: BasketActionResponse = {
            success: true,
            message:
                massDeleteMessage
                    ? `${submittedMessage}. ${massDeleteMessage}`
                    : `${submittedMessage}. Basket cleared`,
            id: orderId || undefined,
        };

        return NextResponse.json(responseData);
    } catch (error) {
        console.error("[basket/submit] Server error", error);

        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}
