import type { BasketMassDeletePayload } from "@/app/lib/interface";

const S1_ENDPOINT = "https://fordps.oncloud.gr/s1services";
const GREEK_FALLBACK_ENCODINGS = ["windows-1253", "iso-8859-7"] as const;

export class MassDeleteError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = "MassDeleteError";
        this.status = status;
    }
}

interface CallMassDeleteParams {
    clientID: string;
    basketIds: Array<string | number>;
    tableAction: string;
    method: string;
    s1Key: string | number;
    appUserId: string;
    logLabel: string;
}

interface MassDeleteResponseData {
    success?: boolean;
    message?: string;
    rows?: Array<{ MESSAGE_TO_CALLER?: string } | Record<string, unknown>>;
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

export function getMassDeleteMessage(data: MassDeleteResponseData) {
    if (data.message) {
        return data.message;
    }

    const firstRow = data.rows?.[0];
    if (
        firstRow &&
        typeof firstRow === "object" &&
        "MESSAGE_TO_CALLER" in firstRow &&
        typeof firstRow.MESSAGE_TO_CALLER === "string"
    ) {
        return firstRow.MESSAGE_TO_CALLER;
    }

    return undefined;
}

export async function callMassDelete({
    clientID,
    basketIds,
    tableAction,
    method,
    s1Key,
    appUserId,
    logLabel,
}: CallMassDeleteParams) {
    const normalizedIds = basketIds
        .map((id) => String(id).trim())
        .filter(Boolean);

    if (normalizedIds.length === 0) {
        throw new MassDeleteError("No BASKET IDs provided", 400);
    }

    const payload: BasketMassDeletePayload = {
        service: "SqlData",
        clientID,
        appId: "1305",
        SqlName: "MASS_DELETE",
        BASKET_IDS: normalizedIds.join(","),
        TABLE_ACTION: tableAction,
        METHOD: method,
        S1_KEY: String(s1Key),
        APPUSER_ID: appUserId,
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
        console.error(`${logLabel} mass-delete error body:`, errorText);

        throw new MassDeleteError("Upstream mass-delete request failed", response.status);
    }

    const data = await parseJsonWithEncodingFallback(response) as MassDeleteResponseData;

    if (data?.success === false) {
        throw new MassDeleteError(
            getMassDeleteMessage(data) ?? "Mass delete failed",
            502
        );
    }

    return {
        data,
        message: getMassDeleteMessage(data),
    };
}
