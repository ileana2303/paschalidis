import { NextRequest, NextResponse } from "next/server";
import type {
    BasePricePurItemsResponse,
    IBasePricePurItemRow,
} from "@/lib/base-price-pur/types";
import {
    getSoftOneClientID,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";
import {
    getUpstreamMessage,
    hasSession,
    isRecord,
    missingClientResponse,
    normalizePositiveFindoc,
    normalizeRow,
    S1_APP_ID,
    unauthorizedResponse,
} from "../_lib/shared";

export async function POST(req: NextRequest) {
    try {
        if (!hasSession(req)) return unauthorizedResponse();

        const body = (await req.json().catch(() => ({}))) as { findoc?: unknown };
        const findoc = normalizePositiveFindoc(body.findoc);

        if (!findoc) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Απαιτείται έγκυρο FINDOC.",
                    totalcount: 0,
                    rows: [],
                },
                { status: 400 }
            );
        }

        const clientID = getSoftOneClientID();
        if (!clientID) return missingClientResponse();

        const payload = {
            service: "SqlData" as const,
            clientID,
            appId: S1_APP_ID,
            SqlName: "BASE_PRICE_ITEM_LIST_FINDOC" as const,
            FINDOC: findoc,
        };

        const upstreamResponse = await postSoftOne(payload);

        if (!upstreamResponse.ok) {
            const errorText = await upstreamResponse.text();
            console.error("[base-price-pur:items] Upstream error body:", errorText);

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

        const upstreamData = (await parseJsonWithEncodingFallback(
            upstreamResponse
        )) as {
            success?: boolean;
            message?: string;
            totalcount?: number;
            rows?: unknown[];
        };

        if (upstreamData?.success === false) {
            return NextResponse.json(
                {
                    success: false,
                    message: getUpstreamMessage(
                        upstreamData,
                        "Αποτυχία φόρτωσης γραμμών παραστατικού."
                    ),
                    totalcount: 0,
                    rows: [],
                },
                { status: 502 }
            );
        }

        const rows = Array.isArray(upstreamData?.rows)
            ? upstreamData.rows
                  .filter(isRecord)
                  .map((row) => normalizeRow<IBasePricePurItemRow>(row))
            : [];

        const response: BasePricePurItemsResponse = {
            success: true,
            message: upstreamData?.message,
            totalcount:
                typeof upstreamData?.totalcount === "number"
                    ? upstreamData.totalcount
                    : rows.length,
            rows,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("[base-price-pur:items] Server error", error);

        return NextResponse.json(
            {
                success: false,
                message:
                    error instanceof Error ? error.message : "Σφάλμα διακομιστή.",
                totalcount: 0,
                rows: [],
            },
            { status: 500 }
        );
    }
}
