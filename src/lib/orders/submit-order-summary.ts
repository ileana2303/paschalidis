import {
    getEnvString,
    getSoftOneClientID,
    getSoftOneSetDataClientID,
} from "@/lib/softone";
import { getTrdBranchByBranchCode } from "@/lib/auth/branches";
import { getOrderSubmitConfig } from "./order-submit-config";
import { submitPerLine } from "./submit-per-line";
import { submitSingleOrder } from "./submit-single-order";
import {
    jsonSafeNumber,
    normalizeSubmitLine,
    resolveIsoDate,
    validateMassDeleteSafety,
} from "./validation";
import type {
    OrderSubmitLine,
    OrderSubmitRequestBody,
    OrderSubmitType,
} from "./order-submit-types";

const DEFAULT_ORDER_SERIES = "17002";
const DEFAULT_PAYMENT = 1006;
const DEFAULT_TRUCKS = 2;
const DEFAULT_SHIPKIND = 1000;
const DEFAULT_SOCASH = 1005;
const DEFAULT_BRANCH = 1006;
const DEFAULT_INTERNAL_TRDR = 5204;
const DEFAULT_ANATROF_TRDBRANCH = 13;

type SingleOrderHeaderValues = {
    setDataBranch: number;
    trdr: number;
    trdBranch: number;
    payment: number;
    trucks: number;
    shipKind: number;
    socash: number;
    branchSec?: number;
    whouseSec?: number;
};

type SubmitBodyItem = OrderSubmitRequestBody["items"][number] & {
    BRANCH?: unknown;
    TRD_BRANCH?: unknown;
};

function getRequiredString(value: unknown, fieldName: string) {
    const parsed = String(value ?? "").trim();

    if (!parsed) {
        throw new Error(`${fieldName} is required.`);
    }

    return parsed;
}

function firstItemNumber(items: SubmitBodyItem[], keys: string[]) {
    for (const item of items) {
        for (const key of keys) {
            const parsed = jsonSafeNumber(item[key as keyof SubmitBodyItem]);

            if (parsed != null) {
                return parsed;
            }
        }
    }

    return undefined;
}

function getSubmitEnvNumber(
    submitType: OrderSubmitType,
    key: string,
    branchCode?: number
) {
    const upperSubmitType = submitType.toUpperCase();
    const candidates = [
        branchCode ? `S1_${upperSubmitType}_${key}_${branchCode}` : "",
        branchCode ? `S1_${upperSubmitType}_ORDER_${key}_${branchCode}` : "",
        branchCode && submitType === "basket" ? `S1_ORDER_${key}_${branchCode}` : "",
        `S1_${upperSubmitType}_${key}`,
        `S1_${upperSubmitType}_ORDER_${key}`,
        submitType === "basket" ? `S1_ORDER_${key}` : "",
    ].filter(Boolean);

    for (const envKey of candidates) {
        const parsed = jsonSafeNumber(getEnvString(envKey));

        if (parsed != null) {
            return parsed;
        }
    }

    return undefined;
}

function getSubmitEnvString(submitType: OrderSubmitType, key: string) {
    const upperSubmitType = submitType.toUpperCase();
    const candidates = [
        `S1_${upperSubmitType}_ORDER_${key}`,
        `S1_${upperSubmitType}_${key}`,
        submitType === "basket" ? `S1_ORDER_${key}` : "",
    ].filter(Boolean);

    for (const envKey of candidates) {
        const value = getEnvString(envKey);

        if (value) {
            return value;
        }
    }

    return "";
}

function requireHeaderNumber(
    value: number | undefined,
    fieldName: string,
    submitType: OrderSubmitType
) {
    if (value == null) {
        throw new Error(`${fieldName} is required for ${submitType} submit.`);
    }

    return value;
}

