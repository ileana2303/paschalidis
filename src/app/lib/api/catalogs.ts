import { ProductsResponse } from "../interface";

export async function fetchCatalogProducts(
    page: number,
    pageSize: number
): Promise<ProductsResponse> {
    const res = await fetch("/api/catalogs/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page, pageSize }),
    });

    if (!res.ok) {
        throw new Error("Failed to fetch catalog products");
    }

    return res.json();
}
