import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
    getSoftOneClientID,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";
import type {
    EndoBasketActionResponse,
    EndoListEsoPayload,
    EndoListExoPayload,
    EndoListUpdateQtyPayload,
    EndoListUpdateQtyRoutePayload,
    EndoListRoutePayload,
    EndoListSection,
    EndoListsResponse,
    IEndoListRow,
} from "@/lib/interface";

const ZERO_GUID = "00000000-0000-0000-0000-000000000000";

type SectionFetchResult = {
    section: EndoListSection;
    error: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeRow(row: Record<string, unknown>): IEndoListRow {
    const normalized: IEndoListRow = {};

    Object.entries(row).forEach(([key, value]) => {
        if (value === null || value === undefined) {
            normalized[key] = "";
            return;
        }

        normalized[key] = String(value);
    });

    return normalized;
}

async function callSoftOne(payload: unknown, label: string) {
    const response = await postSoftOne(payload);

    if (!response.ok) {
        const errorText = await response.text();
        const compactError = errorText.replace(/\s+/g, " ").trim().slice(0, 400);

        console.error(`${label} Upstream error body:`, errorText);

        return {
            ok: false as const,
            status: response.status,
            error: `${label} failed (${response.status})${compactError ? `: ${compactError}` : ""}`,
        };
    }

    return {
        ok: true as const,
        response,
    };
}

async function fetchSection(
    payload: EndoListEsoPayload | EndoListExoPayload,
    label: string
): Promise<SectionFetchResult> {
    try {
        const upstreamResponse = await callSoftOne(payload, label);

        if (!upstreamResponse.ok) {
            return {
                section: {
                    totalcount: 0,
                    rows: [],
                },
                error: upstreamResponse.error,
            };
        }

        const upstream = await parseJsonWithEncodingFallback(upstreamResponse.response) as {
            success?: boolean;
            message?: string;
            totalcount?: number;
            rows?: unknown[];
        };

        if (upstream?.success === false) {
            return {
                section: {
                    totalcount: 0,
                    rows: [],
                },
                error: `${label} failed: ${upstream.message ?? "application error"}`,
            };
        }

        const rows = Array.isArray(upstream?.rows)
            ? upstream.rows.filter(isRecord).map((row) => normalizeRow(row))
            : [];

        return {
            section: {
                totalcount:
                    typeof upstream?.totalcount === "number"
                        ? upstream.totalcount
                        : rows.length,
                rows,
            },
            error: null,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "unexpected error";
        return {
            section: {
                totalcount: 0,
                rows: [],
            },
            error: `${label} failed: ${message}`,
        };
    }
}

export async function POST(req: NextRequest) {
    try {
        const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
        if (!sessionCookie?.trim()) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = (await req.json()) as EndoListRoutePayload;
        const normalizedBranch =
            typeof body.branch === "string" && body.branch.trim()
                ? body.branch.trim()
                : "";
        const normalizedScope =
            body.scope === "requested" || body.scope === "received"
                ? body.scope
                : "both";
        if (!normalizedBranch) {
            return NextResponse.json(
                { success: false, message: "Branch is required" },
                { status: 400 }
            );
        }

        const clientID = getSoftOneClientID(normalizedBranch);

        if (!clientID) {
            return NextResponse.json(
                { success: false, message: "S1 client is not configured" },
                { status: 500 }
            );
        }

        const requestedPayload: EndoListEsoPayload = {
            service: "SqlData",
            clientID,
            appId: "1305",
            SqlName: "ENDO_LIST_ESO",
            TO_BRANCH: normalizedBranch,
        };

        const receivedPayload: EndoListExoPayload = {
            service: "SqlData",
            clientID,
            appId: "1305",
            SqlName: "ENDO_LIST_EXO",
            BRANCH: normalizedBranch,
        };

        const requestedPromise =
            normalizedScope === "received"
                ? Promise.resolve<SectionFetchResult>({
                    section: { totalcount: 0, rows: [] },
                    error: null,
                })
                : fetchSection(requestedPayload, "[endo/lists:requested]");

        const receivedPromise =
            normalizedScope === "requested"
                ? Promise.resolve<SectionFetchResult>({
                    section: { totalcount: 0, rows: [] },
                    error: null,
                })
                : fetchSection(receivedPayload, "[endo/lists:received]");

        const [requestedResult, receivedResult] = await Promise.all([
            requestedPromise,
            receivedPromise,
        ]);

        const messages = [
            requestedResult.error,
            receivedResult.error,
        ].filter((message): message is string => Boolean(message));

        const success = messages.length < 2;

        const data: EndoListsResponse = {
            success,
            ...(messages.length > 0
                ? { message: messages.join(" | ") }
                : {}),
            requested: requestedResult.section,
            received: receivedResult.section,
        };

        return NextResponse.json(data);
    } catch (error) {
        if (error instanceof NextResponse) {
            return error;
        }

        console.error("[endo/lists] Server error", error);

        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
        if (!sessionCookie?.trim()) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = (await req.json()) as EndoListUpdateQtyRoutePayload;
        const normalizedBasketId = String(body.basketId ?? "").trim();
        const normalizedMtrl = String(body.mtrl ?? "").trim();
        const normalizedToBranch = String(body.toBranch ?? "").trim();
        const normalizedBranch = String(body.branch ?? "").trim();
        const normalizedAppUserId = String(body.appUserId ?? "").trim() || ZERO_GUID;

        const parsedQty = Number(
            String(body.qty ?? "")
                .trim()
                .replace(",", ".")
        );
        const normalizedQty =
            Number.isFinite(parsedQty) && parsedQty >= 0
                ? String(Math.floor(parsedQty))
                : "";

        if (!normalizedBasketId || !normalizedToBranch || !normalizedMtrl || !normalizedQty) {
            return NextResponse.json(
                { success: false, message: "Invalid update payload" },
                { status: 400 }
            );
        }

        const clientIdBranch = normalizedBranch || normalizedToBranch;
        const clientID = getSoftOneClientID(clientIdBranch);

        if (!clientID) {
            return NextResponse.json(
                { success: false, message: "S1 client is not configured" },
                { status: 500 }
            );
        }

        const payload: EndoListUpdateQtyPayload = {
            service: "SqlData",
            clientID,
            appId: "1305",
            SqlName: "NOW_ENDO_UPD_QTY",
            BASKETID: normalizedBasketId,
            QTY: normalizedQty,
            MTRL: normalizedMtrl,
            TO_BRANCH: normalizedToBranch,
            ACTION: "UPDATE",
            APPUSER_ID: normalizedAppUserId,
        };

        const upstreamResponse = await callSoftOne(
            payload,
            "[endo/lists:update-qty]"
        );

        if (!upstreamResponse.ok) {
            return NextResponse.json(
                { success: false, message: upstreamResponse.error },
                { status: upstreamResponse.status }
            );
        }

        const upstream = (await parseJsonWithEncodingFallback(upstreamResponse.response)) as {
            success?: boolean;
            message?: string;
            rows?: Array<{
                MESSAGE_TO_CALLER?: string;
            }>;
        };

        if (upstream?.success === false) {
            return NextResponse.json(
                {
                    success: false,
                    message: upstream.message ?? "Upstream qty update failed",
                },
                { status: 502 }
            );
        }

        const message =
            upstream?.rows?.[0]?.MESSAGE_TO_CALLER ??
            upstream?.message ??
            "Quantity updated";

        const data: EndoBasketActionResponse = {
            success: true,
            message,
        };

        return NextResponse.json(data);
    } catch (error) {
        console.error("[endo/lists:update-qty] Server error", error);

        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}
