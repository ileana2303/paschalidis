import { ICustomerInfo, ApiResponse } from "../interface";

export async function searchCustomers(
    search: string
): Promise<ApiResponse<ICustomerInfo>> {
    const res = await fetch("/api/customers/search", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ search }),
    });

    const data: ApiResponse<ICustomerInfo> = await res.json();

    if (!res.ok) {
        throw new Error(data.message ?? "Failed to fetch customers");
    }

    if (!data.success) {
        throw new Error(data.message ?? "Failed to fetch customers");
    }

    return data;
}
