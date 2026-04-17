import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import type {
    BasketActionResponse,
    BasketOutPayload,
    BasketOutRoutePayload,
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
        const session = await getSession();

        if (!session) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await req.json() as BasketOutRoutePayload & { TRDR?: string };
        const normalizedTrdr = String(body.trdr ?? body.TRDR ?? "").trim();
        const clientID = getClientID();

        if (!normalizedTrdr || !Number.isFinite(Number(normalizedTrdr))) {
            return NextResponse.json(
                { success: false, message: "Customer TRDR is required" },
                { status: 400 }
            );
        }

        if (!clientID) {
            return NextResponse.json(
                { success: false, message: "S1 client is not configured" },
                { status: 500 }
            );
        }

        const payload: BasketOutPayload = {
            service: "SqlData",
            clientID,
            appId: "1305",
            SqlName: "BASKET_OUT",
            TRDR: normalizedTrdr,
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
            console.error("[basket/submit] Upstream error body:", errorText);

            return NextResponse.json(
                { success: false, message: "Upstream request failed" },
                { status: response.status }
            );
        }

        const upstreamData = await parseJsonWithEncodingFallback(response) as {
            success?: boolean;
            message?: string;
            totalcount?: number;
            rows?: Array<{ MESSAGE_TO_CALLER?: string } | Record<string, unknown>>;
        };

        if (upstreamData?.success === false) {
            return NextResponse.json(
                {
                    success: false,
                    message: upstreamData.message ?? "Upstream basket submit failed",
                },
                { status: 502 }
            );
        }

        const firstRow = upstreamData?.rows?.[0];
        const callerMessage =
            firstRow &&
                typeof firstRow === "object" &&
                "MESSAGE_TO_CALLER" in firstRow &&
                typeof firstRow.MESSAGE_TO_CALLER === "string"
                ? firstRow.MESSAGE_TO_CALLER
                : undefined;

        const data: BasketActionResponse = {
            success: true,
            message:
                upstreamData?.message ??
                callerMessage ??
                "Order submitted",
        };

        return NextResponse.json(data);
    } catch (error) {
        console.error("[basket/submit] Server error", error);

        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}
