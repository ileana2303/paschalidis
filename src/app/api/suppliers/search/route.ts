import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import type {
    SupplierSearchResponse,
    SuppliersSqlPayload,
} from "@/lib/interface";
import {
    getSoftOneClientID,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";

function hasSession(req: NextRequest) {
    return Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value?.trim());
}

export async function POST(req: NextRequest) {
    try {
        if (!hasSession(req)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Απαιτείται σύνδεση.",
                    totalcount: 0,
                    rows: [],
                },
                { status: 401 }
            );
        }

        const body = (await req.json().catch(() => ({}))) as {
            search?: unknown;
        };
        const search = typeof body.search === "string" ? body.search.trim() : "";

        if (!search) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Απαιτείται όρος αναζήτησης.",
                    totalcount: 0,
                    rows: [],
                },
                { status: 400 }
            );
        }

        const clientID = getSoftOneClientID();

        if (!clientID) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Δεν έχει ρυθμιστεί ο πελάτης SoftOne.",
                    totalcount: 0,
                    rows: [],
                },
                { status: 500 }
            );
        }

        const payload: SuppliersSqlPayload = {
            service: "SqlData",
            clientID,
            appId: "1305",
            SqlName: "SUPPLIERS",
            SEARCH: search,
        };

        const upstreamResponse = await postSoftOne(payload);

        if (!upstreamResponse.ok) {
            const errorText = await upstreamResponse.text();
            console.error("[suppliers/search] Upstream error body:", errorText);

            return NextResponse.json(
                {
                    success: false,
                    message: `Αποτυχία επικοινωνίας με το ERP (HTTP ${upstreamResponse.status}).`,
                    totalcount: 0,
                    rows: [],
                },
                { status: upstreamResponse.status }
            );
        }

        const data =
            await parseJsonWithEncodingFallback<SupplierSearchResponse>(
                upstreamResponse
            );

        if (data?.success === false) {
            return NextResponse.json(
                {
                    success: false,
                    message: data.message ?? "Σφάλμα εφαρμογής από το ERP.",
                    totalcount: data.totalcount ?? 0,
                    rows: data.rows ?? [],
                },
                { status: 502 }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("[suppliers/search] Server error", error);

        return NextResponse.json(
            {
                success: false,
                message: "Σφάλμα διακομιστή.",
                totalcount: 0,
                rows: [],
            },
            { status: 500 }
        );
    }
}
