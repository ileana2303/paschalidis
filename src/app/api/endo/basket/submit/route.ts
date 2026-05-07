import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
    getEnvString,
    getSoftOneClientID,
    getSoftOneEndpoint,
    getSoftOneSetDataClientID,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";
import type {
    EndoBasketActionResponse,
    EndoBasketSubmitLineRoutePayload,
    EndoBasketSubmitRoutePayload,
} from "@/lib/interface";
import { callMassDelete, MassDeleteError } from "@/app/api/mass-delete/mass-delete";

const DEFAULT_DELETE_TABLE_ACTION = "USRCUST";
const DEFAULT_DELETE_METHOD = "LINK_S1";

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

type EndoLine = {
    key: string;
    basketId: string;
    sourceBranch: number;
    destinationBranch: number;
    mtrl: number;
    qty: number;
};

type BuildSetDataPayloadParams = {
    line: EndoLine;
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
};

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

function normalizeEndoLine(
    item: EndoBasketSubmitLineRoutePayload
): EndoLine | null {
    const mtrl = asPositiveNumber(item.mtrl);
    const qty = asPositiveNumber(item.qty);
    const destinationBranch = asPositiveNumber(item.branch);
    const sourceBranch = asPositiveNumber(item.toBranch);
    const basketId =
        (item.basketIds ?? [])
            .map((rawBasketId) => String(rawBasketId ?? "").trim())
            .find(Boolean) ?? "";

    if (!mtrl || !qty || !destinationBranch || !sourceBranch || !basketId) {
        return null;
    }

    if (destinationBranch === sourceBranch) {
        return null;
    }

    return {
        key: `${basketId}:${sourceBranch}-${destinationBranch}:${mtrl}`,
        basketId,
        sourceBranch,
        destinationBranch,
        mtrl,
        qty,
    };
}

