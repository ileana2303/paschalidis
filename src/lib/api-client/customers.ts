import { ICustomerInfo, ApiResponse } from "@/lib/interface";
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
