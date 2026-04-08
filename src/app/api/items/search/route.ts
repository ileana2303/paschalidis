import { NextRequest, NextResponse } from "next/server";

const GREEK_FALLBACK_ENCODINGS = ["windows-1253", "iso-8859-7"] as const;

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
            lastError = error instanceof Error ? error : new Error("Failed to decode upstream response");
        }
    }

    throw lastError ?? new Error("Failed to decode upstream response");
}

export async function POST(req: NextRequest) {
    try {
        const { search } = await req.json();
        const normalizedSearch = typeof search === "string" ? search.trim() : "";
        const clientID = process.env.S1_CLIENT_ID?.trim().replace(/^['"]|['"]$/g, "");

        if (!normalizedSearch) {
            return NextResponse.json(
                { success: false, message: "Search term is required", totalcount: 0, rows: [] },
                { status: 400 }
            );
        }

        if (!clientID) {
            console.error("[items/search] Missing S1_CLIENT_ID");

            return NextResponse.json(
                { success: false, message: "S1 client is not configured", totalcount: 0, rows: [] },
                { status: 500 }
            );
        }

        const response = await fetch("https://fordps.oncloud.gr/s1services", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                service: "SqlData",
                clientID,
                appId: "1305",
                SqlName: "ITEM_SEARCH",
                part: normalizedSearch,
            }),
        });

        if (!response.ok) {
            return NextResponse.json(
                { success: false, message: "Upstream request failed" },
                { status: response.status }
            );
        }

        const data = await parseJsonWithEncodingFallback(response);

        if (
            typeof data === "object" &&
            data !== null &&
            "success" in data &&
            data.success === false
        ) {
            console.error("[items/search] Upstream returned an application error", {
                message: "message" in data ? data.message : undefined,
            });

            return NextResponse.json(data, { status: 502 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("[items/search] Server error", error);

        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}
