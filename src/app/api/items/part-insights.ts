import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import type {
    PartInsightsResponse,
    PartInsightsRoutePayload,
    PartInsightsSoftOnePayload,
} from "@/lib/part-insights";
import {
    getSoftOneClientID,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";

type PartInsightsSqlName = PartInsightsSoftOnePayload["SqlName"];

interface PartInsightsRouteOptions {
    sqlName: PartInsightsSqlName;
    logLabel: string;
}

function errorResponse(message: string, status: number) {
    return NextResponse.json(
        { success: false, message, totalcount: 0, rows: [] },
        { status }
    );
}

export async function handlePartInsightsRequest(
    req: NextRequest,
    { sqlName, logLabel }: PartInsightsRouteOptions
) {
    try {
        const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;

        if (!sessionCookie?.trim()) {
            return errorResponse("Απαιτείται σύνδεση.", 401);
        }

        const body = (await req.json().catch(() => ({}))) as Partial<PartInsightsRoutePayload>;
        const trdr = String(body.trdr ?? "").trim();
        const mtrl = Number(body.mtrl);

        if (!trdr) {
            return errorResponse("Απαιτείται το αναγνωριστικό πελάτη (TRDR).", 400);
        }

        if (!Number.isInteger(mtrl) || mtrl <= 0) {
            return errorResponse("Απαιτείται έγκυρο αναγνωριστικό είδους (MTRL).", 400);
        }

        const clientID = getSoftOneClientID();

        if (!clientID) {
            console.error(`${logLabel} Missing S1_CLIENT_ID`);
            return errorResponse("Δεν έχει ρυθμιστεί ο πελάτης SoftOne.", 500);
        }

        const payload: PartInsightsSoftOnePayload = {
            service: "SqlData",
            clientID,
            appId: "1305",
            SqlName: sqlName,
            TRDR: trdr,
            MTRL: mtrl,
        };
        const response = await postSoftOne(payload);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`${logLabel} Upstream error body:`, errorText);
            return errorResponse(
                `Αποτυχία επικοινωνίας με το ERP (HTTP ${response.status}).`,
                response.status
            );
        }

        const data = (await parseJsonWithEncodingFallback(
            response
        )) as Partial<PartInsightsResponse<Record<string, unknown>>> | null;

        if (data?.success !== true) {
            return errorResponse(
                data?.message?.trim() || "Σφάλμα εφαρμογής από το ERP.",
                502
            );
        }

        const rows = Array.isArray(data?.rows) ? data.rows : [];
        const reportedTotal = Number(data?.totalcount);

        return NextResponse.json({
            success: true,
            totalcount: Number.isFinite(reportedTotal) ? reportedTotal : rows.length,
            rows,
        });
    } catch (error) {
        console.error(`${logLabel} Server error`, error);
        return errorResponse("Σφάλμα διακομιστή.", 500);
    }
}
