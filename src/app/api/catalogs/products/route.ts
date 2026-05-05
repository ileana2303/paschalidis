import { NextRequest, NextResponse } from "next/server";
import {
    getSoftOneClientID,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";

const PRODUCTS_ENDPOINT =
    "https://dev-fordps.oncloud.gr/s1services/js/kkandral.api/getProducts";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const page = typeof body.page === "number" && body.page >= 1 ? body.page : 1;
        const pageSize =
            typeof body.pageSize === "number" && body.pageSize >= 1 && body.pageSize <= 500
                ? body.pageSize
                : 100;

        const clientID = getSoftOneClientID();

        if (!clientID) {
            console.error("[catalogs/products] Missing S1_CLIENT_ID");

            return NextResponse.json(
                { success: false, message: "S1 client is not configured" },
                { status: 500 }
            );
        }

        const response = await postSoftOne(
            { clientID, page, pageSize },
            {
                endpointEnvKey: "S1_PRODUCTS_ENDPOINT",
                defaultEndpoint: PRODUCTS_ENDPOINT,
                fallbackToGenericEndpoint: false,
            }
        );

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
            console.error("[catalogs/products] Upstream error", {
                message: "message" in data ? data.message : undefined,
            });

            return NextResponse.json(data, { status: 502 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("[catalogs/products] Server error", error);

        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}
