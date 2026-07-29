import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
    getSoftOneSetDataClientID,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";

type SetSimilarRequest = {
    mtrl?: unknown;
    code?: unknown;
    name?: unknown;
    code1?: unknown;
    code2?: unknown;
    apvCode?: unknown;
};

function asRequiredString(value: unknown): string {
    return typeof value === "string" || typeof value === "number"
        ? String(value).trim()
        : "";
}

export async function POST(req: NextRequest) {
    try {
        const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;

        if (!sessionCookie?.trim()) {
            return NextResponse.json(
                { success: false, message: "Απαιτείται σύνδεση." },
                { status: 401 }
            );
        }

        const body = (await req.json()) as SetSimilarRequest;
        const mtrl = asRequiredString(body.mtrl);
        const code = asRequiredString(body.code);
        const name = asRequiredString(body.name);
        const code1 = asRequiredString(body.code1);
        const code2 = asRequiredString(body.code2);
        const apvCode = asRequiredString(body.apvCode);
        const clientID = getSoftOneSetDataClientID();

        if (!mtrl || !code || !name || !code1) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Λείπουν τα απαραίτητα στοιχεία προϊόντος (MTRL, CODE, NAME ή CODE1).",
                },
                { status: 400 }
            );
        }

        if (!clientID) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Δεν έχει ρυθμιστεί ο πελάτης setData του SoftOne.",
                },
                { status: 500 }
            );
        }

        const response = await postSoftOne({
            service: "setData",
            clientID,
            appId: "1305",
            OBJECT: "ITEM",
            KEY: mtrl,
            data: {
                ITEM: [
                    {
                        CODE: code,
                        NAME: name,
                        CODE1: code1,
                        CODE2: code2,
                        APVCODE: apvCode,
                    },
                ],
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[items/set-similar] Upstream error body:", errorText);

            return NextResponse.json(
                { success: false, message: "Αποτυχία επικοινωνίας με το ERP." },
                { status: response.status }
            );
        }

        const data = await parseJsonWithEncodingFallback<{
            success?: boolean;
            message?: string;
            id?: string | number;
        }>(response);

        if (data?.success === false) {
            return NextResponse.json(
                {
                    ...data,
                    message:
                        data.message ||
                        "Το SoftOne απέρριψε την ενημέρωση του προϊόντος.",
                },
                { status: 502 }
            );
        }

        return NextResponse.json({
            ...data,
            success: true,
            message: "Ο κωδικός ομοιότητας ενημερώθηκε επιτυχώς.",
        });
    } catch (error) {
        console.error("[items/set-similar] Server error", error);

        return NextResponse.json(
            { success: false, message: "Σφάλμα διακομιστή." },
            { status: 500 }
        );
    }
}
