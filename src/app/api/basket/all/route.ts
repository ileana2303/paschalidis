import { NextRequest, NextResponse } from "next/server";
import { backend } from "@/lib/http/backend";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import type { BasketAllResponse, BasketAllRoutePayload } from "@/app/lib/interface";

const DEFAULT_BACKEND_PATH = "/Api/Basket/AllClients";
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function getAllBasketsBackendPath() {
    const configuredPath = process.env.BACKEND_ALL_BASKETS_PATH?.trim();

    if (!configuredPath) {
        return DEFAULT_BACKEND_PATH;
    }

    return configuredPath.startsWith("/") ? configuredPath : `/${configuredPath}`;
}

function toPositiveInt(value: unknown, fallback: number, max?: number) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    const integerValue = Math.floor(parsed);

    if (max != null) {
        return Math.min(integerValue, max);
    }

    return integerValue;
}

function normalizeSearch(value: unknown) {
    if (typeof value !== "string") {
        return "*";
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "*";
}

function extractRows(data: Record<string, unknown> | null): BasketAllResponse["rows"] {
    if (!data) {
        return [];
    }

    if (Array.isArray(data.rows)) {
        return data.rows as BasketAllResponse["rows"];
    }

    if (Array.isArray(data.data)) {
        return data.data as BasketAllResponse["rows"];
    }

    return [];
}

function extractMessage(data: Record<string, unknown> | null, fallback: string) {
    if (!data) {
        return fallback;
    }

    if (typeof data.message === "string" && data.message.trim().length > 0) {
        return data.message;
    }

    if (typeof data.error === "string" && data.error.trim().length > 0) {
        return data.error;
    }

    if (typeof data.errorcode === "string" && data.errorcode.trim().length > 0) {
        return data.errorcode;
    }

    return fallback;
}

function extractTotalcount(
    data: Record<string, unknown> | null,
    fallback: number
) {
    if (!data) {
        return fallback;
    }

    const totalcount = Number(data.totalcount);
    if (Number.isFinite(totalcount) && totalcount >= 0) {
        return totalcount;
    }

    return fallback;
}

export async function POST(req: NextRequest) {
    try {
        const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
        if (!sessionCookie?.trim()) {
            return NextResponse.json(
                { success: false, message: "Unauthorized", totalcount: 0, rows: [] },
                { status: 401 }
            );
        }

        const body =
            (await req.json().catch(() => ({}))) as BasketAllRoutePayload;
        const page = toPositiveInt(body.page, DEFAULT_PAGE);
        const pageSize = toPositiveInt(body.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
        const search = normalizeSearch(body.search);
        const backendPath = getAllBasketsBackendPath();

        const upstreamResponse = await backend.post(backendPath, {
            search,
            page,
            pageSize,
        });

        const upstreamData =
            upstreamResponse.data && typeof upstreamResponse.data === "object"
                ? (upstreamResponse.data as Record<string, unknown>)
                : null;

        if (upstreamResponse.status < 200 || upstreamResponse.status >= 300) {
            return NextResponse.json(
                {
                    success: false,
                    message: extractMessage(
                        upstreamData,
                        `All-clients baskets endpoint failed (${upstreamResponse.status})`
                    ),
                    totalcount: 0,
                    rows: [],
                },
                {
                    status:
                        upstreamResponse.status >= 400 && upstreamResponse.status < 500
                            ? upstreamResponse.status
                            : 502,
                }
            );
        }

        if (upstreamData?.success === false) {
            return NextResponse.json(
                {
                    success: false,
                    message: extractMessage(
                        upstreamData,
                        "All-clients baskets request failed"
                    ),
                    totalcount: 0,
                    rows: [],
                },
                { status: 502 }
            );
        }

        const rows = extractRows(upstreamData);
        const response: BasketAllResponse = {
            success: true,
            message:
                upstreamData && typeof upstreamData.message === "string"
                    ? upstreamData.message
                    : undefined,
            totalcount: extractTotalcount(upstreamData, rows.length),
            page:
                upstreamData && Number.isFinite(Number(upstreamData.page))
                    ? Number(upstreamData.page)
                    : page,
            pageSize:
                upstreamData && Number.isFinite(Number(upstreamData.pageSize))
                    ? Number(upstreamData.pageSize)
                    : pageSize,
            rows,
        };

        return NextResponse.json(response);
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "Server error",
                totalcount: 0,
                rows: [],
            },
            { status: 500 }
        );
    }
}
