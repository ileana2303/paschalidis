import { NextRequest, NextResponse } from "next/server";

const GREEK_FALLBACK_ENCODINGS = ["windows-1253", "iso-8859-7"] as const;
const MAX_CODES = 200;
const CONCURRENCY = 10;

function getCharset(contentType: string | null) {
    if (!contentType) return null;
    const match = contentType.match(/charset=([^;]+)/i);
    return match?.[1]?.trim().toLowerCase() ?? null;
}

async function parseJsonWithEncodingFallback(response: Response) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    const candidateEncodings = new Set<string>();
    const declaredCharset = getCharset(response.headers.get("content-type"));

    if (declaredCharset) candidateEncodings.add(declaredCharset);
    candidateEncodings.add("utf-8");
    for (const enc of GREEK_FALLBACK_ENCODINGS) candidateEncodings.add(enc);

    let lastError: Error | null = null;

    for (const encoding of candidateEncodings) {
        try {
            const text = new TextDecoder(encoding).decode(bytes);
            if (encoding === "utf-8" && text.includes("\uFFFD")) continue;
            return JSON.parse(text);
        } catch (error) {
            lastError = error instanceof Error ? error : new Error("Decode failed");
        }
    }

    throw lastError ?? new Error("Failed to decode upstream response");
}

interface StockInfo {
    stock1001: number;
    stock1006: number;
    stock1007: number;
    totalAvail: number;
    ongoing: number;
    netAvail: number;
    soReserved: number;
}

function toNumeric(value: unknown) {
    const parsed = Number(String(value ?? "").trim().replace(",", "."));
    if (!Number.isFinite(parsed)) {
        return 0;
    }

    return parsed;
}

async function fetchStockForCode(
    code: string,
    clientID: string
): Promise<{ code: string; stock: StockInfo } | null> {
    try {
        const response = await fetch("https://fordps.oncloud.gr/s1services", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                service: "SqlData",
                clientID,
                appId: "1305",
                SqlName: "ITEM_SEARCH",
                part: code,
            }),
        });

        if (!response.ok) return null;

        const data = await parseJsonWithEncodingFallback(response);

        if (!data?.rows || !Array.isArray(data.rows)) return null;

        // Find exact match by code or by MTRL fallback.
        const match = data.rows.find(
            (r: { ITEM_CODE?: string; MTRL?: string | number }) =>
                String(r.ITEM_CODE ?? "").trim() === code ||
                String(r.MTRL ?? "").trim() === code
        ) ?? data.rows[0];

        if (!match) return null;

        return {
            code,
            stock: {
                stock1001: toNumeric(match.YP1001),
                stock1006: toNumeric(match.YP1006),
                stock1007: toNumeric(match.YP1007),
                totalAvail: toNumeric(match.TOTAL_AVAIL),
                ongoing: toNumeric(match.ONGOING),
                netAvail: toNumeric(match.NET_QTY_AVAILABLE),
                soReserved: toNumeric(match.SoReserved),
            },
        };
    } catch {
        return null;
    }
}

/**
 * Run an array of async functions with a concurrency limit.
 */
async function withConcurrency<T>(
    tasks: (() => Promise<T>)[],
    limit: number
): Promise<T[]> {
    const results: T[] = [];
    let index = 0;

    async function worker() {
        while (index < tasks.length) {
            const current = index++;
            results[current] = await tasks[current]();
        }
    }

    await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
    return results;
}

export async function POST(req: NextRequest) {
    try {
        const { codes } = await req.json();

        if (!Array.isArray(codes) || codes.length === 0) {
            return NextResponse.json(
                { success: false, message: "codes array is required" },
                { status: 400 }
            );
        }

        const clientID = process.env.S1_CLIENT_ID?.trim().replace(/^['"]|['"]$/g, "");

        if (!clientID) {
            return NextResponse.json(
                { success: false, message: "S1 client is not configured" },
                { status: 500 }
            );
        }

        // Deduplicate and limit
        const uniqueCodes = [...new Set(codes.map(String))].slice(0, MAX_CODES);

        const tasks = uniqueCodes.map(
            (code) => () => fetchStockForCode(code, clientID)
        );

        const results = await withConcurrency(tasks, CONCURRENCY);

        const stocks: Record<string, StockInfo> = {};
        for (const result of results) {
            if (result) {
                stocks[result.code] = result.stock;
            }
        }

        return NextResponse.json({ success: true, stocks });
    } catch (error) {
        console.error("[items/stock-batch] Server error", error);
        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}
