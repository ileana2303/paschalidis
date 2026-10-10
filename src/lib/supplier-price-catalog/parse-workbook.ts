import * as XLSX from "xlsx";
import {
  SUPPLIER_PRICE_INVALID_HEADERS_MESSAGE,
  SUPPLIER_PRICE_SHEET_SKIP_NAMES,
} from "@/lib/supplier-price-catalog/constants";
import { normalizeSupplierPriceRow } from "@/lib/supplier-price-catalog/normalize";
import type {
  ParseSupplierPriceFileResult,
  ParsedSupplierPriceSheet,
  SupplierPriceRow,
} from "@/lib/supplier-price-catalog/types";

export class SupplierPriceSheetHeaderError extends Error {
  sheetName: string;
  foundHeaders: string[];

  constructor(sheetName: string, foundHeaders: string[]) {
    super(SUPPLIER_PRICE_INVALID_HEADERS_MESSAGE);
    this.name = "SupplierPriceSheetHeaderError";
    this.sheetName = sheetName;
    this.foundHeaders = foundHeaders;
  }
}

function normalizeHeaderCell(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function findHeaderRowIndex(matrix: (string | number | null)[][]) {
  return matrix.findIndex((row) => row?.some((cell) => String(cell ?? "").trim()));
}

type HeaderLayout = {
  headerRowIndex: number;
  codeIndex: number;
  eanIndex: number;
  priceIndex: number;
};

function resolveHeaderLayout(
  matrix: (string | number | null)[][],
  sheetName: string
): HeaderLayout {
  const headerRowIndex = findHeaderRowIndex(matrix);

  if (headerRowIndex < 0) {
    throw new SupplierPriceSheetHeaderError(sheetName, []);
  }

  const headerRow = matrix[headerRowIndex];
  const foundHeaders = headerRow.map((cell) => String(cell ?? "").trim());

  const codeIndex = headerRow.findIndex(
    (cell) => normalizeHeaderCell(cell) === "CODE"
  );
  const eanIndex = headerRow.findIndex(
    (cell) => normalizeHeaderCell(cell) === "EAN"
  );
  const priceIndex = headerRow.findIndex(
    (cell) => normalizeHeaderCell(cell) === "PRICE"
  );

  if (codeIndex < 0 || eanIndex < 0 || priceIndex < 0) {
    throw new SupplierPriceSheetHeaderError(sheetName, foundHeaders);
  }

  return { headerRowIndex, codeIndex, eanIndex, priceIndex };
}

function sheetToRows(
  worksheet: XLSX.WorkSheet,
  sheetName: string
): SupplierPriceRow[] {
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (matrix.length === 0) {
    throw new SupplierPriceSheetHeaderError(sheetName, []);
  }

  const { headerRowIndex, codeIndex, eanIndex, priceIndex } = resolveHeaderLayout(
    matrix,
    sheetName
  );

  const rows: SupplierPriceRow[] = [];

  for (let index = headerRowIndex + 1; index < matrix.length; index += 1) {
    const row = matrix[index];
    if (!row || row.every((cell) => !String(cell ?? "").trim())) continue;

    const parsed = normalizeSupplierPriceRow(
      row[codeIndex],
      row[eanIndex],
      row[priceIndex]
    );

    if (parsed) rows.push(parsed);
  }

  return rows;
}

export function listImportableSheetNames(workbook: XLSX.WorkBook) {
  return workbook.SheetNames.filter((name) => {
    const normalized = name.trim().toUpperCase();
    return !SUPPLIER_PRICE_SHEET_SKIP_NAMES.has(normalized);
  });
}

export function parseSupplierPriceWorkbook(
  buffer: ArrayBuffer,
  preferredSheetName?: string
): ParseSupplierPriceFileResult {
  const workbook = XLSX.read(buffer, { type: "array" });
  const importableSheetNames = listImportableSheetNames(workbook);
  const sheetNames = importableSheetNames;

  const targets =
    preferredSheetName && sheetNames.includes(preferredSheetName)
      ? [preferredSheetName]
      : sheetNames;

  const parsedSheets: ParsedSupplierPriceSheet[] = [];
  let headerError: SupplierPriceSheetHeaderError | null = null;

  for (const sheetName of targets) {
    try {
      const rows = sheetToRows(workbook.Sheets[sheetName], sheetName);
      if (rows.length > 0) {
        parsedSheets.push({ sheetName, rows });
      }
    } catch (error) {
      if (error instanceof SupplierPriceSheetHeaderError) {
        if (!headerError) headerError = error;
        if (preferredSheetName) throw error;
        continue;
      }
      throw error;
    }
  }

  if (parsedSheets.length === 0 && headerError) {
    throw headerError;
  }

  return { importableSheetNames, parsedSheets };
}

export async function parseSupplierPriceFile(
  file: File,
  preferredSheetName?: string
) {
  const buffer = await file.arrayBuffer();
  return parseSupplierPriceWorkbook(buffer, preferredSheetName);
}
