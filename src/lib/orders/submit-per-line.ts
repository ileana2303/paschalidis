import { callMassDelete } from "@/app/api/mass-delete/mass-delete";
import {
    getSoftOneEndpoint,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";
import { buildSetDataPayload } from "./build-setdata-payload";
import { validateBasketIds } from "./validation";
import type {
    MassDeleteTableAction,
    OrderSubmitLine,
    OrderSubmitType,
} from "./order-submit-types";

type ResolvePerLineHeaderParams = {
    line: OrderSubmitLine;
};

type PerLineHeaderValues = {
    setDataClientID: string;
    trdr: number;
    trdBranch: number;
    payment: number;
    trucks: number;
    shipKind: number;
    socash?: number;
    branchSec?: number;
    whouseSec?: number;
};

type SubmitPerLineParams = {
    submitType: OrderSubmitType;
    sqlClientID: string;
    endpointEnvKey?: string;
    comments: string;
    tableAction: MassDeleteTableAction;
    method: "LINK_S1";
    appUserId: string;
    series: string;
    deliveryDate: string;
    remarks: string;
    lines: OrderSubmitLine[];
    resolvePerLineHeader: (
        params: ResolvePerLineHeaderParams
    ) => PerLineHeaderValues;
};

export async function submitPerLine(params: SubmitPerLineParams) {
    const orderIds: string[] = [];
    const submittedBasketIds: string[] = [];
    const endpoint = params.endpointEnvKey
        ? getSoftOneEndpoint({ endpointEnvKey: params.endpointEnvKey })
        : undefined;

    for (const line of params.lines) {
        validateBasketIds([line.basketId]);

        const header = params.resolvePerLineHeader({ line });
        const setDataPayload = buildSetDataPayload({
            clientID: header.setDataClientID,
            series: params.series,
            trdr: header.trdr,
            trdBranch: header.trdBranch,
            payment: header.payment,
            trucks: header.trucks,
            deliveryDate: params.deliveryDate,
            comments: params.comments,
            remarks: params.remarks,
            shipKind: header.shipKind,
            socash: header.socash,
            branchSec: header.branchSec,
            whouseSec: header.whouseSec,
            lines: [line],
        });

        const setDataResponse = await postSoftOne(setDataPayload, {
            endpoint,
        });

        if (!setDataResponse.ok) {
            const errorText = await setDataResponse.text();
            console.error("[orders/submit/per-line] setData error body:", errorText);

            throw new Error(
                `SoftOne ENDO submission failed for basket ${line.basketId}.`
            );
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
                setDataResult.message ||
                    `SoftOne ENDO submission failed for basket ${line.basketId}.`
            );
        }

        const orderId = String(setDataResult.id ?? "").trim();

        if (!orderId) {
            throw new Error(
                `ENDO order submitted for basket ${line.basketId}, but response id is missing.`
            );
        }

        await callMassDelete({
            clientID: params.sqlClientID,
            basketIds: [line.basketId],
            tableAction: params.tableAction,
            method: params.method,
            s1Key: orderId,
            appUserId: params.appUserId,
            logLabel: `[orders/submit/${params.submitType}]`,
            submitType: params.submitType,
        });

        orderIds.push(orderId);
        submittedBasketIds.push(line.basketId);
    }

    return {
        success: true,
        id: orderIds[0],
        orderIds,
        basketIds: submittedBasketIds,
    };
}
