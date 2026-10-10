import {
  closeSupplierPriceCatalogBatch,
  openSupplierPriceCatalogBatch,
  saveSupplierPriceCatalogChunk,
} from "@/lib/api-client/supplier-price-catalog";
import { SUPPLIER_PRICE_SAVE_CHUNK_SIZE } from "@/lib/supplier-price-catalog/constants";
import type {
  SupplierPriceUploadProgress,
  UploadSupplierPriceCatalogRequest,
  UploadSupplierPriceCatalogResponse,
} from "@/lib/supplier-price-catalog/types";

const OPEN_WEIGHT = 8;
const CLOSE_WEIGHT = 7;
const CHUNKS_WEIGHT = 100 - OPEN_WEIGHT - CLOSE_WEIGHT;

function reportProgress(
  onProgress: (progress: SupplierPriceUploadProgress) => void,
  percent: number,
  label: string
) {
  onProgress({
    percent: Math.min(100, Math.max(0, Math.round(percent))),
    label,
  });
}

export async function uploadSupplierPriceCatalogWithProgress(
  payload: UploadSupplierPriceCatalogRequest,
  onProgress: (progress: SupplierPriceUploadProgress) => void
): Promise<UploadSupplierPriceCatalogResponse> {
  const { rows, supplier, descr, filePath, prefixes } = payload;
  const chunkCount = Math.max(
    1,
    Math.ceil(rows.length / SUPPLIER_PRICE_SAVE_CHUNK_SIZE)
  );

  reportProgress(onProgress, 0, "Προετοιμασία ανέβασματος...");

  reportProgress(onProgress, 2, "Άνοιγμα batch στο ERP...");
  const batchId = await openSupplierPriceCatalogBatch({
    supplier,
    descr,
    filePath,
    prefixes,
  });
  reportProgress(onProgress, OPEN_WEIGHT, `Batch #${batchId} — αποστολή γραμμών...`);

  for (let index = 0; index < chunkCount; index += 1) {
    const rowOffset = index * SUPPLIER_PRICE_SAVE_CHUNK_SIZE;
    const chunk = rows.slice(rowOffset, rowOffset + SUPPLIER_PRICE_SAVE_CHUNK_SIZE);
    const fromRow = rowOffset + 1;
    const toRow = rowOffset + chunk.length;

    reportProgress(
      onProgress,
      OPEN_WEIGHT +
        (CHUNKS_WEIGHT * index) / chunkCount +
        CHUNKS_WEIGHT / chunkCount / 2,
      `Αποστολή γραμμών ${fromRow}–${toRow} από ${rows.length}...`
    );

    await saveSupplierPriceCatalogChunk({
      batchId,
      rowOffset,
      rows: chunk,
    });

    reportProgress(
      onProgress,
      OPEN_WEIGHT + (CHUNKS_WEIGHT * (index + 1)) / chunkCount,
      `Αποστάλθηκαν ${Math.min(toRow, rows.length)} / ${rows.length} γραμμές`
    );
  }

  reportProgress(onProgress, 100 - CLOSE_WEIGHT, "Ολοκλήρωση batch στο ERP...");
  await closeSupplierPriceCatalogBatch(batchId);
  reportProgress(onProgress, 100, "Ολοκληρώθηκε το ανέβασμα.");

  return {
    success: true,
    message: "Ο τιμοκατάλογος ανέβηκε επιτυχώς.",
    batchId,
    rowsUploaded: rows.length,
  };
}
