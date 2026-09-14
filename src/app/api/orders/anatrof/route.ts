import { NextRequest } from "next/server";
import { handleOrderSubmit } from "../order-route";
import { ANATROF_LOG_LABEL } from "@/lib/orders/anatrof/anatrof-constants";
import {
    submitAnatrofOrder,
    type AnatrofOrderRequestBody,
} from "@/lib/orders/anatrof/submit-anatrof-order";

export async function POST(req: NextRequest) {
    return handleOrderSubmit<AnatrofOrderRequestBody>({
        req,
        logLabel: ANATROF_LOG_LABEL,
        successMessage: 'Η ανατροφοδοσία υποβλήθηκε επιτυχώς.',
        submit: submitAnatrofOrder,
    });
}
