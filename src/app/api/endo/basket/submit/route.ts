import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import type {
    EndoBasketActionResponse,
    EndoBasketSubmitLineRoutePayload,
    EndoBasketSubmitRoutePayload,
} from "@/app/lib/interface";
import { callMassDelete, MassDeleteError } from "@/app/api/_lib/mass-delete";

const S1_ENDPOINT = "https://fordps.oncloud.gr/s1services";
const GREEK_FALLBACK_ENCODINGS = ["windows-1253", "iso-8859-7"] as const;

const DEFAULT_ENDO_ORDER_SERIES = "7004|\u03c0\u0394";
const DEFAULT_ENDO_ORDER_TAX_SERIES = "\u03c0\u0394";
const DEFAULT_ENDO_TRDR = 8674;
const DEFAULT_ENDO_TRDBRANCH = 13;
const DEFAULT_ENDO_TRUCKS = 2;
const DEFAULT_ENDO_SOCASH = 3800;
const DEFAULT_ENDO_DELETE_TABLE_ACTION = "ENDO";
const DEFAULT_ENDO_DELETE_METHOD = "LINK_S1";
const ZERO_GUID = "00000000-0000-0000-0000-000000000000";

type SetDataOrderPayload = {
    service: "setData";
    clientID: string;
    appId: "1305";
    OBJECT: "SALDOC";
    KEY: "";
    data: {
        SALDOC: Array<{
            SERIES: string;
            TAXSERIES: string;
            TRDR: number;
            TRDBRANCH: number;
            PAYMENT: number;
            SERIESNUM: string;
            TRUCKS: number;
            DELIVDATE: string;
            COMMENTS: string;
            REMARKS: string;
            SHIPKIND: number;
            SOCASH: number;
        }>;
        MTRDOC: Array<{
            TRUCKS: number;
            DELIVDATE: string;
            DEPTRDR_CUSTOMER_CODE: string;
            BILLTRDR_CUSTOMER_CODE: string;
            BRANCHSEC: number;
            WHOUSESEC: number;
        }>;
        ITELINES: Array<{
            MTRL: number;
            QTY1: number;
        }>;
    };
};

type EndoGroup = {
    key: string;
    sourceBranch: number;
    destinationBranch: number;
    linesByMtrl: Map<number, number>;
    basketIds: Set<string>;
};

