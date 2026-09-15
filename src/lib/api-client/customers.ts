import axios from "axios";
import {
    ICustomerInfo,
    ApiResponse,
    CustomerByTrdrResponse,
    CustomerByTrdrRoutePayload,
} from "@/lib/interface";
import { httpClient } from "@/lib/http/client";

export async function searchCustomers(
    search: string
): Promise<ApiResponse<ICustomerInfo>> {
    const { data } = await httpClient.post<ApiResponse<ICustomerInfo>>(
        "/api/customers/search",
        { search }
    );

    if (!data?.success) {
        throw new Error(data.message ?? 'Αποτυχία αναζήτησης πελατών.');
    }

    return data;
}

// Fetches the complete customer record for a TRDR. The name is only a hint that
// helps the route search the ERP - the returned row is always matched on TRDR.
export async function fetchCustomerByTrdr({
    trdr,
    name,
}: CustomerByTrdrRoutePayload): Promise<ICustomerInfo> {
    const normalizedTrdr = String(trdr ?? "").trim();
    const fallbackMessage = `Δεν βρέθηκαν τα στοιχεία του πελάτη TRDR ${normalizedTrdr}.`;

    if (!normalizedTrdr) {
        throw new Error('Απαιτείται το αναγνωριστικό πελάτη (TRDR).');
    }

    try {
        const { data } = await httpClient.post<CustomerByTrdrResponse>(
            "/api/customers/by-trdr",
            { trdr: normalizedTrdr, name: name?.trim() || undefined }
        );

        if (!data?.success || !data.customer) {
            throw new Error(data?.message?.trim() || fallbackMessage);
        }

        return data.customer;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const message = (error.response?.data as CustomerByTrdrResponse | undefined)
                ?.message;

            throw new Error(
                typeof message === "string" && message.trim() ? message : fallbackMessage
            );
        }

        throw error;
    }
}
