import { NextRequest } from "next/server";
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
        submit: submitSupplierBasketOrder,
    });
}
