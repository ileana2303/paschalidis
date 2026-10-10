import { SUPPLIER_PRICE_SAVE_CHUNK_SIZE } from "@/lib/supplier-price-catalog/constants";
import { getSupplierPriceBatchEndpoint } from "@/lib/supplier-price-catalog/batch-endpoints";
import type {
  OpenSupplierPriceBatchPayload,
  SupplierPriceRow,
} from "@/lib/supplier-price-catalog/types";
import {
  getSoftOneClientID,
  parseJsonWithEncodingFallback,
  postSoftOne,
} from "@/lib/softone";

type SoftOneBatchJson = {
  success?: boolean;
  batchId?: number;
  message?: string;
  error?: string;
};

function getUpstreamMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback;

  const record = data as Record<string, unknown>;
  const message = [record.message, record.error, record.errorcode].find(
    (value) => typeof value === "string" && value.trim()
  );

  return typeof message === "string" ? message.trim() : fallback;
}

function extractBatchId(data: SoftOneBatchJson) {
  if (typeof data.batchId === "number" && Number.isFinite(data.batchId)) {
    return data.batchId;
  }

  return null;
}

async function postBatch<T extends SoftOneBatchJson>(
  action: "openBatch" | "savePrices" | "closeBatch",
  payload: unknown
) {
  const upstreamResponse = await postSoftOne(payload, {
    endpoint: getSupplierPriceBatchEndpoint(action),
    fallbackToGenericEndpoint: false,
  });

  if (!upstreamResponse.ok) {
    const errorText = await upstreamResponse.text();
    throw new Error(
      `Αποτυχία επικοινωνίας με το ERP (HTTP ${upstreamResponse.status}): ${errorText}`
    );
  }

  const data = await parseJsonWithEncodingFallback<T>(upstreamResponse);

  if (data.success === false) {
    throw new Error(
      getUpstreamMessage(data, `Αποτυχία κλήσης ${action} στο ERP.`)
    );
  }

  return data;
}

export async function openSupplierPriceBatch(
  payload: OpenSupplierPriceBatchPayload
) {
  const clientID = getSoftOneClientID();

  if (!clientID) {
    throw new Error("Δεν έχει ρυθμιστεί ο πελάτης SoftOne.");
  }

  const data = await postBatch<SoftOneBatchJson>("openBatch", {
    clientID,
    supplier: payload.supplier,
    descr: payload.descr,
    filePath: payload.filePath,
    prefixes: payload.prefixes,
    by: payload.by,
  });

  const batchId = extractBatchId(data);

  if (!batchId) {
    throw new Error("Το ERP δεν επέστρεψε batchId.");
  }

  return batchId;
}

export async function saveSupplierPriceBatchChunk(
  batchId: number,
  rowOffset: number,
  rows: SupplierPriceRow[]
) {
  const clientID = getSoftOneClientID();

  if (!clientID) {
    throw new Error("Δεν έχει ρυθμιστεί ο πελάτης SoftOne.");
  }

  await postBatch<SoftOneBatchJson>("savePrices", {
    clientID,
    batchId,
    rowOffset,
    rows,
  });
}

export async function closeSupplierPriceBatch(batchId: number) {
  const clientID = getSoftOneClientID();

  if (!clientID) {
    throw new Error("Δεν έχει ρυθμιστεί ο πελάτης SoftOne.");
  }

  await postBatch<SoftOneBatchJson>("closeBatch", {
    clientID,
    batchId,
  });
}

export async function uploadSupplierPriceCatalogToSoftOne(
  openPayload: OpenSupplierPriceBatchPayload,
  rows: SupplierPriceRow[]
) {
  const batchId = await openSupplierPriceBatch(openPayload);

  for (
    let offset = 0;
    offset < rows.length;
    offset += SUPPLIER_PRICE_SAVE_CHUNK_SIZE
  ) {
    const chunk = rows.slice(offset, offset + SUPPLIER_PRICE_SAVE_CHUNK_SIZE);
    await saveSupplierPriceBatchChunk(batchId, offset, chunk);
  }

  await closeSupplierPriceBatch(batchId);

  return { batchId, rowsUploaded: rows.length };
}
