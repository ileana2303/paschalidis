import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
    getSoftOneClientID,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";
import type {
    StockRequestInsertPayload,
    StockRequestInsertResponse,
    StockRequestOrigin,
    StockRequestRoutePayload,
} from "@/lib/interface";

const ZERO_GUID = "00000000-0000-0000-0000-000000000000";

function normalizeOrigin(value: unknown): StockRequestOrigin | null {
    const normalized =
        typeof value === "string" ? value.trim().toUpperCase() : "";

    if (normalized === "STORE" || normalized === "PASCHALIDIS") {
        return normalized;
    }

    return null;
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

        const { mtrl, qty, branch, origin, trdr } =
            (await req.json()) as StockRequestRoutePayload;
        const normalizedMtrl = Number(mtrl);
        const normalizedQty = Number(qty);
        const normalizedBranch =
            typeof branch === "string" && branch.trim() ? branch.trim() : "";
        const normalizedOrigin = normalizeOrigin(origin);
        const normalizedTrdr = String(trdr ?? "").trim();
        const clientID = getSoftOneClientID();

        if (!Number.isFinite(normalizedMtrl) || normalizedMtrl <= 0) {
            return NextResponse.json(
                { success: false, message: 'Απαιτείται κωδικός προϊόντος (MTRL).' },
                { status: 400 }
            );
        }

        if (!Number.isInteger(normalizedQty) || normalizedQty <= 0) {
            return NextResponse.json(
                { success: false, message: 'Η ποσότητα πρέπει να είναι θετικός ακέραιος αριθμός.' },
                { status: 400 }
            );
        }

        if (!normalizedBranch) {
            return NextResponse.json(
                { success: false, message: 'Απαιτείται υποκατάστημα.' },
                { status: 400 }
            );
        }

        if (!normalizedOrigin) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Η προέλευση πρέπει να είναι STORE ή PASCHALIDIS.',
                },
                { status: 400 }
            );
        }

        if (!clientID) {
            return NextResponse.json(
                { success: false, message: 'Δεν έχει ρυθμιστεί ο πελάτης SoftOne.' },
                { status: 500 }
            );
        }

        const upstreamPayload: StockRequestInsertPayload = {
            service: "SqlData",
            clientID,
            appId: "1305",
            SqlName: "ANTROF_INSERT",
            MTRL: String(normalizedMtrl),
            BRANCH: normalizedBranch,
            QTY_REQUESTED: normalizedQty,
            APPORIGIN: normalizedOrigin,
            APPUSER_ID: ZERO_GUID,
            ...(normalizedTrdr ? { TRDR: normalizedTrdr } : {}),
        };

        const response = await postSoftOne(upstreamPayload);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[items/request-stock] Upstream error body:", errorText);

            return NextResponse.json(
                { success: false, message: 'Αποτυχία επικοινωνίας με το ERP.' },
                { status: response.status }
            );
        }

        const data =
            (await parseJsonWithEncodingFallback(response)) as StockRequestInsertResponse;

        if (!data?.success) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Το αίτημα αποθέματος απορρίφθηκε από το σύστημα.',
                },
                { status: 502 }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("[items/request-stock] Server error", error);

        return NextResponse.json(
            { success: false, message: 'Σφάλμα διακομιστή.' },
            { status: 500 }
        );
    }
}
