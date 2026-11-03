import axios from "axios";
import { httpClient } from "@/lib/http/client";
import type {
    PriceTierAssignResponse,
    PriceTierAssignRoutePayload,
    PriceTierGridResponse,
    PriceTierGroupsResponse,
    PriceTierSaveResponse,
    PriceTierSaveRoutePayload,
} from "@/lib/price-tiers/types";

// Failures carry the ERP's Greek message in the body, also on non-2xx
// responses, and it must reach the user unchanged.
function getPriceTierError(error: unknown, fallbackMessage: string): Error {
    if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: unknown } | undefined)
            ?.message;

        if (typeof message === "string" && message.trim()) {
            return new Error(message.trim());
        }
    }

    return error instanceof Error ? error : new Error(fallbackMessage);
}

async function postPriceTiers<T extends { success: boolean; message?: string }>(
    url: string,
    payload: unknown,
    fallbackMessage: string
): Promise<T> {
    try {
        const { data } = await httpClient.post<T>(url, payload);

        if (data?.success !== true) {
            throw new Error(data?.message?.trim() || fallbackMessage);
        }

        return data;
    } catch (error) {
        throw getPriceTierError(error, fallbackMessage);
    }
}

export function fetchPriceTierGrid() {
    return postPriceTiers<PriceTierGridResponse>(
        "/api/price-tiers",
        {},
        "Αποτυχία φόρτωσης του πλέγματος βαθμίδων."
    );
}

export function fetchPriceTierGroups() {
    return postPriceTiers<PriceTierGroupsResponse>(
        "/api/price-tiers/groups",
        {},
        "Αποτυχία φόρτωσης των ομάδων πελατών."
    );
}

export function savePriceTier(payload: PriceTierSaveRoutePayload) {
    return postPriceTiers<PriceTierSaveResponse>(
        "/api/price-tiers/save",
        payload,
        "Η αποθήκευση της βαθμίδας απέτυχε."
    );
}

export function assignCustomerPriceGroup(payload: PriceTierAssignRoutePayload) {
    return postPriceTiers<PriceTierAssignResponse>(
        "/api/price-tiers/assign",
        payload,
        "Η ανάθεση ομάδας απέτυχε."
    );
}
