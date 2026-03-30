import { IItem, ApiResponse } from "../interface";

export async function searchItems(
    search: string
): Promise<ApiResponse<IItem>> {
    const res = await fetch("/api/items/search", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ search }),
    });

    if (!res.ok) {
        throw new Error("Failed to fetch items");
    }

    return res.json();
}