function resolveSingleOrderHeader(
    body: OrderSubmitRequestBody,
    rawItems: SubmitBodyItem[]
): SingleOrderHeaderValues {
    const branchFromItems = firstItemNumber(rawItems, [
        "branch",
        "BRANCH",
        "sourceBranch",
    ]);
    const setDataBranch =
        jsonSafeNumber(body.branchSec) ??
        getSubmitEnvNumber(body.submitType, "BRANCHSEC", branchFromItems) ??
        getSubmitEnvNumber(body.submitType, "BRANCH", branchFromItems) ??
        branchFromItems ??
        DEFAULT_BRANCH;
    const branchSec =
        body.submitType === "basket"
            ? undefined
            : jsonSafeNumber(body.branchSec) ??
                getSubmitEnvNumber(body.submitType, "BRANCHSEC", setDataBranch) ??
                setDataBranch;
    const whouseSec =
        body.submitType === "basket"
            ? undefined
            : jsonSafeNumber(body.whouseSec) ??
                getSubmitEnvNumber(body.submitType, "WHOUSESEC", branchSec) ??
                branchSec;
    const trdr =
        jsonSafeNumber(body.trdr) ??
        getSubmitEnvNumber(body.submitType, "TRDR", setDataBranch) ??
        (body.submitType === "anatrof" ? DEFAULT_INTERNAL_TRDR : undefined);
    const trdBranch =
        jsonSafeNumber(body.trdBranch) ??
        (body.submitType === "basket"
            ? getTrdBranchByBranchCode(setDataBranch)
            : undefined) ??
        firstItemNumber(rawItems, ["trdBranch", "TRD_BRANCH"]) ??
        getSubmitEnvNumber(body.submitType, "TRDBRANCH", setDataBranch) ??
        (body.submitType === "anatrof" ? DEFAULT_ANATROF_TRDBRANCH : undefined);

    return {
        setDataBranch,
        trdr: requireHeaderNumber(trdr, "TRDR", body.submitType),
        trdBranch: requireHeaderNumber(
            trdBranch,
            "TRDBRANCH",
            body.submitType
        ),
        payment:
            jsonSafeNumber(body.payment) ??
            getSubmitEnvNumber(body.submitType, "PAYMENT", setDataBranch) ??
            DEFAULT_PAYMENT,
        trucks:
            jsonSafeNumber(body.trucks) ??
            getSubmitEnvNumber(body.submitType, "TRUCKS", setDataBranch) ??
            DEFAULT_TRUCKS,
        shipKind:
            jsonSafeNumber(body.shipKind) ??
            getSubmitEnvNumber(body.submitType, "SHIPKIND", setDataBranch) ??
            DEFAULT_SHIPKIND,
        socash:
            jsonSafeNumber(body.socash) ??
            getSubmitEnvNumber(body.submitType, "SOCASH", setDataBranch) ??
            DEFAULT_SOCASH,
        branchSec,
        whouseSec,
    };
}

