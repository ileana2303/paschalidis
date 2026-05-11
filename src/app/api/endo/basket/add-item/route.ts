import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
    getSoftOneClientID,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";
import type {
    EndoBasketActionResponse,
    EndoBasketAddPayload,
    EndoBasketAddRoutePayload,
} from "@/lib/interface";

const ZERO_GUID = "00000000-0000-0000-0000-000000000000";

function extractBasketId(message: string) {
    const match = message.match(/ID\s*:\s*(\d+)/i);
    return match?.[1] ?? "";
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

        const body = await req.json() as EndoBasketAddRoutePayload;
        const normalizedMtrl = Number(body.MTRL);
        const normalizedQty = Number(body.QTY);
        const normalizedBranch = Number(body.BRANCH);
        const normalizedToBranch = Number(body.TO_BRANCH);
        const normalizedAppUserId = String(body.APPUSER_ID ?? "").trim() || ZERO_GUID;
        const clientID = getSoftOneClientID(normalizedBranch);

        if (!clientID) {
            return NextResponse.json(
                { success: false, message: 'Δεν έχει ρυθμιστεί ο πελάτης SoftOne.' },
                { status: 500 }
            );
        }

        if (!Number.isFinite(normalizedMtrl) || normalizedMtrl <= 0) {
            return NextResponse.json(
                { success: false, message: 'Απαιτείται κωδικός προϊόντος (MTRL).' },
                { status: 400 }
            );
        }

        if (!Number.isFinite(normalizedQty) || normalizedQty <= 0) {
            return NextResponse.json(
                { success: false, message: 'Η ποσότητα πρέπει να είναι θετικός αριθμός.' },
                { status: 400 }
            );
        }

        if (!Number.isFinite(normalizedBranch) || normalizedBranch <= 0) {
            return NextResponse.json(
                { success: false, message: 'Απαιτείται υποκατάστημα προέλευσης.' },
                { status: 400 }
            );
        }

        if (!Number.isFinite(normalizedToBranch) || normalizedToBranch <= 0) {
            return NextResponse.json(
                { success: false, message: 'Απαιτείται υποκατάστημα προορισμού.' },
                { status: 400 }
            );
        }

        if (normalizedBranch === normalizedToBranch) {
            return NextResponse.json(
                { success: false, message: 'Το υποκατάστημα προέλευσης και προορισμού πρέπει να διαφέρουν.' },
                { status: 400 }
            );
        }

        const payload: EndoBasketAddPayload = {
            service: "SqlData",
            clientID,
            appId: "1305",
            SqlName: "NOW_ENDO_INSERT",
            // NOW_ENDO_INSERT convention:
            // BRANCH = source branch (where we request stock from),
            // TO_BRANCH = destination/requester branch (logged-in branch).
            MTRL: normalizedMtrl,
            QTY: normalizedQty,
            BRANCH: normalizedBranch,
            TO_BRANCH: normalizedToBranch,
            APPUSER_ID: normalizedAppUserId,
        };

        const response = await postSoftOne(payload);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[endo/basket/add-item] Upstream error body:", errorText);

            return NextResponse.json(
                { success: false, message: 'Αποτυχία επικοινωνίας με το ERP.' },
                { status: response.status }
            );
        }

        const upstreamData = await parseJsonWithEncodingFallback(response) as {
            success?: boolean;
            message?: string;
            rows?: Array<{
                MESSAGE_TO_CALLER?: string;
                NEW_ID?: string | number;
                BASKETID?: string | number;
                ID?: string | number;
            }>;
        };

        if (upstreamData?.success === false) {
            return NextResponse.json(
                {
                    success: false,
                    message: upstreamData.message ?? 'Αποτυχία προσθήκης στη λίστα ενδοκινήσεων.',
                },
                { status: 502 }
            );
        }

        const callerMessage =
            upstreamData?.rows?.[0]?.MESSAGE_TO_CALLER ??
            upstreamData?.message ??
            'Το είδος προστέθηκε στη λίστα ενδοκινήσεων.';
        const basketId =
            String(
                upstreamData?.rows?.[0]?.NEW_ID ??
                upstreamData?.rows?.[0]?.BASKETID ??
                upstreamData?.rows?.[0]?.ID ??
                extractBasketId(callerMessage)
            ).trim();

        const data: EndoBasketActionResponse = {
            success: true,
            message: callerMessage,
            basketId: basketId || undefined,
        };

        return NextResponse.json(data);
    } catch (error) {
        console.error("[endo/basket/add-item] Server error", error);

        return NextResponse.json(
            { success: false, message: 'Σφάλμα διακομιστή.' },
            { status: 500 }
        );
    }
}
