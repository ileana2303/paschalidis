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
                { success: false, message: 'Απαιτείται σύνδεση.', totalcount: 0, rows: [] },
                { status: 401 }
            );
        }

        const body = (await req.json().catch(() => ({}))) as StockFeedbackRoutePayload;
        const branch = typeof body.branch === "string" ? body.branch.trim() : "";
        const days = normalizeDays(body.days);

        if (!branch) {
            return NextResponse.json(
                { success: false, message: 'Απαιτείται υποκατάστημα.', totalcount: 0, rows: [] },
                { status: 400 }
            );
        }

        if (days == null) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Οι ημέρες πρέπει να είναι ακέραιος από 0 έως 5.',
                    totalcount: 0,
                    rows: [],
                },
                { status: 400 }
            );
        }

        const clientID = getSoftOneClientID(branch);

        if (!clientID) {
            return NextResponse.json(
                { success: false, message: 'Δεν έχει ρυθμιστεί ο πελάτης SoftOne.', totalcount: 0, rows: [] },
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
                    message: `Αποτυχία επικοινωνίας με το ERP (HTTP ${response.status}).`,
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
                    message: data?.message ?? 'Σφάλμα εφαρμογής από το ERP.',
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
            { success: false, message: 'Σφάλμα διακομιστή.', totalcount: 0, rows: [] },
            { status: 500 }
        );
    }
}
