import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
    getSoftOneClientID,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";
import type {
    BasketAllResponse,
    BasketAllRoutePayload,
} from "@/lib/interface";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const S1_APP_ID = "1305";
const S1_SQL_NAME = "BASKET_OUT_L_BRANCH";

type BasketListRow = {
    TRDR?: string;
    MAXDATE?: string;
    MINDATE?: string;
    CUSTOMER_NAME?: string;
    TOT_QTY?: string;
    TOTAL_VALUE?: string;
    BASKETROWS?: string;
};

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

function toBranch(value: unknown) {
    const parsed = Number(String(value ?? "").trim());

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    return Math.floor(parsed);
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
                    message: 'Απαιτείται σύνδεση.',
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
        const branch = toBranch(body.branch);
        const clientID = getSoftOneClientID();

        if (!branch) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Απαιτείται υποκατάστημα.',
                    totalcount: 0,
                    rows: [],
                },
                { status: 400 }
            );
        }

        if (!clientID) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Δεν έχει ρυθμιστεί ο πελάτης SoftOne.',
                    totalcount: 0,
                    rows: [],
                },
                { status: 500 }
            );
        }

        const upstreamResponse = await postSoftOne({
            service: "SqlData",
            clientID,
            appId: S1_APP_ID,
            SqlName: S1_SQL_NAME,
            BRANCH: branch,
        });

        if (!upstreamResponse.ok) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Αποτυχία επικοινωνίας με το ERP (HTTP ${upstreamResponse.status}).`,
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
                        'Αποτυχία αιτήματος καλαθιών ανά πελάτη.'
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
                message: error instanceof Error ? error.message : 'Σφάλμα διακομιστή.',
                totalcount: 0,
                rows: [],
            },
            { status: 500 }
        );
    }
}
