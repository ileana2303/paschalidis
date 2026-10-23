import { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/session-token";
import { handleOrderSubmit } from "../order-route";
import { SUPPLIER_BASKET_LOG_LABEL } from "@/lib/orders/supplier-basket/supplier-basket-constants";
import {
    submitSupplierBasketOrder,
    type SupplierBasketOrderRequestBody,
} from "@/lib/orders/supplier-basket/submit-supplier-basket-order";

export async function POST(req: NextRequest) {
    return handleOrderSubmit<SupplierBasketOrderRequestBody>({
        req,
        logLabel: SUPPLIER_BASKET_LOG_LABEL,
        successMessage: "Η παραγγελία προμηθευτή υποβλήθηκε επιτυχώς.",
        submit: async (body) => {
            const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
            const session = sessionCookie
                ? await verifySessionToken(sessionCookie)
                : null;

            return submitSupplierBasketOrder({
                ...body,
                appUserId: session?.username ?? body.appUserId,
            });
        },
    });
}
