import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import type {
    BasketAllResponse,
    BasketAllRoutePayload,
} from "@/lib/interface";

const S1_ENDPOINT = "https://fordps.oncloud.gr/s1services";
const GREEK_FALLBACK_ENCODINGS = ["windows-1253", "iso-8859-7"] as const;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const S1_APP_ID = "1305";
const S1_SQL_NAME = "BASKET_LIST";

type BasketListRow = {
    TRDR?: string;
    MAXDATE?: string;
    MINDATE?: string;
    CUSTOMER_NAME?: string;
    TOT_QTY?: string;
    TOTAL_VALUE?: string;
    BASKETROWS?: string;
};

function getClientID() {
    return process.env.S1_CLIENT_ID?.trim().replace(/^['"]|['"]$/g, "");
}

function toPositiveInt(value: unknown, fallback: number, max?: number) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    const integerValue = Math.floor(parsed);

    return max == null ? integerValue : Math.min(integerValue, max);
}

function normalizeSearch(value: unknown) {
    if (typeof value !== "string") {
        return "*";
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : "*";
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

function getErrorMessage(data: unknown, fallback: string) {
    if (!data || typeof data !== "object") {
        return fallback;
    }

    const record = data as Record<string, unknown>;

    const message =
        typeof record.message === "string"
            ? record.message
            : typeof record.error === "string"
                ? record.error
                : typeof record.errorcode === "string"
                    ? record.errorcode
                    : "";

    return message.trim() || fallback;
}

function matchesSearch(row: BasketListRow, search: string) {
    if (search === "*") {
        return true;
    }

    const normalizedSearch = search.toLocaleLowerCase("el-GR");

    const trdr = String(row.TRDR ?? "").toLocaleLowerCase("el-GR");
    const customerName = String(row.CUSTOMER_NAME ?? "").toLocaleLowerCase("el-GR");

    return trdr.includes(normalizedSearch) || customerName.includes(normalizedSearch);
}

export async function POST(req: NextRequest) {
    try {
        const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;

        if (!sessionCookie?.trim()) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Unauthorized",
                    totalcount: 0,
                    rows: [],
                },
                { status: 401 }
            );
        }

        const body = (await req.json().catch(() => ({}))) as BasketAllRoutePayload;

        const page = toPositiveInt(body.page, DEFAULT_PAGE);
        const pageSize = toPositiveInt(body.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
        const search = normalizeSearch(body.search);
        const clientID = getClientID();

        if (!clientID) {
            return NextResponse.json(
                {
                    success: false,
                    message: "S1 client is not configured",
                    totalcount: 0,
                    rows: [],
                },
                { status: 500 }
            );
        }

        const upstreamResponse = await fetch(S1_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                service: "SqlData",
                clientID,
                appId: S1_APP_ID,
                SqlName: S1_SQL_NAME,
            }),
        });

        if (!upstreamResponse.ok) {
            return NextResponse.json(
                {
                    success: false,
                    message: `All-clients baskets endpoint failed (${upstreamResponse.status})`,
                    totalcount: 0,
                    rows: [],
                },
                { status: upstreamResponse.status }
            );
        }

        const upstreamData = (await parseJsonWithEncodingFallback(
            upstreamResponse
        )) as {
            success?: boolean;
            message?: string;
            rows?: BasketListRow[];
        } | null;

        if (upstreamData?.success === false) {
            return NextResponse.json(
                {
                    success: false,
                    message: getErrorMessage(
                        upstreamData,
                        "All-clients baskets request failed"
                    ),
                    totalcount: 0,
                    rows: [],
                },
                { status: 502 }
            );
        }

        const rows = Array.isArray(upstreamData?.rows) ? upstreamData.rows : [];
        const filteredRows = rows.filter((row) => matchesSearch(row, search));

        const offset = (page - 1) * pageSize;
        const pagedRows = filteredRows.slice(offset, offset + pageSize);

        const response: BasketAllResponse = {
            success: true,
            message: upstreamData?.message,
            totalcount: filteredRows.length,
            page,
            pageSize,
            rows: pagedRows,
        };

        return NextResponse.json(response);
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Server error",
                totalcount: 0,
                rows: [],
            },
            { status: 500 }
        );
    }
}