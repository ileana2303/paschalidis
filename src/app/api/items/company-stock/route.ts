import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
    getSoftOneClientID,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";
import type {
    CompanyStockPayload,
    CompanyStockResponse,
    CompanyStockRoutePayload,
} from "@/lib/interface";

function hasSession(req: NextRequest) {
    return Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value?.trim());
}

function normalizeDays(value: unknown) {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
        return null;
    }

    return parsed;
}

export async function POST(req: NextRequest) {
    try {
        if (!hasSession(req)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Απαιτείται σύνδεση.",
                    totalcount: 0,
                    rows: [],
                },
                { status: 401 }
            );
        }

        const body = (await req.json().catch(() => ({}))) as CompanyStockRoutePayload;
        const days = normalizeDays(body.days);

        if (days == null) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Οι ημέρες πρέπει να είναι ακέραιος από 1 έως 10.",
                    totalcount: 0,
                    rows: [],
                },
                { status: 400 }
            );
        }

        const clientID = getSoftOneClientID();

        if (!clientID) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Δεν έχει ρυθμιστεί ο πελάτης SoftOne.",
                    totalcount: 0,
                    rows: [],
                },
                { status: 500 }
            );
        }

        const payload: CompanyStockPayload = {
            service: "SqlData",
            clientID,
            appId: "1305",
            SqlName: "SALES_PASCHA",
            BRANCH: "ALL",
            DAYS: String(days),
        };

        const response = await postSoftOne(payload);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[items/company-stock] Upstream error body:", errorText);

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

        const data = await parseJsonWithEncodingFallback<CompanyStockResponse>(
            response
        );

        if (!data?.success) {
            return NextResponse.json(
                {
                    success: false,
                    message: data?.message ?? "Σφάλμα εφαρμογής από το ERP.",
                    totalcount: data?.totalcount ?? 0,
                    rows: data?.rows ?? [],
                },
                { status: 502 }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("[items/company-stock] Server error", error);

        return NextResponse.json(
            {
                success: false,
                message: "Σφάλμα διακομιστή.",
                totalcount: 0,
                rows: [],
            },
            { status: 500 }
        );
    }
}
