import { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/session-token";
import { handleOrderSubmit } from "../order-route";
import { BASKET_LOG_LABEL } from "@/lib/orders/customer-basket/basket-constants";
import {
    submitBasketOrder,
    type BasketOrderRequestBody,
} from "@/lib/orders/customer-basket/submit-basket-order";

export async function POST(req: NextRequest) {
    return handleOrderSubmit<BasketOrderRequestBody>({
        req,
        logLabel: BASKET_LOG_LABEL,
        successMessage: 'Η παραγγελία υποβλήθηκε επιτυχώς.',
        submit: async (body) => {
            const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
            const session = sessionCookie
                ? await verifySessionToken(sessionCookie)
                : null;

            return submitBasketOrder({
                ...body,
                username: session?.username ?? body.username,
            });
        },
    });
}
