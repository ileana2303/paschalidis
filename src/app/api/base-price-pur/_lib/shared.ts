import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/session-token";

export const S1_APP_ID = "1305";

export function hasSession(req: NextRequest) {
    return Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value?.trim());
}

export function unauthorizedResponse() {
    return NextResponse.json(
        {
            success: false,
            message: "Απαιτείται σύνδεση.",
        },
        { status: 401 }
    );
}

export function missingClientResponse() {
    return NextResponse.json(
        {
            success: false,
            message: "Δεν έχει ρυθμιστεί ο πελάτης SoftOne.",
            totalcount: 0,
            rows: [],
        },
        { status: 500 }
    );
}

export async function getSessionUsername(req: NextRequest) {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value?.trim();
    if (!token) return null;

    const session = await verifySessionToken(token);
    return session?.username?.trim() || null;
}

export function getUpstreamMessage(data: unknown, fallback: string) {
    if (!data || typeof data !== "object") return fallback;

    const record = data as Record<string, unknown>;
    const message = [record.message, record.error, record.errorcode].find(
        (value) => typeof value === "string" && value.trim()
    );

    return typeof message === "string" ? message.trim() : fallback;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeRow<T>(row: Record<string, unknown>): T {
    return Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
            key,
            value == null ? "" : String(value),
        ])
    ) as T;
}

export function normalizePositiveFindoc(value: unknown) {
    const raw = String(value ?? "").trim();
    if (!raw) return null;

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    return raw;
}
