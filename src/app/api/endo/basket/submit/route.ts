import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import type {
    EndoBasketActionResponse,
    EndoBasketSubmitLineRoutePayload,
    EndoBasketSubmitRoutePayload,
} from "@/lib/interface";
import { callMassDelete, MassDeleteError } from "@/app/api/mass-delete/mass-delete";

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

type BuildSetDataPayloadParams = {
    group: EndoGroup;
    setDataClientID: string;
    orderSeries: string;
    orderTaxSeries: string;
    orderSeriesNum: string;
    orderTrdr: number;
    orderTrdBranch: number;
    orderSocash: number;
    orderTrucks: number;
    deliveryDate: string;
    comments: string;
    remarks: string;
    orderLines: Array<{
        MTRL: number;
        QTY1: number;
    }>;
};

function sanitizeEnvValue(value: string | undefined) {
    return value?.trim().replace(/^['"]|['"]$/g, "") ?? "";
}

function getEnvString(name: string) {
    return sanitizeEnvValue(process.env[name]);
}

function jsonError(message: string, status = 500) {
    return NextResponse.json({ success: false, message }, { status });
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

function getPerBranchNumericEnv(baseKey: string, branchCode: number) {
    const fromBranchSpecific = asPositiveNumber(getEnvString(`${baseKey}_${branchCode}`));
    if (fromBranchSpecific != null) {
        return fromBranchSpecific;
    }

    const fromDefault = asPositiveNumber(getEnvString(baseKey));
    if (fromDefault != null) {
        return fromDefault;
    }
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

function buildSetDataPayload({
    group,
    setDataClientID,
    orderSeries,
    orderTaxSeries,
    orderSeriesNum,
    orderTrdr,
    orderTrdBranch,
    orderSocash,
    orderTrucks,
    deliveryDate,
    comments,
    remarks,
    orderLines,
}: BuildSetDataPayloadParams): SetDataOrderPayload {
    return {
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
}

export async function POST(req: NextRequest) {
    try {
        const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
        if (!sessionCookie?.trim()) {
            return jsonError("Unauthorized", 401);
        }

        const body = await req.json() as EndoBasketSubmitRoutePayload;
        const items = Array.isArray(body.items) ? body.items : [];

        if (items.length === 0) {
            return jsonError(
                "Endo basket is empty. Add items before submitting.",
                400
            );
        }

        const sqlClientID = getSqlClientID();
        if (!sqlClientID) {
            return jsonError("S1 SQL client is not configured");
        }

        const appUserId = String(body.appUserId ?? "").trim();
        if (!appUserId) {
            return jsonError("App user id is required", 400);
        }

        const deliveryDate = resolveIsoDate(body.deliveryDate);
        const userNotes = String(body.notes ?? "").trim();
        const groups = groupEndoLines(items);

        if (groups.length === 0) {
            return jsonError("No valid endo lines to submit.", 400);
        }

        const orderIds: string[] = [];
        const submittedGroups: string[] = [];
        const s1Endpoint =
            getEnvString("S1_ENDO_ENDPOINT") || getEnvString("S1_ENDPOINT");
        if (!s1Endpoint) {
            return jsonError("S1 endpoint is not configured");
        }

        const tableAction = getEnvString("S1_ENDO_MASS_DELETE_TABLE_ACTION");
        if (!tableAction) {
            return jsonError("S1 endo mass delete table action is not configured");
        }

        const deleteMethod = getEnvString("S1_ENDO_MASS_DELETE_METHOD");
        if (!deleteMethod) {
            return jsonError("S1 endo mass delete method is not configured");
        }

        const deleteAppUserId =
            getEnvString("S1_ENDO_MASS_DELETE_APPUSER_ID") || appUserId;

        for (const group of groups) {
            const setDataClientID = getSetDataClientID(String(group.sourceBranch));
            if (!setDataClientID) {
                return jsonError(
                    `S1 setData client is not configured for source branch ${group.sourceBranch}`
                );
            }

            const orderSeries = getEnvString("S1_ENDO_ORDER_SERIES");
            if (!orderSeries) {
                return jsonError("S1 endo order series is not configured");
            }

            const orderTaxSeries = getEnvString("S1_ENDO_ORDER_TAXSERIES");
            if (!orderTaxSeries) {
                return jsonError("S1 endo order tax series is not configured");
            }

            const orderSeriesNum = getPerBranchStringEnv(
                "S1_ENDO_ORDER_SERIESNUM",
                group.sourceBranch
            );
            const orderTrdr = getPerBranchNumericEnv(
                "S1_ENDO_TRDR",
                group.destinationBranch
            );
            if (orderTrdr == null) {
                return jsonError(
                    `S1_ENDO_TRDR is not configured for destination branch ${group.destinationBranch}`
                );
            }

            const orderTrdBranch = getPerBranchNumericEnv(
                "S1_ENDO_TRDBRANCH",
                group.destinationBranch
            );
            if (orderTrdBranch == null) {
                return jsonError(
                    `S1_ENDO_TRDBRANCH is not configured for destination branch ${group.destinationBranch}`
                );
            }

            const orderSocash = getPerBranchNumericEnv(
                "S1_ENDO_SOCASH",
                group.destinationBranch
            );
            if (orderSocash == null) {
                return jsonError(
                    `S1_ENDO_SOCASH is not configured for destination branch ${group.destinationBranch}`
                );
            }

            const orderTrucks = getPerBranchNumericEnv(
                "S1_ENDO_TRUCKS",
                group.sourceBranch
            );
            if (orderTrucks == null) {
                return jsonError(
                    `S1_ENDO_TRUCKS is not configured for source branch ${group.sourceBranch}`
                );
            }

            const comments =
                userNotes ||
                `ΕΝΔΟ ${group.sourceBranch} -> ${group.destinationBranch}`;
            const remarks = getEnvString("S1_ENDO_ORDER_REMARKS");

            const orderLines = Array.from(group.linesByMtrl.entries()).map(
                ([MTRL, QTY1]) => ({ MTRL, QTY1 })
            );

            if (orderLines.length === 0) {
                return jsonError(`No valid lines for group ${group.key}`, 400);
            }

            if (group.basketIds.size === 0) {
                return jsonError(
                    `Unable to resolve basket ids for group ${group.key}`,
                    400
                );
            }

            const setDataPayload = buildSetDataPayload({
                group,
                setDataClientID,
                orderSeries,
                orderTaxSeries,
                orderSeriesNum,
                orderTrdr,
                orderTrdBranch,
                orderSocash,
                orderTrucks,
                deliveryDate,
                comments,
                remarks,
                orderLines,
            });

            const setDataResponse = await fetch(s1Endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(setDataPayload),
            });

            if (!setDataResponse.ok) {
                const errorText = await setDataResponse.text();
                console.error("[endo/basket/submit] setData error body:", errorText);

                return jsonError(
                    `Upstream endo order submission failed for ${group.key}`,
                    setDataResponse.status
                );
            }

            const setDataResult = await parseJsonWithEncodingFallback(setDataResponse) as {
                success?: boolean;
                message?: string;
                id?: string | number;
            };

            if (setDataResult?.success === false) {
                return jsonError(
                    setDataResult.message ??
                        `Upstream endo order submission failed for ${group.key}`,
                    502
                );
            }

            const orderId = String(setDataResult?.id ?? "").trim();
            if (!orderId) {
                return jsonError(
                    `Endo order submitted for ${group.key} but response id is missing`,
                    502
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
                    return jsonError(
                        `Endo order submitted (${orderId}) but basket cleanup failed`,
                        error.status
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

        return jsonError("Server error");
    }
}
