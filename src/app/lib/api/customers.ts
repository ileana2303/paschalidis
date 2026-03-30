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

    if (!res.ok) {
        throw new Error("Failed to fetch customers");
    }

    return res.json();
}