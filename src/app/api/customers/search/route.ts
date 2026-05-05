import { NextRequest, NextResponse } from "next/server";
import {
    getSoftOneClientID,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";

export async function POST(req: NextRequest) {
    try {
        const { search } = await req.json();
        const normalizedSearch = typeof search === "string" ? search.trim() : "";
        const clientID = getSoftOneClientID();

        if (!normalizedSearch) {
            return NextResponse.json(
                { success: false, message: "Search term is required", totalcount: 0, rows: [] },
                { status: 400 }
            );
        }

        if (!clientID) {
            console.error("[customers/search] Missing S1_CLIENT_ID");

            return NextResponse.json(
                { success: false, message: "S1 client is not configured", totalcount: 0, rows: [] },
                { status: 500 }
            );
        }

        const response = await postSoftOne({
            service: "SqlData",
            clientID,
            appId: "1305",
            SqlName: "BCUSTOMERS",
            SEA: normalizedSearch,
        });

        if (!response.ok) {
            return NextResponse.json(
                { success: false, message: "Upstream request failed" },
                { status: response.status }
            );
        }

        const data = await parseJsonWithEncodingFallback(response);

        if (
            typeof data === "object" &&
            data !== null &&
            "success" in data &&
            data.success === false
        ) {
            console.error("[customers/search] Upstream returned an application error", {
                message: "message" in data ? data.message : undefined,
            });

            return NextResponse.json(data, { status: 502 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("[customers/search] Server error", error);

        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}
