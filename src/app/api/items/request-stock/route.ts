import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import type {
    StockRequestInsertPayload,
    StockRequestInsertResponse,
    StockRequestRoutePayload,
} from "@/app/lib/interface";

const GREEK_FALLBACK_ENCODINGS = ["windows-1253", "iso-8859-7"] as const;
const S1_ENDPOINT = "https://fordps.oncloud.gr/s1services";
const ZERO_GUID = "00000000-0000-0000-0000-000000000000";

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
            typeof branch === "string" && branch.trim() ? branch.trim() : "1001";
        const clientID = process.env.S1_CLIENT_ID
            ?.trim()
            .replace(/^['"]|['"]$/g, "");

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

        const response = await fetch(S1_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(upstreamPayload),
        });

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
