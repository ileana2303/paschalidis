import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { submitOrderSummary } from "@/lib/orders/submit-order-summary";
import type { OrderSubmitRequestBody } from "@/lib/orders/order-submit-types";

function jsonError(message: string, status = 500) {
    return NextResponse.json(
        {
            success: false,
            message,
        },
        { status }
    );
}

export async function POST(req: NextRequest) {
    try {
        const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;

        if (!sessionCookie?.trim()) {
            return jsonError('Απαιτείται σύνδεση.', 401);
        }

        const body = (await req.json()) as OrderSubmitRequestBody;
        const result = await submitOrderSummary(body);

        return NextResponse.json({
            success: true,
            id: result.id,
            orderIds: result.orderIds,
            basketIds: result.basketIds,
            message: 'Η παραγγελία υποβλήθηκε επιτυχώς.',
        });
    } catch (error) {
        console.error("[orders/submit] Server error", error);

        const message =
            error instanceof Error ? error.message : 'Σφάλμα διακομιστή κατά την υποβολή.';

        return jsonError(message, 500);
    }
}
