import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
    getSoftOneClientID,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";
import type {
    StockRequestInsertPayload,
    StockRequestInsertResponse,
    StockRequestRoutePayload,
} from "@/lib/interface";

const ZERO_GUID = "00000000-0000-0000-0000-000000000000";

export async function POST(req: NextRequest) {
    try {
        const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
        if (!sessionCookie?.trim()) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const { mtrl, qty, branch } =
            (await req.json()) as StockRequestRoutePayload;
        const normalizedMtrl = Number(mtrl);
        const normalizedQty = Number(qty);
        const normalizedBranch =
            typeof branch === "string" && branch.trim() ? branch.trim() : "";
        const clientID = getSoftOneClientID();

        if (!Number.isFinite(normalizedMtrl) || normalizedMtrl <= 0) {
            return NextResponse.json(
                { success: false, message: "MTRL is required" },
                { status: 400 }
            );
        }

        if (!Number.isInteger(normalizedQty) || normalizedQty <= 0) {
            return NextResponse.json(
                { success: false, message: "Quantity must be a positive integer" },
                { status: 400 }
            );
        }

        if (!normalizedBranch) {
            return NextResponse.json(
                { success: false, message: "Branch is required" },
                { status: 400 }
            );
        }

        if (!clientID) {
            return NextResponse.json(
                { success: false, message: "S1 client is not configured" },
                { status: 500 }
            );
        }

        const upstreamPayload: StockRequestInsertPayload = {
            service: "SqlData",
            clientID,
            appId: "1305",
            SqlName: "ANTROF_INSERT",
            MTRL: String(normalizedMtrl),
            BRANCH: normalizedBranch,
            QTY_REQUESTED: normalizedQty,
            APPUSER_ID: ZERO_GUID,
        };

        const response = await postSoftOne(upstreamPayload);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[items/request-stock] Upstream error body:", errorText);

            return NextResponse.json(
                { success: false, message: "Upstream request failed" },
                { status: response.status }
            );
        }

        const data =
            (await parseJsonWithEncodingFallback(response)) as StockRequestInsertResponse;

        if (!data?.success) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Stock request was rejected by upstream service",
                },
                { status: 502 }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("[items/request-stock] Server error", error);

        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}
