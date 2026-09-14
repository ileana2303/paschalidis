import { NextRequest } from "next/server";
import { handleOrderSubmit } from "../order-route";
import { ENDO_LOG_LABEL } from "@/lib/orders/endo/endo-constants";
import {
    submitEndoOrder,
    type EndoOrderRequestBody,
} from "@/lib/orders/endo/submit-endo-order";

export async function POST(req: NextRequest) {
    return handleOrderSubmit<EndoOrderRequestBody>({
        req,
        logLabel: ENDO_LOG_LABEL,
        successMessage: 'Η ενδοκίνηση υποβλήθηκε επιτυχώς.',
        submit: submitEndoOrder,
    });
}
