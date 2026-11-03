import { NextRequest, NextResponse } from "next/server";
import {
    getSoftOneClientID,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";

const sanitizeSearch = (value: unknown): string => {
    if (typeof value !== "string") return "";
    return value
        .normalize("NFC")
        .replace(/[^0-9A-Za-zͰ-Ͽἀ-῿ \-./]/g, "")
        .trim()
        .slice(0, 50);
};

export async function POST(req: NextRequest) {
    try {
        const { search, trdr } = await req.json();
        const normalizedSearch = sanitizeSearch(search);
        const parsed = trdr != null ? Number(trdr) : NaN;
        const normalizedTrdr = Number.isFinite(parsed) && parsed > 0
            ? parsed
            : undefined;
        const clientID = getSoftOneClientID();

        if (!normalizedSearch) {
            return NextResponse.json(
                { success: false, message: 'Απαιτείται όρος αναζήτησης.', totalcount: 0, rows: [] },
                { status: 400 }
            );
        }

        if (!clientID) {
            console.error("[items/search] Missing S1_CLIENT_ID");

            return NextResponse.json(
                { success: false, message: 'Δεν έχει ρυθμιστεί ο πελάτης SoftOne.', totalcount: 0, rows: [] },
                { status: 500 }
            );
        }

        const hasCustomer = normalizedTrdr !== undefined;

        const requestBody = hasCustomer
            ? {
                service: "SqlData",
                clientID,
                appId: "1305",
                SqlName: "SEARCH_PARTS_PER_TRDR",
                part: normalizedSearch,
                TRDR: normalizedTrdr,
            }
            : {
                service: "SqlData",
                clientID,
                appId: "1305",
                SqlName: "ITEM_SEARCH",
                part: normalizedSearch,
            };

        console.log("[items/search] Request body:", JSON.stringify(requestBody));

        const response = await postSoftOne(requestBody);

        console.log("[items/search] Upstream status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[items/search] Upstream error body:", errorText);
            return NextResponse.json(
                { success: false, message: 'Αποτυχία επικοινωνίας με το ERP.' },
                { status: response.status }
            );
        }

        const data = await parseJsonWithEncodingFallback(response);

        console.log("[items/search] Upstream response:", JSON.stringify(data));

        if (
            typeof data === "object" &&
            data !== null &&
            "success" in data &&
            data.success === false
        ) {
            console.error("[items/search] Upstream returned an application error", {
                message: "message" in data ? data.message : undefined,
            });

            return NextResponse.json(data, { status: 502 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("[items/search] Server error", error);

        return NextResponse.json(
            { success: false, message: 'Σφάλμα διακομιστή.' },
            { status: 500 }
        );
    }
}
