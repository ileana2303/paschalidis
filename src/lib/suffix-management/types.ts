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
}

export interface SuffixB2B {
  ZB2B_ID: number;
  ZB2B_CODE: string;
}

export interface SuffixListCounts {
  sufix: number;
  groups: number;
  b2b: number;
}

export interface SuffixListFilters {
  sosufix?: string;
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
