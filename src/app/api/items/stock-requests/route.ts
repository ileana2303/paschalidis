import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import type {
    StockRequestListPayload,
    StockRequestListRoutePayload,
    StockRequestListResponse,
    StockRequestMassDeletePayload,
    StockRequestMassDeleteResponse,
    StockRequestMassDeleteRoutePayload,
    StockRequestUpdatePayload,
    StockRequestUpdateResponse,
    StockRequestUpdateRoutePayload,
} from "@/app/lib/interface";

const GREEK_FALLBACK_ENCODINGS = ["windows-1253", "iso-8859-7"] as const;
const S1_ENDPOINT = "https://fordps.oncloud.gr/s1services";
const APPROVAL_APPUSER_ID = "00000001-0001-0001-0001-000000000001";

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

function getClientID() {
    return process.env.S1_CLIENT_ID?.trim().replace(/^['"]|['"]$/g, "");
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

        return NextResponse.json(
            { success: false, message: "Upstream request failed" },
            { status: response.status }
        );
    }

    return response;
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

        const { branch } = (await req.json()) as StockRequestListRoutePayload;
        const normalizedBranch =
            typeof branch === "string" && branch.trim() ? branch.trim() : "";
        const clientID = getClientID();

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

        const payload: StockRequestListPayload = {
            service: "SqlData",
            clientID,
            appId: "1305",
            SqlName: "ANTROF_LIST",
            BRANCH: normalizedBranch,
        };

        const responseOrError = await callSoftOne(
            payload,
            "[items/stock-requests:list]"
        );

        if (responseOrError instanceof NextResponse) {
            return responseOrError;
        }

        const data =
            (await parseJsonWithEncodingFallback(
                responseOrError
            )) as StockRequestListResponse;

        return NextResponse.json(data);
    } catch (error) {
        console.error("[items/stock-requests:list] Server error", error);

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

        const { action, basketId, mtrl, qty } =
            (await req.json()) as StockRequestUpdateRoutePayload;
        const normalizedAction =
            typeof action === "string" ? action.toUpperCase() : "";
        const normalizedBasketId = Number(basketId);
        const clientID = getClientID();

        if (!clientID) {
            return NextResponse.json(
                { success: false, message: "S1 client is not configured" },
                { status: 500 }
            );
        }

        const isValidAction =
            normalizedAction === "APPROVE" ||
            normalizedAction === "DECLINE" ||
            normalizedAction === "UPDATE";

        if (!isValidAction ||
            !Number.isFinite(normalizedBasketId) ||
            normalizedBasketId <= 0 ||
            !mtrl ||
            !qty
        ) {
            return NextResponse.json(
                { success: false, message: "Invalid update payload" },
                { status: 400 }
            );
        }

        const payload: StockRequestUpdatePayload = {
            service: "SqlData",
            clientID,
            appId: "1305",
            SqlName: "ANATROF_UPDATE",
            ACTION: normalizedAction,
            BASKETID: normalizedBasketId,
            MTRL: String(mtrl),
            QTY: String(qty),
            APPUSER_ID: APPROVAL_APPUSER_ID,
        };

        const responseOrError = await callSoftOne(
            payload,
            "[items/stock-requests:update]"
        );

        if (responseOrError instanceof NextResponse) {
            return responseOrError;
        }

        const data =
            (await parseJsonWithEncodingFallback(
                responseOrError
            )) as StockRequestUpdateResponse;

        return NextResponse.json(data);
    } catch (error) {
        console.error("[items/stock-requests:update] Server error", error);

        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
        if (!sessionCookie?.trim()) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const { basketIds } =
            (await req.json()) as StockRequestMassDeleteRoutePayload;
        const clientID = getClientID();

        if (!clientID) {
            return NextResponse.json(
                { success: false, message: "S1 client is not configured" },
                { status: 500 }
            );
        }

        const normalizedIds = Array.isArray(basketIds)
            ? basketIds
                .map((id) => String(id).trim())
                .filter((id) => id.length > 0)
            : [];

        if (normalizedIds.length === 0) {
            return NextResponse.json(
                { success: false, message: "No BASKET IDs provided" },
                { status: 400 }
            );
        }

        const payload: StockRequestMassDeletePayload = {
            service: "SqlData",
            clientID,
            appId: "1305",
            SqlName: "ANTROF_MASS_DELETE",
            BASKET_IDS: normalizedIds.join(","),
            APPUSER_ID: APPROVAL_APPUSER_ID,
        };

        const responseOrError = await callSoftOne(
            payload,
            "[items/stock-requests:delete]"
        );

        if (responseOrError instanceof NextResponse) {
            return responseOrError;
        }

        const data =
            (await parseJsonWithEncodingFallback(
                responseOrError
            )) as StockRequestMassDeleteResponse;

        return NextResponse.json(data);
    } catch (error) {
        console.error("[items/stock-requests:delete] Server error", error);

        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}
