import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import type {
    StockRequestListPayload,
    StockRequestListRoutePayload,
    StockRequestListResponse,
    StockRequestMassDeletePayload,
    StockRequestMassDeleteResponse,
    StockRequestMassDeleteRoutePayload,
    StockRequestUpdateAction,
    StockRequestUpdatePayload,
    StockRequestUpdateResponse,
    StockRequestUpdateRoutePayload,
} from "@/lib/interface";

const S1_ENDPOINT = "https://fordps.oncloud.gr/s1services";
const GREEK_FALLBACK_ENCODINGS = ["windows-1253", "iso-8859-7"] as const;
const S1_APP_ID = "1305";
const APPROVAL_APPUSER_ID = "00000001-0001-0001-0001-000000000001";

function getClientID() {
    return process.env.S1_CLIENT_ID?.trim().replace(/^['"]|['"]$/g, "");
}

function getCharset(contentType: string | null) {
    if (!contentType) {
        return null;
    }

    const match = contentType.match(/charset=([^;]+)/i);

    return match?.[1]?.trim().toLowerCase() ?? null;
}

async function parseJsonWithEncodingFallback(response: Response) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    const candidateEncodings = new Set<string>();
    const declaredCharset = getCharset(response.headers.get("content-type"));

    if (declaredCharset) {
        candidateEncodings.add(declaredCharset);
    }

    candidateEncodings.add("utf-8");

    for (const encoding of GREEK_FALLBACK_ENCODINGS) {
        candidateEncodings.add(encoding);
    }

    let lastError: Error | null = null;

    for (const encoding of candidateEncodings) {
        try {
            const text = new TextDecoder(encoding).decode(bytes);

            if (encoding === "utf-8" && text.includes("\uFFFD")) {
                continue;
            }

            return JSON.parse(text);
        } catch (error) {
            lastError =
                error instanceof Error
                    ? error
                    : new Error("Failed to decode upstream response");
        }
    }

    throw lastError ?? new Error("Failed to decode upstream response");
}

async function callSoftOne(payload: unknown, logLabel: string) {
    const response = await fetch(S1_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();

        console.error(`${logLabel} Upstream error body:`, errorText);

        throw new Error(`Upstream request failed with status ${response.status}`);
    }

    return response;
}

function isValidUpdateAction(value: string): value is StockRequestUpdateAction {
    return value === "APPROVE" || value === "DELETE" || value === "UPDATE";
}

function normalizePositiveInteger(value: unknown) {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

function normalizePositiveIntegerString(value: unknown) {
    const parsed = normalizePositiveInteger(value);

    return parsed == null ? null : String(parsed);
}

function unauthorizedResponse() {
    return NextResponse.json(
        {
            success: false,
            message: "Unauthorized",
        },
        { status: 401 }
    );
}

function missingClientResponse() {
    return NextResponse.json(
        {
            success: false,
            message: "S1 client is not configured",
        },
        { status: 500 }
    );
}

function hasSession(req: NextRequest) {
    return Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value?.trim());
}

export async function POST(req: NextRequest) {
    try {
        if (!hasSession(req)) {
            return unauthorizedResponse();
        }

        const body = (await req.json().catch(() => ({}))) as StockRequestListRoutePayload;
        const branch = typeof body.branch === "string" ? body.branch.trim() : "";
        const clientID = getClientID();

        if (!branch) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Branch is required",
                },
                { status: 400 }
            );
        }

        if (!clientID) {
            return missingClientResponse();
        }

        const payload: StockRequestListPayload = {
            service: "SqlData",
            clientID,
            appId: S1_APP_ID,
            SqlName: "ANTROF_LIST",
            BRANCH: branch,
        };

        const response = await callSoftOne(payload, "[items/stock-requests:list]");
        const data = (await parseJsonWithEncodingFallback(
            response
        )) as StockRequestListResponse;

        return NextResponse.json(data);
    } catch (error) {
        console.error("[items/stock-requests:list] Server error", error);

        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Server error",
            },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest) {
    try {
        if (!hasSession(req)) {
            return unauthorizedResponse();
        }

        const body = (await req.json().catch(() => ({}))) as StockRequestUpdateRoutePayload;

        const action =
            typeof body.action === "string" ? body.action.toUpperCase() : "";

        const basketId = normalizePositiveInteger(body.basketId);
        const mtrl = typeof body.mtrl === "string" ? body.mtrl.trim() : "";
        const qty =
            action === "DELETE"
                ? String(body.qty || "1")
                : normalizePositiveIntegerString(body.qty);

        const clientID = getClientID();

        if (!clientID) {
            return missingClientResponse();
        }

        if (!isValidUpdateAction(action) || basketId == null || !mtrl) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid update payload",
                },
                { status: 400 }
            );
        }

        if ((action === "UPDATE" || action === "APPROVE") && !qty) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid quantity",
                },
                { status: 400 }
            );
        }

        const payload: StockRequestUpdatePayload = {
            service: "SqlData",
            clientID,
            appId: S1_APP_ID,
            SqlName: "ANATROF_UPDATE",
            ACTION: action,
            BASKETID: basketId,
            MTRL: mtrl,
            QTY_REQ: String(qty),
            APPUSER_ID: APPROVAL_APPUSER_ID,
        };

        const response = await callSoftOne(payload, "[items/stock-requests:update]");
        const data = (await parseJsonWithEncodingFallback(
            response
        )) as StockRequestUpdateResponse;

        return NextResponse.json(data);
    } catch (error) {
        console.error("[items/stock-requests:update] Server error", error);

        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Server error",
            },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    try {
        if (!hasSession(req)) {
            return unauthorizedResponse();
        }

        const body = (await req.json().catch(() => ({}))) as StockRequestMassDeleteRoutePayload;
        const clientID = getClientID();

        if (!clientID) {
            return missingClientResponse();
        }

        const basketIds = Array.isArray(body.basketIds)
            ? body.basketIds
                .map((id) => normalizePositiveInteger(id))
                .filter((id): id is number => id != null)
            : [];

        if (basketIds.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "No BASKET IDs provided",
                },
                { status: 400 }
            );
        }

        const payload: StockRequestMassDeletePayload = {
            service: "SqlData",
            clientID,
            appId: S1_APP_ID,
            SqlName: "ANTROF_MASS_DELETE",
            BASKET_IDS: basketIds.join(","),
            APPUSER_ID: APPROVAL_APPUSER_ID,
        };

        const response = await callSoftOne(payload, "[items/stock-requests:delete]");
        const data = (await parseJsonWithEncodingFallback(
            response
        )) as StockRequestMassDeleteResponse;

        return NextResponse.json(data);
    } catch (error) {
        console.error("[items/stock-requests:delete] Server error", error);

        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Server error",
            },
            { status: 500 }
        );
    }
}