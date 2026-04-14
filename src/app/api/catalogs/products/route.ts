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
        const body = await req.json();
        const page = typeof body.page === "number" && body.page >= 1 ? body.page : 1;
        const pageSize =
            typeof body.pageSize === "number" && body.pageSize >= 1 && body.pageSize <= 500
                ? body.pageSize
                : 100;

        const clientID = process.env.S1_CLIENT_ID?.trim().replace(/^['"]|['"]$/g, "");

        if (!clientID) {
            console.error("[catalogs/products] Missing S1_CLIENT_ID");

            return NextResponse.json(
                { success: false, message: "S1 client is not configured" },
                { status: 500 }
            );
        }

        const response = await fetch(
            "https://dev-fordps.oncloud.gr/s1services/js/kkandral.api/getProducts",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clientID, page, pageSize }),
            }
        );

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
            console.error("[catalogs/products] Upstream error", {
                message: "message" in data ? data.message : undefined,
            });

            return NextResponse.json(data, { status: 502 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("[catalogs/products] Server error", error);

        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}
