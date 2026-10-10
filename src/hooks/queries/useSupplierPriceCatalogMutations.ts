"use client";

import { useMutation } from "@tanstack/react-query";
import { uploadSupplierPriceCatalogWithProgress } from "@/lib/supplier-price-catalog/upload-with-progress";
import type {
  SupplierPriceUploadProgress,
  UploadSupplierPriceCatalogRequest,
} from "@/lib/supplier-price-catalog/types";

type UploadWithProgressInput = {
  payload: UploadSupplierPriceCatalogRequest;
  onProgress: (progress: SupplierPriceUploadProgress) => void;
};

export function useUploadSupplierPriceCatalogMutation() {
  return useMutation({
    mutationFn: ({ payload, onProgress }: UploadWithProgressInput) =>
      uploadSupplierPriceCatalogWithProgress(payload, onProgress),
  });
}
