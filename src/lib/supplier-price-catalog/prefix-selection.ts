import type { SuffixRow } from "@/lib/suffix-management/types";

export const FORD_ZGROUP_CODE = "FORD";

export type CatalogPrefixMode = "ford" | "other";

export type CatalogPrefixSelection =
  | { mode: "ford"; sosufix: string[] }
  | { mode: "other"; sosufix: string[] };

export const INITIAL_CATALOG_PREFIX_SELECTION: CatalogPrefixSelection = {
  mode: "ford",
  sosufix: [],
};

export function isFordGroupCode(code: string) {
  return code.trim().toUpperCase() === FORD_ZGROUP_CODE;
}

export function filterNonFordSuffixRows(rows: SuffixRow[]) {
  return rows.filter((row) => !isFordGroupCode(row.ZGROUP_CODE));
}

export function filterFordSuffixRows(rows: SuffixRow[]) {
  return rows.filter((row) => isFordGroupCode(row.ZGROUP_CODE));
}

export function catalogSelectionToPrefixes(
  selection: CatalogPrefixSelection
): string {
  if (selection.mode === "ford") {
    if (selection.sosufix.length > 0) {
      return selection.sosufix.join("-");
    }
    return FORD_ZGROUP_CODE;
  }

  return selection.sosufix.join("-");
}

export function isCatalogPrefixSelectionValid(
  selection: CatalogPrefixSelection
): boolean {
  if (selection.mode === "ford") {
    return true;
  }

  return selection.sosufix.length > 0;
}
