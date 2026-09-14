import { NextRequest } from "next/server";
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
        submit: submitBasketOrder,
    });
}
