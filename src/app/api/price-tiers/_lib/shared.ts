import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/session-token";
import {
    getSoftOneClientID,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";

const S1_APP_ID = "1305";

export type TierSqlName =
    | "TIER_AUTO_EXEC"
    | "TIER_LIST_ALL"
    | "TIER_TRDPGROUP"
    | "TIER_SAVE"
    | "TIER_SET_TO_CUSTOMER";

/** SoftOne rows: every value is a string and NULL columns are missing entirely. */
export type SoftOneRow = Partial<Record<string, string>>;

export type TierSqlResult =
    | { ok: true; rows: SoftOneRow[] }
    | { ok: false; message: string; status: number };

export function jsonFailure(message: string, status: number) {
    return NextResponse.json({ success: false, message }, { status });
}

export async function getSessionUsername(req: NextRequest) {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value?.trim();
    if (!token) return null;

    const session = await verifySessionToken(token);
    return session?.username?.trim() || null;
}

/** Reads a string field from a row, falling back when the column is absent. */
export function field(row: SoftOneRow | undefined, key: string, fallback = "") {
    const value = row?.[key];
    return typeof value === "string" ? value.trim() : fallback;
}

function toSoftOneRow(value: unknown): SoftOneRow | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return null;
    }

    return Object.fromEntries(
        Object.entries(value)
            .filter(([, entry]) => entry != null)
            .map(([key, entry]) => [key, String(entry)])
    );
}

function getUpstreamMessage(data: unknown, fallback: string) {
    if (!data || typeof data !== "object") return fallback;

    const record = data as Record<string, unknown>;
    const message = [record.error, record.message, record.errorcode].find(
        (value) => typeof value === "string" && value.trim()
    );

    return typeof message === "string" ? message.trim() : fallback;
}

/**
 * Calls a TIER_* SqlData endpoint. Every parameter must be present and sent as
 * a string - a missing key makes SoftOne fail with "Ole exception".
 */
export async function callTierSql(
    sqlName: TierSqlName,
    params: Record<string, string>,
    fallbackMessage: string
): Promise<TierSqlResult> {
    const clientID = getSoftOneClientID();

    if (!clientID) {
        return { ok: false, message: "Δεν έχει ρυθμιστεί ο πελάτης SoftOne.", status: 500 };
    }

    const response = await postSoftOne({
        service: "SqlData",
        clientID,
        appId: S1_APP_ID,
        SqlName: sqlName,
        ...params,
    });

    if (!response.ok) {
        console.error(`[price-tiers:${sqlName}] Upstream HTTP ${response.status}`);

        return {
            ok: false,
            message: `Αποτυχία επικοινωνίας με το ERP (HTTP ${response.status}).`,
            status: 502,
        };
    }

    const data = (await parseJsonWithEncodingFallback(response)) as {
        success?: unknown;
        rows?: unknown;
    } | null;

    if (data?.success !== true) {
        return {
            ok: false,
            message: getUpstreamMessage(data, fallbackMessage),
            status: 502,
        };
    }

    const rows = Array.isArray(data.rows)
        ? data.rows.map(toSoftOneRow).filter((row): row is SoftOneRow => row !== null)
        : [];

    return { ok: true, rows };
}

/**
 * The outer `success` only means the call arrived; the real outcome is
 * rows[0].SUCCESS. On failure rows[0].ERROR is a Greek message for the user
 * and is passed through untouched.
 */
export function getFirstRowOutcome(rows: SoftOneRow[], fallbackMessage: string) {
    const row = rows[0];

    if (field(row, "SUCCESS") === "1") {
        return { ok: true as const, row: row as SoftOneRow };
    }

    return { ok: false as const, message: field(row, "ERROR") || fallbackMessage };
}