function getEndoHeaderForLine(
    line: {
        sourceBranch?: number;
        destinationBranch?: number;
    },
    loggedInBranch?: number
) {
    const sourceBranch = line.sourceBranch;
    const destinationBranch = line.destinationBranch;

    if (!sourceBranch || !destinationBranch) {
        throw new Error("ENDO line is missing source or destination branch.");
    }

    const setDataClientID = getSoftOneSetDataClientID(sourceBranch, {
        endo: true,
    });

    if (!setDataClientID) {
        throw new Error(
            `S1 setData client is not configured for ENDO source branch ${sourceBranch}.`
        );
    }

    const branchSec = loggedInBranch ?? sourceBranch;
    const trdr =
        getSubmitEnvNumber("endo", "TRDR", destinationBranch) ??
        jsonSafeNumber(getEnvString("S1_ENDO_TRDR")) ??
        DEFAULT_INTERNAL_TRDR;
    const trdBranch =
        getSubmitEnvNumber("endo", "TRDBRANCH", destinationBranch) ??
        jsonSafeNumber(getEnvString("S1_ENDO_TRDBRANCH")) ??
        getTrdBranchByBranchCode(destinationBranch);
    const socash =
        getSubmitEnvNumber("endo", "SOCASH", destinationBranch) ??
        jsonSafeNumber(getEnvString("S1_ENDO_SOCASH"));
    const trucks =
        getSubmitEnvNumber("endo", "TRUCKS", sourceBranch) ??
        jsonSafeNumber(getEnvString("S1_ENDO_TRUCKS"));

    if (!trdBranch) {
        throw new Error(
            `Cannot resolve ENDO TRDBRANCH for TO_BRANCH ${destinationBranch}.`
        );
    }

    if (!socash) {
        throw new Error(`S1_ENDO_SOCASH is missing for branch ${destinationBranch}.`);
    }

    if (!trucks) {
        throw new Error(`S1_ENDO_TRUCKS is missing for branch ${sourceBranch}.`);
    }

    return {
        setDataClientID,
        trdr,
        trdBranch,
        payment: destinationBranch,
        shipKind: sourceBranch,
        branchSec,
        whouseSec: branchSec,
        trucks,
        socash,
    };
}

export async function submitOrderSummary(body: OrderSubmitRequestBody) {
    const config = getOrderSubmitConfig(body.submitType);

    if (!config) {
        throw new Error("Invalid submit type.");
    }

    validateMassDeleteSafety({
        submitType: config.submitType,
        tableAction: config.tableAction,
    });

    const sqlClientID = getSoftOneClientID();

    if (!sqlClientID) {
        throw new Error("S1 SQL client is not configured.");
    }

    const appUserId = getRequiredString(body.appUserId, "App user id");
    const rawItems = Array.isArray(body.items)
        ? (body.items as SubmitBodyItem[])
        : [];

    if (!rawItems.length) {
        throw new Error("Basket is empty. Add items before submitting.");
    }

    const lines = rawItems
        .map((item) => normalizeSubmitLine(item, config.submitType))
        .filter((line): line is OrderSubmitLine => line !== null);

    if (!lines.length) {
        throw new Error("No valid lines to submit.");
    }

    const deliveryDate = resolveIsoDate(body.deliveryDate);
    const remarks = String(body.notes ?? "").trim();
    const series =
        getSubmitEnvString(config.submitType, "SERIES") || DEFAULT_ORDER_SERIES;

    if (config.submitMode === "per-line") {
        const loggedInBranch =
            jsonSafeNumber(body.branchSec) ??
            jsonSafeNumber(body.whouseSec);

        return submitPerLine({
            submitType: config.submitType,
            sqlClientID,
            endpointEnvKey: config.setDataEndpointEnvKey,
            comments: config.comments,
            tableAction: config.tableAction,
            method: config.massDeleteMethod,
            appUserId,
            series,
            deliveryDate,
            remarks,
            lines,
            resolvePerLineHeader: ({ line }) =>
                getEndoHeaderForLine(line, loggedInBranch),
        });
    }

    const header = resolveSingleOrderHeader(body, rawItems);
    const setDataClientID = getSoftOneSetDataClientID(header.setDataBranch);

    if (!setDataClientID) {
        throw new Error("S1 setData client is not configured.");
    }

    return submitSingleOrder({
        submitType: config.submitType,
        setDataClientID,
        sqlClientID,
        endpointEnvKey: config.setDataEndpointEnvKey,
        comments: config.comments,
        tableAction: config.tableAction,
        method: config.massDeleteMethod,
        appUserId,
        series,
        deliveryDate,
        remarks,
        lines,
        trdr: header.trdr,
        trdBranch: header.trdBranch,
        payment: header.payment,
        trucks: header.trucks,
        shipKind: header.shipKind,
        socash: header.socash,
        branchSec: header.branchSec,
        whouseSec: header.whouseSec,
    });
}
