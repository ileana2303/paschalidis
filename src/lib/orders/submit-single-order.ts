import { callMassDelete } from "@/app/api/mass-delete/mass-delete";
import {
    getSoftOneEndpoint,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";
import { buildSetDataPayload } from "./build-setdata-payload";
import { uniqueBasketIds } from "./validation";
import type {
    MassDeleteTableAction,
    OrderSubmitLine,
    OrderSubmitType,
} from "./order-submit-types";

type SubmitSingleOrderParams = {
    submitType: OrderSubmitType;
    setDataClientID: string;
    sqlClientID: string;
    endpointEnvKey?: string;
    comments: string;
    tableAction: MassDeleteTableAction;
    method: "LINK_S1";
    appUserId: string;
    series: string;
    trdr: number;
    trdBranch: number;
    payment: number;
    trucks: number;
    deliveryDate: string;
    remarks: string;
    shipKind: number;
    socash: number;
    branchSec?: number;
    whouseSec?: number;
    lines: OrderSubmitLine[];
};

export async function submitSingleOrder(params: SubmitSingleOrderParams) {
    const basketIds = uniqueBasketIds(params.lines);
    const setDataPayload = buildSetDataPayload({
        clientID: params.setDataClientID,
        series: params.series,
        trdr: params.trdr,
        trdBranch: params.trdBranch,
        payment: params.payment,
        trucks: params.trucks,
        deliveryDate: params.deliveryDate,
        comments: params.comments,
        remarks: params.remarks,
        shipKind: params.shipKind,
        socash: params.socash,
        branchSec: params.branchSec,
        whouseSec: params.whouseSec,
        lines: params.lines,
    });

    const endpoint = params.endpointEnvKey
        ? getSoftOneEndpoint({ endpointEnvKey: params.endpointEnvKey })
        : undefined;

    const setDataResponse = await postSoftOne(setDataPayload, {
        endpoint,
    });

    if (!setDataResponse.ok) {
        const errorText = await setDataResponse.text();
        console.error("[orders/submit] setData error body:", errorText);

        throw new Error("SoftOne order submission failed.");
    }

    const setDataResult = (await parseJsonWithEncodingFallback(
        setDataResponse
    )) as {
        success?: boolean;
        message?: string;
        id?: string | number;
    };

    if (setDataResult.success === false) {
        throw new Error(
            setDataResult.message || "SoftOne order submission failed."
        );
    }

    const orderId = String(setDataResult.id ?? "").trim();

    if (!orderId) {
        throw new Error("SoftOne order was submitted but response id is missing.");
    }

    await callMassDelete({
        clientID: params.sqlClientID,
        basketIds,
        tableAction: params.tableAction,
        method: params.method,
        s1Key: orderId,
        appUserId: params.appUserId,
        logLabel: `[orders/submit/${params.submitType}]`,
        submitType: params.submitType,
    });

    return {
        success: true,
        id: orderId,
        orderIds: [orderId],
        basketIds,
    };
}
