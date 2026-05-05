import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
    getSoftOneClientID,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";
import type {
    BasketActionResponse,
    BasketInPayload,
    BasketInRoutePayload,
} from "@/lib/interface";

const DEFAULT_TRD_BRANCH = 1000;
const DEFAULT_COMPANY = 1001;
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

        const body = await req.json() as BasketInRoutePayload;
        const normalizedTrdr = Number(body.TRDR);
        const normalizedMtrl = Number(body.MTRL);
        const normalizedQty = Number(body.QTY);
        const normalizedPriceErp = Number(body.PRICE_ERP);
        const normalizedPriceReq =
            body.PRICE_REQ != null ? Number(body.PRICE_REQ) : normalizedPriceErp;
        const normalizedBranch = Number(body.BRANCH);
        const normalizedTrdBranch =
            body.TRD_BRANCH != null ? Number(body.TRD_BRANCH) : DEFAULT_TRD_BRANCH;
        const normalizedCompany =
            body.COMPANY != null ? Number(body.COMPANY) : DEFAULT_COMPANY;
        const normalizedAppUserId = String(body.APPUSER_ID ?? "").trim() || ZERO_GUID;
        const clientID = getSoftOneClientID();

        if (!clientID) {
            return NextResponse.json(
                { success: false, message: "S1 client is not configured" },
                { status: 500 }
            );
        }

        if (!Number.isFinite(normalizedTrdr) || normalizedTrdr <= 0) {
            return NextResponse.json(
                { success: false, message: "Customer TRDR is required" },
                { status: 400 }
            );
        }

        if (!Number.isFinite(normalizedMtrl) || normalizedMtrl <= 0) {
            return NextResponse.json(
                { success: false, message: "Product MTRL is required" },
                { status: 400 }
            );
        }

        if (!Number.isFinite(normalizedQty) || normalizedQty <= 0) {
            return NextResponse.json(
                { success: false, message: "Quantity must be a positive number" },
                { status: 400 }
            );
        }

        if (!Number.isFinite(normalizedPriceErp) || normalizedPriceErp < 0) {
            return NextResponse.json(
                { success: false, message: "PRICE_ERP is required" },
                { status: 400 }
            );
        }

        if (!Number.isFinite(normalizedPriceReq) || normalizedPriceReq < 0) {
            return NextResponse.json(
                { success: false, message: "PRICE_REQ is invalid" },
                { status: 400 }
            );
        }

        if (!Number.isFinite(normalizedBranch) || normalizedBranch <= 0) {
            return NextResponse.json(
                { success: false, message: "Branch is required" },
                { status: 400 }
            );
        }

        const payload: BasketInPayload = {
            service: "SqlData",
            clientID,
            appId: "1305",
            SqlName: "BASKET_IN",
            TRDR: normalizedTrdr,
            MTRL: normalizedMtrl,
            QTY: normalizedQty,
            PRICE_ERP: normalizedPriceErp,
            PRICE_REQ: normalizedPriceReq,
            BRANCH: normalizedBranch,
            TRD_BRANCH: normalizedTrdBranch,
            APPUSER_ID: normalizedAppUserId,
            COMPANY: normalizedCompany,
        };

        const response = await postSoftOne(payload);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[basket/add-item] Upstream error body:", errorText);

            return NextResponse.json(
                { success: false, message: "Upstream request failed" },
                { status: response.status }
            );
        }

        const upstreamData = await parseJsonWithEncodingFallback(response) as {
            success?: boolean;
            message?: string;
            totalcount?: number;
            rows?: Array<{ MESSAGE_TO_CALLER?: string }>;
        };

        if (upstreamData?.success === false) {
            return NextResponse.json(
                {
                    success: false,
                    message: upstreamData.message ?? "Upstream basket insert failed",
                },
                { status: 502 }
            );
        }

        const data: BasketActionResponse = {
            success: true,
            message:
                upstreamData?.message ??
                upstreamData?.rows?.[0]?.MESSAGE_TO_CALLER ??
                "Item added to basket",
        };

        return NextResponse.json(data);
    } catch (error) {
        console.error("[basket/add-item] Server error", error);

        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}
