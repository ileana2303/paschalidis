import { NextRequest } from "next/server";
import { handleOrderSubmit } from "../../order-route";
import { ENDO_PRIORITY_LOG_LABEL } from "@/lib/orders/endo/endo-constants";
import {
    submitEndoPriorityOrder,
    type EndoPriorityOrderRequestBody,
} from "@/lib/orders/endo/submit-endo-priority-order";

export async function POST(req: NextRequest) {
    return handleOrderSubmit<EndoPriorityOrderRequestBody>({
        req,
        logLabel: ENDO_PRIORITY_LOG_LABEL,
        successMessage: "Η Priority ενδοδιακίνηση δημιουργήθηκε επιτυχώς.",
        submit: submitEndoPriorityOrder,
    });
}
