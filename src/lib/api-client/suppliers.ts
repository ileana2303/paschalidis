import type { SupplierSearchResponse } from "@/lib/interface";
import { httpClient } from "@/lib/http/client";

export async function searchSuppliers(search: string) {
    const { data } = await httpClient.post<SupplierSearchResponse>(
        "/api/suppliers/search",
        { search }
    );

    if (!data?.success) {
        throw new Error(data.message ?? "Αποτυχία αναζήτησης προμηθευτών.");
    }

    return data;
}
