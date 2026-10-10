import { httpClient } from "@/lib/http/client";
import type {
  CloseSupplierPriceBatchResponse,
  OpenSupplierPriceBatchResponse,
  SaveSupplierPriceBatchResponse,
  SupplierPriceRow,
  UploadSupplierPriceCatalogRequest,
  UploadSupplierPriceCatalogResponse,
} from "@/lib/supplier-price-catalog/types";

export async function openSupplierPriceCatalogBatch(payload: {
  supplier: UploadSupplierPriceCatalogRequest["supplier"];
  descr: string;
  filePath: string;
  prefixes: string;
}) {
  const { data } = await httpClient.post<OpenSupplierPriceBatchResponse>(
    "/api/supplier-price-catalog/batch/open",
    payload
  );

  if (!data.success || !data.batchId) {
    throw new Error(data.message ?? "Αποτυχία ανοίγματος batch.");
  }

  return data.batchId;
}

export async function saveSupplierPriceCatalogChunk(payload: {
  batchId: number;
  rowOffset: number;
  rows: SupplierPriceRow[];
}) {
  const { data } = await httpClient.post<SaveSupplierPriceBatchResponse>(
    "/api/supplier-price-catalog/batch/save",
    payload
  );

  if (!data.success) {
    throw new Error(data.message ?? "Αποτυχία αποθήκευσης γραμμών τιμών.");
  }
}

export async function closeSupplierPriceCatalogBatch(batchId: number) {
  const { data } = await httpClient.post<CloseSupplierPriceBatchResponse>(
    "/api/supplier-price-catalog/batch/close",
    { batchId }
  );

  if (!data.success) {
    throw new Error(data.message ?? "Αποτυχία κλεισίματος batch.");
  }
}

export async function uploadSupplierPriceCatalog(
  payload: UploadSupplierPriceCatalogRequest
): Promise<UploadSupplierPriceCatalogResponse> {
  const { data } = await httpClient.post<UploadSupplierPriceCatalogResponse>(
    "/api/supplier-price-catalog/upload",
    payload
  );

  if (!data.success) {
    throw new Error(data.message ?? "Αποτυχία ανέβασματος τιμοκαταλόγου.");
  }

  return data;
}