function buildSetDataPayload({
    line,
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
                    PAYMENT: line.destinationBranch,
                    SERIESNUM: orderSeriesNum,
                    TRUCKS: orderTrucks,
                    DELIVDATE: deliveryDate,
                    COMMENTS: comments,
                    REMARKS: remarks,
                    SHIPKIND: line.sourceBranch,
                    SOCASH: orderSocash,
                },
            ],
            MTRDOC: [
                {
                    TRUCKS: orderTrucks,
                    DELIVDATE: deliveryDate,
                    DEPTRDR_CUSTOMER_CODE: "",
                    BILLTRDR_CUSTOMER_CODE: "",
                    BRANCHSEC: line.destinationBranch,
                    WHOUSESEC: line.destinationBranch,
                },
            ],
            ITELINES: [
                {
                    MTRL: line.mtrl,
                    QTY1: line.qty,
                },
            ],
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

        const sqlClientID = getSoftOneClientID();
        if (!sqlClientID) {
            return jsonError("S1 SQL client is not configured");
        }

        const appUserId = String(body.appUserId ?? "").trim();
        if (!appUserId) {
            return jsonError("App user id is required", 400);
        }

        const deliveryDate = resolveIsoDate(body.deliveryDate);
        const userNotes = String(body.notes ?? "").trim();
        const lines = items
            .map((item) => normalizeEndoLine(item))
            .filter((line): line is EndoLine => line !== null);

        if (lines.length === 0) {
            return jsonError("No valid endo lines to submit.", 400);
        }

        const orderIds: string[] = [];
        const submittedBasketIds: string[] = [];
        const s1Endpoint = getSoftOneEndpoint({
            endpointEnvKey: "S1_ENDO_ENDPOINT",
        });

        const tableAction =
            getEnvString("S1_ENDO_MASS_DELETE_TABLE_ACTION") ||
            getEnvString("S1_MASS_DELETE_TABLE_ACTION") ||
            DEFAULT_DELETE_TABLE_ACTION;
        const deleteMethod =
            getEnvString("S1_ENDO_MASS_DELETE_METHOD") ||
            getEnvString("S1_MASS_DELETE_METHOD") ||
            DEFAULT_DELETE_METHOD;

        const deleteAppUserId =
            getEnvString("S1_ENDO_MASS_DELETE_APPUSER_ID") ||
            getEnvString("S1_MASS_DELETE_APPUSER_ID") ||
            appUserId;

        for (const line of lines) {
            const setDataClientID = getSoftOneSetDataClientID(line.sourceBranch, {
                endo: true,
            });
            if (!setDataClientID) {
                return jsonError(
                    `S1 setData client is not configured for source branch ${line.sourceBranch}`
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
                line.sourceBranch
            );
            const orderTrdr = getPerBranchNumericEnv(
                "S1_ENDO_TRDR",
                line.destinationBranch
            );
            if (orderTrdr == null) {
                return jsonError(
                    `S1_ENDO_TRDR is not configured for destination branch ${line.destinationBranch}`
                );
            }

            const orderTrdBranch = getPerBranchNumericEnv(
                "S1_ENDO_TRDBRANCH",
                line.destinationBranch
            );
            if (orderTrdBranch == null) {
                return jsonError(
                    `S1_ENDO_TRDBRANCH is not configured for destination branch ${line.destinationBranch}`
                );
            }

            const orderSocash = getPerBranchNumericEnv(
                "S1_ENDO_SOCASH",
                line.destinationBranch
            );
            if (orderSocash == null) {
                return jsonError(
                    `S1_ENDO_SOCASH is not configured for destination branch ${line.destinationBranch}`
                );
            }

            const orderTrucks = getPerBranchNumericEnv(
                "S1_ENDO_TRUCKS",
                line.sourceBranch
            );
            if (orderTrucks == null) {
                return jsonError(
                    `S1_ENDO_TRUCKS is not configured for source branch ${line.sourceBranch}`
                );
            }

            const comments =
                userNotes ||
                `ΕΝΔΟ ${line.sourceBranch} -> ${line.destinationBranch}`;
            const remarks = getEnvString("S1_ENDO_ORDER_REMARKS");

            const setDataPayload = buildSetDataPayload({
                line,
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
            });

            const setDataResponse = await postSoftOne(setDataPayload, {
                endpoint: s1Endpoint,
            });

            if (!setDataResponse.ok) {
                const errorText = await setDataResponse.text();
                console.error("[endo/basket/submit] setData error body:", errorText);

                return jsonError(
                    `Upstream endo order submission failed for ${line.key}`,
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
                        `Upstream endo order submission failed for ${line.key}`,
                    502
                );
            }

            const orderId = String(setDataResult?.id ?? "").trim();
            if (!orderId) {
                return jsonError(
                    `Endo order submitted for ${line.key} but response id is missing`,
                    502
                );
            }

            try {
                await callMassDelete({
                    clientID: sqlClientID,
                    basketIds: [line.basketId],
                    tableAction,
                    method: deleteMethod,
                    s1Key: orderId,
                    appUserId: deleteAppUserId,
                    logLabel: "[endo/basket/submit]",
                });
            } catch (error) {
                if (error instanceof MassDeleteError) {
                    return jsonError(
                        `Endo order submitted (${orderId}) but basket cleanup failed for basket ${line.basketId}`,
                        error.status
                    );
                }

                throw error;
            }

            orderIds.push(orderId);
            submittedBasketIds.push(line.basketId);
        }

        const responseData: EndoBasketActionResponse = {
            success: true,
            id: orderIds[0],
            orderIds,
            message:
                `Επιτυχής καταχώρηση ενδοδιακίνησης για BASKETID ${submittedBasketIds.join(", ")}. ` +
                `Κωδικοί παραστατικών: ${orderIds.join(", ")}`,
        };

        return NextResponse.json(responseData);
    } catch (error) {
        console.error("[endo/basket/submit] Server error", error);

        return jsonError("Server error");
    }
}
