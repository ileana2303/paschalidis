import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

type OrderSubmitResult = {
    id?: string;
    orderIds: string[];
    basketIds: string[];
};

type HandleOrderSubmitParams<TBody> = {
    req: NextRequest;
    logLabel: string;
    successMessage: string;
    submit: (body: TBody) => Promise<OrderSubmitResult>;
};

function jsonError(message: string, status: number) {
    return NextResponse.json({ success: false, message }, { status });
}

export async function handleOrderSubmit<TBody>({
    req,
    logLabel,
    successMessage,
    submit,
}: HandleOrderSubmitParams<TBody>) {
    try {
        const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;

        if (!sessionCookie?.trim()) {
            return jsonError('Απαιτείται σύνδεση.', 401);
        }

        const body = (await req.json()) as TBody;
        const result = await submit(body);

        return NextResponse.json({
            success: true,
            id: result.id,
            orderIds: result.orderIds,
            basketIds: result.basketIds,
            message: successMessage,
        });
    } catch (error) {
        console.error(`${logLabel} Server error`, error);

        const message =
            error instanceof Error
                ? error.message
                : 'Σφάλμα διακομιστή κατά την υποβολή.';

        return jsonError(message, 500);
    }
}
