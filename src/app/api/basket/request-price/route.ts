import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
    getSoftOneClientID,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";
import type {
    BasketActionResponse,
    BasketRequestPricePayload,
    BasketRequestPriceRoutePayload,
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

        const body = await req.json() as BasketRequestPriceRoutePayload;
        const normalizedBasketId = Number(body.BASKETID);
        const normalizedNewPrice = Number(body.NEW_PRICE);
        const clientID = getSoftOneClientID();

        if (!clientID) {
            return NextResponse.json(
                { success: false, message: 'Δεν έχει ρυθμιστεί ο πελάτης SoftOne.' },
                { status: 500 }
            );
        }

        if (!Number.isFinite(normalizedBasketId) || normalizedBasketId <= 0) {
            return NextResponse.json(
                { success: false, message: 'Απαιτείται αναγνωριστικό καλαθιού.' },
                { status: 400 }
            );
        }

        if (!Number.isFinite(normalizedNewPrice) || normalizedNewPrice <= 0) {
            return NextResponse.json(
                { success: false, message: 'Μη έγκυρη νέα τιμή (NEW_PRICE).' },
                { status: 400 }
            );
        }

        const payload: BasketRequestPricePayload = {
            service: "SqlData",
            clientID,
            appId: "1305",
            SqlName: "BASKET_REQUESTED_PRICE",
            NEW_PRICE: normalizedNewPrice,
            BASKETID: normalizedBasketId,
        };

        const response = await postSoftOne(payload);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[basket/request-price] Upstream error body:", errorText);

            return NextResponse.json(
                { success: false, message: 'Αποτυχία επικοινωνίας με το ERP.' },
                { status: response.status }
            );
        }

        const upstreamData = await parseJsonWithEncodingFallback(response) as {
            success?: boolean;
            message?: string;
            rows?: Array<{ MESSAGE_TO_CALLER?: string }>;
        };

        if (upstreamData?.success === false) {
            return NextResponse.json(
                {
                    success: false,
                    message: upstreamData.message ?? 'Αποτυχία ενημέρωσης αίτησης τιμής.',
                },
                { status: 502 }
            );
        }

        const data: BasketActionResponse = {
            success: true,
            message:
                upstreamData?.message ??
                upstreamData?.rows?.[0]?.MESSAGE_TO_CALLER ??
                'Η αίτηση τιμής υποβλήθηκε.',
        };

        return NextResponse.json(data);
    } catch (error) {
        console.error("[basket/request-price] Server error", error);

        return NextResponse.json(
            { success: false, message: 'Σφάλμα διακομιστή.' },
            { status: 500 }
        );
    }
}
