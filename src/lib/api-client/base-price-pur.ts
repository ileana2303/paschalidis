import { httpClient } from "@/lib/http/client";
import type {
    BasePricePurApplyResponse,
    BasePricePurApplyRoutePayload,
    BasePricePurItemsResponse,
    BasePricePurItemsRoutePayload,
    BasePricePurListResponse,
} from "@/lib/base-price-pur/types";

export async function fetchBasePricePurList(): Promise<BasePricePurListResponse> {
    const { data } = await httpClient.post<BasePricePurListResponse>(
        "/api/base-price-pur",
        {}
    );

    if (!data.success) {
        throw new Error(data.message ?? "Αποτυχία φόρτωσης διαμόρφωσης τιμών.");
    }

    return data;
}

export async function fetchBasePricePurItems(
    payload: BasePricePurItemsRoutePayload
): Promise<BasePricePurItemsResponse> {
    const { data } = await httpClient.post<BasePricePurItemsResponse>(
        "/api/base-price-pur/items",
        payload
    );

    if (!data.success) {
        throw new Error(data.message ?? "Αποτυχία φόρτωσης γραμμών παραστατικού.");
    }

    return data;
}

export async function applyBasePricePurDocument(
    payload: BasePricePurApplyRoutePayload
): Promise<BasePricePurApplyResponse> {
    const { data } = await httpClient.post<BasePricePurApplyResponse>(
        "/api/base-price-pur/apply",
        payload
    );

    if (!data.success) {
        throw new Error(data.message ?? "Αποτυχία εφαρμογής τιμών.");
    }

    return data;
}
