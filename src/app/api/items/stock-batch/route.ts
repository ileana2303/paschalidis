import { NextRequest, NextResponse } from "next/server";
import {
    getSoftOneClientID,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";

const MAX_CODES = 200;
const CONCURRENCY = 10;

interface StockInfo {
    stock1001: number;
    stock1006: number;
    stock1007: number;
    totalAvail: number;
    ongoing: number;
    netAvail: number;
    soReserved: number;
}

type StockSearchRow = {
    ITEM_CODE?: string;
    MTRL?: string | number;
    YP1001?: unknown;
    YP1006?: unknown;
    YP1007?: unknown;
    TOTAL_AVAIL?: unknown;
    ONGOING?: unknown;
    NET_QTY_AVAILABLE?: unknown;
    SoReserved?: unknown;
};

type StockSearchResponse = {
    rows?: StockSearchRow[];
};

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
        const response = await postSoftOne({
            service: "SqlData",
            clientID,
            appId: "1305",
            SqlName: "ITEM_SEARCH",
            part: code,
        });

        if (!response.ok) return null;

        const data = await parseJsonWithEncodingFallback<StockSearchResponse>(response);

        if (!data?.rows || !Array.isArray(data.rows)) return null;

        // Find exact match by code or by MTRL fallback.
        const match = data.rows.find(
            (r) =>
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

        const clientID = getSoftOneClientID();

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
