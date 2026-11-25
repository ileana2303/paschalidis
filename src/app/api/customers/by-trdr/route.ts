import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { findCustomerByTrdr, normalizeCustomerLookupText } from "@/lib/customers/find-customer-by-trdr";
import { getSoftOneClientID } from "@/lib/softone";
import type { CustomerByTrdrResponse } from "@/lib/interface";

export async function POST(req: NextRequest) {
    try {
        const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;

        if (!sessionCookie?.trim()) {
            return NextResponse.json(
                { success: false, message: 'Απαιτείται σύνδεση.', customer: null },
                { status: 401 }
            );
        }

        const body = (await req.json().catch(() => ({}))) as {
            trdr?: unknown;
            name?: unknown;
        };
        const trdr = normalizeCustomerLookupText(body.trdr, 50);

        if (!trdr) {
            return NextResponse.json(
                { success: false, message: 'Απαιτείται το αναγνωριστικό πελάτη (TRDR).', customer: null },
                { status: 400 }
            );
        }

        const clientID = getSoftOneClientID();

        if (!clientID) {
            console.error("[customers/by-trdr] Missing S1_CLIENT_ID");

            return NextResponse.json(
                { success: false, message: 'Δεν έχει ρυθμιστεί ο πελάτης SoftOne.', customer: null },
                { status: 500 }
            );
        }

        const customer = await findCustomerByTrdr(clientID, trdr, body.name);

        if (!customer) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Δεν βρέθηκαν τα στοιχεία του πελάτη TRDR ${trdr}.`,
                    customer: null,
                },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, customer } satisfies CustomerByTrdrResponse);
    } catch (error) {
        console.error("[customers/by-trdr] Server error", error);

        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : 'Σφάλμα διακομιστή.',
                customer: null,
            },
            { status: 500 }
        );
    }
}