function sanitizeEnvValue(value: string | undefined) {
    return value?.trim().replace(/^['"]|['"]$/g, "") ?? "";
}

function getEnvString(name: string) {
    return sanitizeEnvValue(process.env[name]);
}

function asPositiveNumber(value: unknown): number | undefined {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return undefined;
    }

    return parsed;
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

function resolveIsoDate(value: unknown) {
    const rawValue = String(value ?? "").trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
        return rawValue;
    }

    if (/^\d{4}-\d{2}-\d{2}T/.test(rawValue)) {
        return rawValue.slice(0, 10);
    }

    return new Date().toISOString().slice(0, 10);
}

function getSqlClientID() {
    return getEnvString("S1_CLIENT_ID");
}

function getSetDataClientID(sourceBranch: string) {
    const normalizedBranch = sourceBranch.trim();
    const endoBranch = normalizedBranch
        ? getEnvString(`S1_ENDO_SETDATA_CLIENT_ID_${normalizedBranch}`)
        : "";
    const setDataBranch = normalizedBranch
        ? getEnvString(`S1_SETDATA_CLIENT_ID_${normalizedBranch}`)
        : "";
    const setDataDefault = getEnvString("S1_SETDATA_CLIENT_ID");
    const sqlBranch = normalizedBranch
        ? getEnvString(`S1_CLIENT_ID_${normalizedBranch}`)
        : "";
    const sqlDefault = getSqlClientID();

    return endoBranch || setDataBranch || setDataDefault || sqlBranch || sqlDefault;
}

function getPerBranchNumericEnv(baseKey: string, branchCode: number, fallback: number) {
    const fromBranchSpecific = asPositiveNumber(getEnvString(`${baseKey}_${branchCode}`));
    if (fromBranchSpecific != null) {
        return fromBranchSpecific;
    }

    const fromDefault = asPositiveNumber(getEnvString(baseKey));
    if (fromDefault != null) {
        return fromDefault;
    }

    return fallback;
}

function getPerBranchStringEnv(baseKey: string, branchCode: number) {
    const fromBranchSpecific = getEnvString(`${baseKey}_${branchCode}`);
    if (fromBranchSpecific) {
        return fromBranchSpecific;
    }

    return getEnvString(baseKey);
}

function groupEndoLines(items: EndoBasketSubmitLineRoutePayload[]) {
    const groups = new Map<string, EndoGroup>();

    for (const item of items) {
        const mtrl = asPositiveNumber(item.mtrl);
        const qty = asPositiveNumber(item.qty);
        const destinationBranch = asPositiveNumber(item.branch);
        const sourceBranch = asPositiveNumber(item.toBranch);

        if (!mtrl || !qty || !destinationBranch || !sourceBranch) {
            continue;
        }

        if (destinationBranch === sourceBranch) {
            continue;
        }

        const key = `${sourceBranch}-${destinationBranch}`;
        let group = groups.get(key);
        if (!group) {
            group = {
                key,
                sourceBranch,
                destinationBranch,
                linesByMtrl: new Map<number, number>(),
                basketIds: new Set<string>(),
            };
            groups.set(key, group);
        }

        group.linesByMtrl.set(mtrl, (group.linesByMtrl.get(mtrl) ?? 0) + qty);

        for (const rawBasketId of item.basketIds ?? []) {
            const basketId = String(rawBasketId ?? "").trim();
            if (basketId) {
                group.basketIds.add(basketId);
            }
        }
    }

    return Array.from(groups.values());
}

export async function POST(req: NextRequest) {
    try {
        const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
        if (!sessionCookie?.trim()) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await req.json() as EndoBasketSubmitRoutePayload;
        const items = Array.isArray(body.items) ? body.items : [];

        if (items.length === 0) {
            return NextResponse.json(
                { success: false, message: "Endo basket is empty. Add items before submitting." },
                { status: 400 }
            );
        }

        const sqlClientID = getSqlClientID();
        if (!sqlClientID) {
            return NextResponse.json(
                { success: false, message: "S1 SQL client is not configured" },
                { status: 500 }
            );
        }

        const appUserId = String(body.appUserId ?? "").trim() || ZERO_GUID;
        const deliveryDate = resolveIsoDate(body.deliveryDate);
        const userNotes = String(body.notes ?? "").trim();
        const groups = groupEndoLines(items);

        if (groups.length === 0) {
            return NextResponse.json(
                { success: false, message: "No valid endo lines to submit." },
                { status: 400 }
            );
        }

        const orderIds: string[] = [];
        const submittedGroups: string[] = [];
        const tableAction =
            getEnvString("S1_ENDO_MASS_DELETE_TABLE_ACTION") ||
            DEFAULT_ENDO_DELETE_TABLE_ACTION;
        const deleteMethod =
            getEnvString("S1_ENDO_MASS_DELETE_METHOD") ||
            DEFAULT_ENDO_DELETE_METHOD;
        const deleteAppUserId =
            getEnvString("S1_ENDO_MASS_DELETE_APPUSER_ID") ||
            appUserId ||
            ZERO_GUID;

        for (const group of groups) {
            const setDataClientID = getSetDataClientID(String(group.sourceBranch));
            if (!setDataClientID) {
                return NextResponse.json(
                    {
                        success: false,
                        message: `S1 setData client is not configured for source branch ${group.sourceBranch}`,
                    },
                    { status: 500 }
                );
            }

            const orderSeries =
                getEnvString("S1_ENDO_ORDER_SERIES") || DEFAULT_ENDO_ORDER_SERIES;
            const orderTaxSeries =
                getEnvString("S1_ENDO_ORDER_TAXSERIES") || DEFAULT_ENDO_ORDER_TAX_SERIES;
            const orderSeriesNum = getPerBranchStringEnv(
                "S1_ENDO_ORDER_SERIESNUM",
                group.sourceBranch
            );
            const orderTrdr = getPerBranchNumericEnv(
                "S1_ENDO_TRDR",
                group.destinationBranch,
                DEFAULT_ENDO_TRDR
            );
            const orderTrdBranch = getPerBranchNumericEnv(
                "S1_ENDO_TRDBRANCH",
                group.destinationBranch,
                DEFAULT_ENDO_TRDBRANCH
            );
            const orderSocash = getPerBranchNumericEnv(
                "S1_ENDO_SOCASH",
                group.destinationBranch,
                DEFAULT_ENDO_SOCASH
            );
            const orderTrucks = getPerBranchNumericEnv(
                "S1_ENDO_TRUCKS",
                group.sourceBranch,
                DEFAULT_ENDO_TRUCKS
            );

            const comments =
                userNotes ||
                `ΕΝΔΟ ${group.sourceBranch} -> ${group.destinationBranch}`;
            const remarks =
                getEnvString("S1_ENDO_ORDER_REMARKS") || "JSON COPY FOR MONITORING";

            const orderLines = Array.from(group.linesByMtrl.entries()).map(
                ([MTRL, QTY1]) => ({ MTRL, QTY1 })
            );

            if (orderLines.length === 0) {
                return NextResponse.json(
                    { success: false, message: `No valid lines for group ${group.key}` },
                    { status: 400 }
                );
            }

            if (group.basketIds.size === 0) {
                return NextResponse.json(
                    {
                        success: false,
                        message: `Unable to resolve basket ids for group ${group.key}`,
                    },
                    { status: 400 }
                );
            }

            const setDataPayload: SetDataOrderPayload = {
                service: "setData",
                clientID: setDataClientID,
                appId: "1305",
                OBJECT: "SALDOC",
                KEY: "",
                data: {
                    SALDOC: [
                        {
                            SERIES: orderSeries,
                            TAXSERIES: orderTaxSeries,
                            TRDR: orderTrdr,
                            TRDBRANCH: orderTrdBranch,
                            PAYMENT: group.destinationBranch,
                            SERIESNUM: orderSeriesNum,
                            TRUCKS: orderTrucks,
                            DELIVDATE: deliveryDate,
                            COMMENTS: comments,
                            REMARKS: remarks,
                            SHIPKIND: group.sourceBranch,
                            SOCASH: orderSocash,
                        },
                    ],
                    MTRDOC: [
                        {
                            TRUCKS: orderTrucks,
                            DELIVDATE: deliveryDate,
                            DEPTRDR_CUSTOMER_CODE: "",
                            BILLTRDR_CUSTOMER_CODE: "",
                            BRANCHSEC: group.destinationBranch,
                            WHOUSESEC: group.destinationBranch,
                        },
                    ],
                    ITELINES: orderLines,
                },
            };

            const setDataResponse = await fetch(S1_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(setDataPayload),
            });

            if (!setDataResponse.ok) {
                const errorText = await setDataResponse.text();
                console.error("[endo/basket/submit] setData error body:", errorText);

                return NextResponse.json(
                    {
                        success: false,
                        message: `Upstream endo order submission failed for ${group.key}`,
                    },
                    { status: setDataResponse.status }
                );
            }

            const setDataResult = await parseJsonWithEncodingFallback(setDataResponse) as {
                success?: boolean;
                message?: string;
                id?: string | number;
            };

            if (setDataResult?.success === false) {
                return NextResponse.json(
                    {
                        success: false,
                        message:
                            setDataResult.message ??
                            `Upstream endo order submission failed for ${group.key}`,
                    },
                    { status: 502 }
                );
            }

            const orderId = String(setDataResult?.id ?? "").trim();
            if (!orderId) {
                return NextResponse.json(
                    {
                        success: false,
                        message:
                            `Endo order submitted for ${group.key} but response id is missing`,
                    },
                    { status: 502 }
                );
            }

            try {
                await callMassDelete({
                    clientID: sqlClientID,
                    basketIds: Array.from(group.basketIds),
                    tableAction,
                    method: deleteMethod,
                    s1Key: orderId,
                    appUserId: deleteAppUserId,
                    logLabel: "[endo/basket/submit]",
                });
            } catch (error) {
                if (error instanceof MassDeleteError) {
                    return NextResponse.json(
                        {
                            success: false,
                            message:
                                `Endo order submitted (${orderId}) but basket cleanup failed`,
                        },
                        { status: error.status }
                    );
                }

                throw error;
            }

            orderIds.push(orderId);
            submittedGroups.push(group.key);
        }

        const responseData: EndoBasketActionResponse = {
            success: true,
            id: orderIds[0],
            orderIds,
            message:
                `Επιτυχής καταχώρηση ενδοδιακίνησης για ${submittedGroups.join(", ")}. ` +
                `Κωδικοί παραστατικών: ${orderIds.join(", ")}`,
        };

        return NextResponse.json(responseData);
    } catch (error) {
        console.error("[endo/basket/submit] Server error", error);

        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}
