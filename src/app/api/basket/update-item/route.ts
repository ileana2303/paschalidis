import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import type {
    BasketActionResponse,
    BasketUpdatePayload,
    BasketUpdateRoutePayload,
} from "@/app/lib/interface";

const S1_ENDPOINT = "https://fordps.oncloud.gr/s1services";
const GREEK_FALLBACK_ENCODINGS = ["windows-1253", "iso-8859-7"] as const;

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

export async function POST(req: NextRequest) {
    try {
        const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
        if (!sessionCookie?.trim()) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await req.json() as BasketUpdateRoutePayload;
        const normalizedBasketId = Number(body.BASKETID);
        const normalizedQty = Number(body.QTY);
        const clientID = getClientID();

        if (!clientID) {
            return NextResponse.json(
                { success: false, message: "S1 client is not configured" },
                { status: 500 }
            );
        }

        if (!Number.isFinite(normalizedBasketId) || normalizedBasketId <= 0) {
            return NextResponse.json(
                { success: false, message: "Basket id is required" },
                { status: 400 }
            );
        }

        if (!Number.isFinite(normalizedQty) || normalizedQty <= 0) {
            return NextResponse.json(
                { success: false, message: "Quantity must be a positive number" },
                { status: 400 }
            );
        }

        const payload: BasketUpdatePayload = {
            service: "SqlData",
            clientID,
            appId: "1305",
            SqlName: "BASKET_UPDATE",
            QTY: normalizedQty,
            BASKETID: normalizedBasketId,
        };

        const response = await fetch(S1_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[basket/update-item] Upstream error body:", errorText);

            return NextResponse.json(
                { success: false, message: "Upstream request failed" },
                { status: response.status }
            );
        }

        const upstreamData = await parseJsonWithEncodingFallback(response) as {
            success?: boolean;
            message?: string;
            rows?: Array<{ MESSAGE_TO_CALLER?: string }>;
        };

        if (upstreamData?.success === false) {
            return NextResponse.json(
                {
                    success: false,
                    message: upstreamData.message ?? "Upstream basket update failed",
                },
                { status: 502 }
            );
        }

        const data: BasketActionResponse = {
            success: true,
            message:
                upstreamData?.message ??
                upstreamData?.rows?.[0]?.MESSAGE_TO_CALLER ??
                "Basket quantity updated",
        };

        return NextResponse.json(data);
    } catch (error) {
        console.error("[basket/update-item] Server error", error);

        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}
