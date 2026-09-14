import {
    getSoftOneEndpoint,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";
import type { SetDataEnvelope } from "./setdata-envelope";

type PostSetDataDocumentParams = {
    payload: SetDataEnvelope<unknown>;
    endpointEnvKey: string;
    logLabel: string;
    failureMessage: string;
    missingIdMessage: string;
};

type SetDataResult = {
    success?: boolean;
    message?: string;
    id?: string | number;
};

function forLogging(payload: SetDataEnvelope<unknown>) {
    return {
        ...payload,
        clientID: `***${payload.clientID.slice(-6)} (len ${payload.clientID.length})`,
    };
}

export async function postSetDataDocument({
    payload,
    endpointEnvKey,
    logLabel,
    failureMessage,
    missingIdMessage,
}: PostSetDataDocumentParams): Promise<string> {
    const endpoint = getSoftOneEndpoint({ endpointEnvKey });

    console.info(
        `${logLabel} setData -> ${endpoint} (${endpointEnvKey})`,
        JSON.stringify(forLogging(payload))
    );

    const response = await postSoftOne(payload, { endpoint });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`${logLabel} setData error body:`, errorText);

        throw new Error(failureMessage);
    }

    const result = (await parseJsonWithEncodingFallback(
        response
    )) as SetDataResult;

    if (result.success === false) {
        console.error(`${logLabel} setData rejected:`, result.message);

        throw new Error(result.message || failureMessage);
    }

    const documentId = String(result.id ?? "").trim();

    if (!documentId) {
        throw new Error(missingIdMessage);
    }

    console.info(`${logLabel} setData ok, S1 id ${documentId}`);

    return documentId;
}
