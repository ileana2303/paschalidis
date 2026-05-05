import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
    getSoftOneClientID,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";
import {
    callMassDelete,
    MassDeleteError,
} from "@/app/api/mass-delete/mass-delete";
import type {
    BasketActionResponse,
    BasketMassDeleteRoutePayload,
    RequestedPriceApprovePayload,
    RequestedPriceApproveWithPricePayload,
    RequestedPriceListPayload,
    RequestedPriceListResponse,
    RequestedPriceUpdateAction,
    RequestedPriceUpdateRoutePayload,
} from "@/lib/interface";

const S1_APP_ID = "1305";
const DEFAULT_DELETE_TABLE_ACTION = "USRCUST";
const DEFAULT_DELETE_METHOD = "DELETE";
const DEFAULT_DELETE_S1_KEY = "1305";
const DEFAULT_DELETE_APPUSER_ID = "00000001-0001-0001-0001-000000000001";

function hasSession(req: NextRequest) {
    return Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value?.trim());
}

function unauthorizedResponse() {
    return NextResponse.json(
        {
            success: false,
            message: "Unauthorized",
        },
        { status: 401 }
    );
}

function missingClientResponse() {
    return NextResponse.json(
        {
            success: false,
            message: "S1 client is not configured",
        },
        { status: 500 }
    );
}

function isValidUpdateAction(value: string): value is RequestedPriceUpdateAction {
    return value === "APPROVE" || value === "APPROVE_WITH_PRICE";
}

function normalizePositiveInteger(value: unknown) {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

function normalizePositiveNumber(value: unknown) {
    if (value == null) {
        return null;
    }

    const raw = String(value).trim();
    if (!raw) {
        return null;
    }

    const parsed = Number(raw.replace(",", "."));

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

async function callSoftOne(payload: unknown, logLabel: string) {
    const response = await postSoftOne(payload);

    if (!response.ok) {
        const errorText = await response.text();

        console.error(`${logLabel} Upstream error body:`, errorText);

        throw new Error(`Upstream request failed with status ${response.status}`);
    }

    return response;
}

export async function POST(req: NextRequest) {
    try {
        if (!hasSession(req)) {
            return unauthorizedResponse();
        }

        const clientID = getSoftOneClientID();

        if (!clientID) {
            return missingClientResponse();
        }

        const payload: RequestedPriceListPayload = {
            service: "SqlData",
            clientID,
            appId: S1_APP_ID,
            SqlName: "TO_APROVE",
        };

        const response = await callSoftOne(payload, "[basket/requested-prices:list]");
        const data = (await parseJsonWithEncodingFallback(
            response
        )) as RequestedPriceListResponse;

        if (data?.success === false) {
            return NextResponse.json(
                {
                    success: false,
                    message: data.message ?? "Upstream requested-prices request failed",
                    totalcount: 0,
                    rows: [],
                },
                { status: 502 }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("[basket/requested-prices:list] Server error", error);

        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Server error",
                totalcount: 0,
                rows: [],
            },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest) {
    try {
        if (!hasSession(req)) {
            return unauthorizedResponse();
        }

        const body = (await req.json().catch(() => ({}))) as RequestedPriceUpdateRoutePayload;
        const action =
            typeof body.action === "string" ? body.action.toUpperCase() : "";
        const basketId = normalizePositiveInteger(body.basketId);
        const paschaPrice = normalizePositiveNumber(body.paschaPrice);
        const clientID = getSoftOneClientID();

        if (!clientID) {
            return missingClientResponse();
        }

        if (!isValidUpdateAction(action) || basketId == null) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid update payload",
                },
                { status: 400 }
            );
        }

        if (action === "APPROVE_WITH_PRICE" && paschaPrice == null) {
            return NextResponse.json(
                {
                    success: false,
                    message: "PASCHA_PRICE is required",
                },
                { status: 400 }
            );
        }

        const payload: RequestedPriceApprovePayload | RequestedPriceApproveWithPricePayload =
            action === "APPROVE"
                ? {
                    service: "SqlData",
                    clientID,
                    appId: S1_APP_ID,
                    SqlName: "APPROVAL",
                    BASKETID: basketId,
                }
                : {
                    service: "SqlData",
                    clientID,
                    appId: S1_APP_ID,
                    SqlName: "APPROVED_W_PRICE",
                    PASCHA_PRICE: paschaPrice as number,
                    BASKETID: basketId,
                };

        const response = await callSoftOne(payload, "[basket/requested-prices:update]");
        const upstreamData = (await parseJsonWithEncodingFallback(response)) as {
            success?: boolean;
            message?: string;
            rows?: Array<{ MESSAGE_TO_CALLER?: string }>;
        };

        if (upstreamData?.success === false) {
            return NextResponse.json(
                {
                    success: false,
                    message: upstreamData.message ?? "Upstream requested-price update failed",
                },
                { status: 502 }
            );
        }

        const data: BasketActionResponse = {
            success: true,
            message:
                upstreamData?.message ??
                upstreamData?.rows?.[0]?.MESSAGE_TO_CALLER ??
                (action === "APPROVE"
                    ? "Requested price approved"
                    : "Requested price approved with new price"),
        };

        return NextResponse.json(data);
    } catch (error) {
        console.error("[basket/requested-prices:update] Server error", error);

        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Server error",
            },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    try {
        if (!hasSession(req)) {
            return unauthorizedResponse();
        }

        const body = (await req.json().catch(() => ({}))) as BasketMassDeleteRoutePayload;
        const clientID = getSoftOneClientID();

        if (!clientID) {
            return missingClientResponse();
        }

        const basketIds = Array.isArray(body.basketIds)
            ? body.basketIds
                .map((id) => String(id).trim())
                .filter(Boolean)
            : [];

        if (basketIds.length === 0) {
            return NextResponse.json(
                { success: false, message: "No BASKET IDs provided" },
                { status: 400 }
            );
        }

        const result = await callMassDelete({
            clientID,
            basketIds,
            tableAction: body.tableAction?.trim() || DEFAULT_DELETE_TABLE_ACTION,
            method: body.method?.trim() || DEFAULT_DELETE_METHOD,
            s1Key: String(body.s1Key ?? DEFAULT_DELETE_S1_KEY).trim() || DEFAULT_DELETE_S1_KEY,
            appUserId: body.appUserId?.trim() || DEFAULT_DELETE_APPUSER_ID,
            logLabel: "[basket/requested-prices:delete]",
        });

        const responseData: BasketActionResponse = {
            success: true,
            message: result.message ?? "The requested price row was deleted",
        };

        return NextResponse.json(responseData);
    } catch (error) {
        if (error instanceof MassDeleteError) {
            return NextResponse.json(
                { success: false, message: error.message },
                { status: error.status }
            );
        }

        console.error("[basket/requested-prices:delete] Server error", error);

        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}
