export type SoftOneFlag = 0 | 1;

export interface SuffixRow {
  SOSUFIX: string;
  NAME: string;
  PERCNT00: number | string | null;
  PERCNT01: number | string | null;
  PERCNT02: number | string | null;
  PERCNT03: number | string | null;
  PERCNT04: number | string | null;
  PERCNT05: number | string | null;
  PERCNT99: number | string | null;
  ISACTIVE: SoftOneFlag;
  ZGROUP_ID: number;
  ZGROUP_CODE: string;
  ZB2B_ID: number;
  ZB2B_CODE: string;
  SUPPLIER_CODE: string;
  SUPPLIER_NAME: string;
  REMARKS: string;
  NOTES: string;
  SUGGESTED_TRDR: number | string | null;
  SUGGESTED_TRDR_CODE: string;
  SUGGESTED_TRDR_NAME: string;
  EXTRA_ACTIVE: SoftOneFlag;
  NEEDS_EXTRA: SoftOneFlag;
}

export interface SuffixGroup {
  ZGROUP_ID: number;
  ZGROUP_CODE: string;
  ZGROUP_NAME: string;
  DESCR: string;
  SORT_ORDER: number;
  IS_ACTIVE: SoftOneFlag;
}

export interface SuffixB2B {
  ZB2B_ID: number;
  ZB2B_CODE: string;
  ZB2B_NAME: string;
  DESCR: string;
  SORT_ORDER: number;
  IS_ACTIVE: SoftOneFlag;
}

export interface SuffixListCounts {
  sufix: number;
  groups: number;
  b2b: number;
}

export interface SuffixListFilters {
  /** A suffix key or an exact list of keys. Values remain strings to preserve leading zeroes. */
  sosufix?: string | string[];
  zgroupId?: number;
  zb2bId?: number;
  search?: string;
  needsExtra?: 1;
}

export interface SuffixListRequest extends SuffixListFilters {
  clientID: string;
}

export interface SuffixListSuccessResponse {
  success: true;
  counts: SuffixListCounts;
  sufix: SuffixRow[];
  groups: SuffixGroup[];
  b2b: SuffixB2B[];
}

export interface SuffixListErrorResponse {
  success: false;
  error: string;
}

export type SuffixListResponse =
  | SuffixListSuccessResponse
  | SuffixListErrorResponse;

export interface SuffixSaveFields {
  NAME: string;
  ZGROUP_ID: number;
  ZGROUP_CODE: string;
  ZB2B_ID: number;
  ZB2B_CODE: string;
  SUPPLIER_CODE: string;
  SUPPLIER_NAME: string;
  PERCNT00: number | "";
  PERCNT01: number | "";
  PERCNT02: number | "";
  PERCNT03: number | "";
  PERCNT04: number | "";
  PERCNT05: number | "";
  PERCNT99: number | "";
  REMARKS: string;
  NOTES: string;
  /** Soft1 uses IS_ACTIVE for writes even though getlist returns ISACTIVE. */
  IS_ACTIVE: SoftOneFlag;
}

export type SuffixSaveRow = {
  SOSUFIX: string;
} & Partial<SuffixSaveFields>;

export interface SuffixSaveRoutePayload {
  rows: SuffixSaveRow[];
}

export interface SuffixSaveRequest extends SuffixSaveRoutePayload {
  clientID: string;
  kind: "SUFIX";
}

export interface SuffixSaveErrorItem {
  row: number;
  key: string | null;
  error: string;
}

export interface SuffixSaveSuccessResponse {
  success: true;
  kind: "SUFIX";
  saved: number;
  failed: number;
  errors: SuffixSaveErrorItem[];
}

export interface SuffixSaveFailureResponse {
  success: false;
  kind?: "SUFIX";
  saved?: number;
  failed?: number;
  errors?: SuffixSaveErrorItem[];
  error?: string;
}

export type SuffixSaveResponse =
  | SuffixSaveSuccessResponse
  | SuffixSaveFailureResponse;
