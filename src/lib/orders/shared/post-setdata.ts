import {
    getSoftOneEndpoint,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";
import type { SetDataEnvelope, SetDataObject } from "./setdata-envelope";

type PostSetDataDocumentParams = {
    payload: SetDataEnvelope<unknown, SetDataObject>;
    endpointEnvKey: string;
    logLabel: string;
    failureMessage: string;
    missingIdMessage: string;
};

type SetDataResult = {
    success?: boolean;
    message?: string;
    /** SoftOne puts the rejection reason here, not in `message`. */
    error?: string;
    errorcode?: number | string;
    id?: string | number;
};

function forLogging(payload: SetDataEnvelope<unknown, SetDataObject>) {
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
        console.error(
            `${logLabel} setData HTTP ${response.status} error body:`,
            errorText
        );

        // Surface SoftOne's reason in the UI instead of only the generic message.
        const detail = errorText.replace(/\s+/g, " ").trim().slice(0, 300);

        throw new Error(
            `${failureMessage} (HTTP ${response.status}${detail ? `: ${detail}` : ""})`
        );
    }

    const result = (await parseJsonWithEncodingFallback(
        response
    )) as SetDataResult;

    if (result.success === false) {
        console.error(`${logLabel} setData rejected:`, JSON.stringify(result));

        const reason = String(result.error ?? result.message ?? "").trim();
        const code =
            result.errorcode !== undefined ? ` [${result.errorcode}]` : "";

        throw new Error(
            reason ? `${failureMessage}: ${reason}${code}` : `${failureMessage}${code}`
        );
    }

    const documentId = String(result.id ?? "").trim();

    if (!documentId) {
        throw new Error(missingIdMessage);
    }

    console.info(`${logLabel} setData ok, S1 id ${documentId}`);

    return documentId;
}
