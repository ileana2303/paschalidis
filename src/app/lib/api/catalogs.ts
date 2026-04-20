import { ProductsResponse } from "../interface";
import { httpClient } from "@/lib/http/client";

export async function fetchCatalogProducts(
    page: number,
    pageSize: number
): Promise<ProductsResponse> {
    const { data } = await httpClient.post<ProductsResponse>(
        "/api/catalogs/products",
        { page, pageSize }
    );
    return data;
}
