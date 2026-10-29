import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import type {
    ItemForensicsPayload,
    ItemForensicsResponse,
    ItemForensicsRoutePayload,
} from "@/lib/interface";
import {
    getSoftOneClientID,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";

function errorResponse(message: string, status: number) {
    return NextResponse.json(
        { success: false, message, totalcount: 0, rows: [] },
        { status }
    );
}

export async function POST(req: NextRequest) {
    try {
        const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;

        if (!sessionCookie?.trim()) {
            return errorResponse("Απαιτείται σύνδεση.", 401);
        }

        const body = (await req.json().catch(() => ({}))) as Partial<ItemForensicsRoutePayload>;
        const mtrl = String(body.mtrl ?? "").trim();
        const days = Number(body.days);
        const branch = String(body.branch ?? "").trim().toUpperCase();

        if (!/^\d+$/.test(mtrl) || Number(mtrl) <= 0) {
            return errorResponse("Απαιτείται έγκυρο αναγνωριστικό είδους (MTRL).", 400);
        }

        if (!Number.isInteger(days) || days < 1 || days > 10) {
            return errorResponse("Οι ημέρες πρέπει να είναι ακέραιος από 1 έως 10.", 400);
        }

        if (branch !== "ALL" && !/^\d+$/.test(branch)) {
            return errorResponse("Απαιτείται έγκυρο υποκατάστημα.", 400);
        }

        const clientID = getSoftOneClientID(branch === "ALL" ? undefined : branch);

        if (!clientID) {
            console.error("[items/forensics] Missing S1_CLIENT_ID");
            return errorResponse("Δεν έχει ρυθμιστεί ο πελάτης SoftOne.", 500);
        }

        const payload: ItemForensicsPayload = {
            service: "SqlData",
            clientID,
            appId: "1305",
            SqlName: "SALES_PASCHA_ITEM",
            MTRL: mtrl,
            DAYS: String(days),
            BRANCH: branch,
        };
        const response = await postSoftOne(payload);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[items/forensics] Upstream error body:", errorText);
            return errorResponse(
                `Αποτυχία επικοινωνίας με το ERP (HTTP ${response.status}).`,
                response.status
            );
        }

        const data = await parseJsonWithEncodingFallback<Partial<ItemForensicsResponse> | null>(
            response
        );

        if (data?.success !== true) {
            return errorResponse(
                data?.message?.trim() || "Σφάλμα εφαρμογής από το ERP.",
                502
            );
        }

        const rows = Array.isArray(data.rows) ? data.rows : [];
        const reportedTotal = Number(data.totalcount);

        return NextResponse.json({
            success: true,
            totalcount: Number.isFinite(reportedTotal) ? reportedTotal : rows.length,
            rows,
        });
    } catch (error) {
        console.error("[items/forensics] Server error", error);
        return errorResponse("Σφάλμα διακομιστή.", 500);
    }
}
