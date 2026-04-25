import { httpClient } from "@/lib/http/client";
import type {
    EndoBasketActionResponse,
    EndoBasketAddRoutePayload,
    EndoBasketSubmitRoutePayload,
} from "../interface";

export async function addItemToEndoBasket(
    payload: EndoBasketAddRoutePayload
): Promise<EndoBasketActionResponse> {
    const { data } = await httpClient.post<EndoBasketActionResponse>(
        "/api/endo/basket/add-item",
        payload
    );

    if (!data.success) {
        throw new Error(data.message ?? "Failed to add item to endo basket");
    }

    return data;
}

export async function submitEndoBasketOrder(
    payload: EndoBasketSubmitRoutePayload
): Promise<EndoBasketActionResponse> {
    const { data } = await httpClient.post<EndoBasketActionResponse>(
        "/api/endo/basket/submit",
        payload
    );

    if (!data.success) {
        throw new Error(data.message ?? "Failed to submit endo order");
    }

    return data;
}
