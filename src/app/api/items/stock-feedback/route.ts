import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
    getSoftOneClientID,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";
import type {
    StockFeedbackPayload,
    StockFeedbackResponse,
    StockFeedbackRoutePayload,
} from "@/lib/interface";

function hasSession(req: NextRequest) {
    return Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value?.trim());
}

function normalizeDays(value: unknown) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 5) {
        return null;
    }

    return parsed;
}

export async function POST(req: NextRequest) {
    try {
        if (!hasSession(req)) {
            return NextResponse.json(
                { success: false, message: "Unauthorized", totalcount: 0, rows: [] },
                { status: 401 }
            );
        }

        const body = (await req.json().catch(() => ({}))) as StockFeedbackRoutePayload;
        const branch = typeof body.branch === "string" ? body.branch.trim() : "";
        const days = normalizeDays(body.days);

        if (!branch) {
            return NextResponse.json(
                { success: false, message: "Branch is required", totalcount: 0, rows: [] },
                { status: 400 }
            );
        }

        if (days == null) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Days must be an integer between 0 and 5",
                    totalcount: 0,
                    rows: [],
                },
                { status: 400 }
            );
        }

        const clientID = getSoftOneClientID(branch);

        if (!clientID) {
            return NextResponse.json(
                { success: false, message: "S1 client is not configured", totalcount: 0, rows: [] },
                { status: 500 }
            );
        }

        const payload: StockFeedbackPayload = {
            service: "SqlData",
            clientID,
            appId: "1305",
            SqlName: "SALES_PER_BRANCH",
            BRANCH: branch,
            DAYS: days,
        };

        const response = await postSoftOne(payload);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[items/stock-feedback] Upstream error body:", errorText);

            return NextResponse.json(
                {
                    success: false,
                    message: `Upstream request failed with status ${response.status}`,
                    totalcount: 0,
                    rows: [],
                },
                { status: response.status }
            );
        }

        const data = (await parseJsonWithEncodingFallback(
            response
        )) as StockFeedbackResponse;

        if (!data?.success) {
            return NextResponse.json(
                {
                    success: false,
                    message: data?.message ?? "Upstream returned an application error",
                    totalcount: data?.totalcount ?? 0,
                    rows: data?.rows ?? [],
                },
                { status: 502 }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("[items/stock-feedback] Server error", error);

        return NextResponse.json(
            { success: false, message: "Server error", totalcount: 0, rows: [] },
            { status: 500 }
        );
    }
}
