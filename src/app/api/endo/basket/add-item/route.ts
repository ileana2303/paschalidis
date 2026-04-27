import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import type {
    EndoBasketActionResponse,
    EndoBasketAddPayload,
    EndoBasketAddRoutePayload,
} from "@/app/lib/interface";

const S1_ENDPOINT = "https://fordps.oncloud.gr/s1services";
const GREEK_FALLBACK_ENCODINGS = ["windows-1253", "iso-8859-7"] as const;
const ZERO_GUID = "00000000-0000-0000-0000-000000000000";

function getClientID() {
    return process.env.S1_CLIENT_ID?.trim().replace(/^['"]|['"]$/g, "");
}

function getClientIDForBranch(branch: string) {
    const normalizedBranch = branch.trim();
    const fromBranch =
        process.env[`S1_CLIENT_ID_${normalizedBranch}`]
            ?.trim()
            .replace(/^['"]|['"]$/g, "") ?? "";
    const fallback = getClientID();

    return fromBranch || fallback;
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

function extractBasketId(message: string) {
    const match = message.match(/ID\s*:\s*(\d+)/i);
    return match?.[1] ?? "";
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

        const body = await req.json() as EndoBasketAddRoutePayload;
        const normalizedMtrl = Number(body.MTRL);
        const normalizedQty = Number(body.QTY);
        const normalizedBranch = Number(body.BRANCH);
        const normalizedToBranch = Number(body.TO_BRANCH);
        const normalizedAppUserId = String(body.APPUSER_ID ?? "").trim() || ZERO_GUID;
        const clientID = getClientIDForBranch(String(normalizedBranch));

        if (!clientID) {
            return NextResponse.json(
                { success: false, message: "S1 client is not configured" },
                { status: 500 }
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

        if (!Number.isFinite(normalizedBranch) || normalizedBranch <= 0) {
            return NextResponse.json(
                { success: false, message: "Destination branch is required" },
                { status: 400 }
            );
        }

        if (!Number.isFinite(normalizedToBranch) || normalizedToBranch <= 0) {
            return NextResponse.json(
                { success: false, message: "Source branch is required" },
                { status: 400 }
            );
        }

        if (normalizedBranch === normalizedToBranch) {
            return NextResponse.json(
                { success: false, message: "Source and destination branch must differ" },
                { status: 400 }
            );
        }

        const payload: EndoBasketAddPayload = {
            service: "SqlData",
            clientID,
            appId: "1305",
            SqlName: "NOW_ENDO_INSERT",
            MTRL: normalizedMtrl,
            QTY: normalizedQty,
            BRANCH: normalizedBranch,
            TO_BRANCH: normalizedToBranch,
            APPUSER_ID: normalizedAppUserId,
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
            console.error("[endo/basket/add-item] Upstream error body:", errorText);

            return NextResponse.json(
                { success: false, message: "Upstream request failed" },
                { status: response.status }
            );
        }

        const upstreamData = await parseJsonWithEncodingFallback(response) as {
            success?: boolean;
            message?: string;
            rows?: Array<{
                MESSAGE_TO_CALLER?: string;
                NEW_ID?: string | number;
                BASKETID?: string | number;
                ID?: string | number;
            }>;
        };

        if (upstreamData?.success === false) {
            return NextResponse.json(
                {
                    success: false,
                    message: upstreamData.message ?? "Upstream endo basket insert failed",
                },
                { status: 502 }
            );
        }

        const callerMessage =
            upstreamData?.rows?.[0]?.MESSAGE_TO_CALLER ??
            upstreamData?.message ??
            "Item added to endo basket";
        const basketId =
            String(
                upstreamData?.rows?.[0]?.NEW_ID ??
                upstreamData?.rows?.[0]?.BASKETID ??
                upstreamData?.rows?.[0]?.ID ??
                extractBasketId(callerMessage)
            ).trim();

        const data: EndoBasketActionResponse = {
            success: true,
            message: callerMessage,
            basketId: basketId || undefined,
        };

        return NextResponse.json(data);
    } catch (error) {
        console.error("[endo/basket/add-item] Server error", error);

        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}
