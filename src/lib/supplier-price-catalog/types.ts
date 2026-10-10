export type SupplierPriceCatalogCode = "TRISCAN" | "FEBI";

export type SupplierPriceRow = {
  code: string;
  ean: string;
  price: string;
};

export type OpenSupplierPriceBatchPayload = {
  supplier: SupplierPriceCatalogCode;
  descr: string;
  filePath: string;
  prefixes: string;
  by: string;
};

export type UploadSupplierPriceCatalogRequest = {
  supplier: SupplierPriceCatalogCode;
  descr: string;
  filePath: string;
  prefixes: string;
  rows: SupplierPriceRow[];
};

export type UploadSupplierPriceCatalogResponse = {
  success: boolean;
  message?: string;
  batchId?: number;
  rowsUploaded?: number;
};

export type ParsedSupplierPriceSheet = {
  sheetName: string;
  rows: SupplierPriceRow[];
};

export type ParseSupplierPriceFileResult = {
  importableSheetNames: string[];
  parsedSheets: ParsedSupplierPriceSheet[];
};

export type SupplierPriceUploadProgress = {
  percent: number;
  label: string;
};

export type OpenSupplierPriceBatchResponse = {
  success: boolean;
  message?: string;
  batchId?: number;
};

export type SaveSupplierPriceBatchResponse = {
  success: boolean;
  message?: string;
};

export type CloseSupplierPriceBatchResponse = {
  success: boolean;
  message?: string;
};
