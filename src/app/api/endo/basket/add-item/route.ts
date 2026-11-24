import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { getSoftOneClientID } from "@/lib/softone";
import { insertEndoBasketRow } from "@/lib/orders/endo/insert-endo-basket-row";
import type {
    EndoBasketActionResponse,
    EndoBasketAddRoutePayload,
} from "@/lib/interface";

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
        const normalizedAppUserId = String(body.APPUSER_ID ?? "").trim();
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

        const inserted = await insertEndoBasketRow({
            clientID,
            mtrl: normalizedMtrl,
            qty: normalizedQty,
            supplyingBranch: normalizedBranch,
            requestingBranch: normalizedToBranch,
            appUserId: normalizedAppUserId,
            logLabel: "[endo/basket/add-item]",
        });

        if (!inserted.ok) {
            return NextResponse.json(
                { success: false, message: inserted.message },
                { status: inserted.status }
            );
        }

        const data: EndoBasketActionResponse = {
            success: true,
            message: inserted.message,
            basketId: inserted.basketId || undefined,
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
