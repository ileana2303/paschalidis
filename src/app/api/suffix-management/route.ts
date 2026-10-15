import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/session-token";
import {
  getEnvString,
  getSoftOneClientID,
  getSoftOneEndpoint,
  parseJsonWithEncodingFallback,
  postSoftOne,
} from "@/lib/softone";
import type {
  SuffixListFilters,
  SuffixListRequest,
  SuffixListResponse,
  SuffixSaveRequest,
  SuffixSaveResponse,
  SuffixSaveRow,
} from "@/lib/suffix-management/types";

const SUFFIX_SERVICE_PATH = "/JS/SiteData.SUFIX";
const GET_LIST_ACTION = "getlist";
const SAVE_SUFFIX_ACTION = "savesufix";

function getSuffixEndpoint(action: typeof GET_LIST_ACTION | typeof SAVE_SUFFIX_ACTION) {
  const configuredEndpoint = getEnvString(
    action === GET_LIST_ACTION
      ? "S1_SUFFIX_GETLIST_ENDPOINT"
      : "S1_SUFFIX_SAVE_ENDPOINT"
  );

  if (configuredEndpoint) {
    return configuredEndpoint;
  }

  const baseEndpoint = getSoftOneEndpoint().replace(/\/+$/, "");

  if (baseEndpoint.endsWith(SUFFIX_SERVICE_PATH)) {
    return `${baseEndpoint}/${action}`;
  }

  return `${baseEndpoint}${SUFFIX_SERVICE_PATH}/${action}`;
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalSuffixFilter(value: unknown): string | string[] | undefined {
  if (typeof value === "string") {
    return value.trim() || undefined;
  }

  if (!Array.isArray(value)) return undefined;

  const suffixes = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return suffixes.length > 0 ? suffixes : undefined;
}

function optionalPositiveInteger(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function sanitizeFilters(body: Partial<Record<keyof SuffixListFilters, unknown>>) {
  const sosufix = optionalSuffixFilter(body.sosufix);
  const search = optionalText(body.search);
  const zgroupId = optionalPositiveInteger(body.zgroupId);
  const zb2bId = optionalPositiveInteger(body.zb2bId);

  return {
    ...(sosufix ? { sosufix } : {}),
    ...(zgroupId ? { zgroupId } : {}),
    ...(zb2bId ? { zb2bId } : {}),
    ...(search ? { search } : {}),
    ...(body.needsExtra === 1 ? { needsExtra: 1 as const } : {}),
  } satisfies SuffixListFilters;
}

const SAVE_TEXT_FIELDS = [
  "NAME",
  "ZGROUP_CODE",
  "ZB2B_CODE",
  "SUPPLIER_CODE",
  "SUPPLIER_NAME",
  "REMARKS",
  "NOTES",
] as const;

const SAVE_PERCENTAGE_FIELDS = [
  "PERCNT00",
  "PERCNT01",
  "PERCNT02",
  "PERCNT03",
  "PERCNT04",
  "PERCNT05",
  "PERCNT99",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeSaveRow(value: unknown): SuffixSaveRow {
  if (!isRecord(value)) {
    throw new Error("Κάθε γραμμή suffix πρέπει να είναι αντικείμενο.");
  }

  if (typeof value.SOSUFIX !== "string" || !value.SOSUFIX.trim()) {
    throw new Error("Κάθε γραμμή πρέπει να περιέχει έγκυρο SOSUFIX.");
  }

  const row: SuffixSaveRow = { SOSUFIX: value.SOSUFIX };

  for (const field of SAVE_TEXT_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(value, field)) continue;
    if (typeof value[field] !== "string") {
      throw new Error(`Το ${field} πρέπει να είναι κείμενο.`);
    }
    row[field] = value[field];
  }

  for (const field of ["ZGROUP_ID", "ZB2B_ID"] as const) {
    if (!Object.prototype.hasOwnProperty.call(value, field)) continue;
    if (!Number.isInteger(value[field]) || Number(value[field]) < 0) {
      throw new Error(`Το ${field} πρέπει να είναι μη αρνητικός ακέραιος.`);
    }
    row[field] = Number(value[field]);
  }

  for (const field of SAVE_PERCENTAGE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(value, field)) continue;
    const fieldValue = value[field];
    if (fieldValue !== "" && (typeof fieldValue !== "number" || !Number.isFinite(fieldValue))) {
      throw new Error(`Το ${field} πρέπει να είναι αριθμός ή κενό.`);
    }
    row[field] = fieldValue;
  }

  if (Object.prototype.hasOwnProperty.call(value, "IS_ACTIVE")) {
    if (value.IS_ACTIVE !== 0 && value.IS_ACTIVE !== 1) {
      throw new Error("Το IS_ACTIVE πρέπει να είναι 0 ή 1.");
    }
    row.IS_ACTIVE = value.IS_ACTIVE;
  }

  if (Object.keys(row).length === 1) {
    throw new Error("Δεν υπάρχουν αλλαγές για αποθήκευση.");
  }

  return row;
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await verifySessionToken(token);

    if (!session) {
      return jsonError("Απαιτείται σύνδεση.", 401);
    }

    const clientID = getSoftOneClientID();

    if (!clientID) {
      return jsonError("Δεν έχει ρυθμιστεί ο SoftOne client ID.", 500);
    }

    const body = (await req.json().catch(() => ({}))) as Partial<
      Record<keyof SuffixListFilters, unknown>
    >;
    const payload: SuffixListRequest = {
      clientID,
      ...sanitizeFilters(body),
    };
    const response = await postSoftOne(payload, {
      endpoint: getSuffixEndpoint(GET_LIST_ACTION),
    });
    const data = await parseJsonWithEncodingFallback<SuffixListResponse>(response);

    if (!response.ok && data.success !== false) {
      return jsonError(
        `Αποτυχία επικοινωνίας με το ERP (HTTP ${response.status}).`,
        response.status
      );
    }

    return NextResponse.json(data, { status: response.ok ? 200 : response.status });
  } catch (error) {
    console.error("[suffix-management:getlist] Server error", error);
    return jsonError(
      error instanceof Error ? error.message : "Σφάλμα διακομιστή.",
      500
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await verifySessionToken(token);

    if (!session) {
      return jsonError("Απαιτείται σύνδεση.", 401);
    }

    const clientID = getSoftOneClientID();

    if (!clientID) {
      return jsonError("Δεν έχει ρυθμιστεί ο SoftOne client ID.", 500);
    }

    const body = (await req.json().catch(() => ({}))) as { rows?: unknown };
    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return jsonError("Απαιτείται τουλάχιστον μία γραμμή suffix.", 400);
    }

    const payload: SuffixSaveRequest = {
      clientID,
      kind: "SUFIX",
      rows: body.rows.map(sanitizeSaveRow),
    };
    const response = await postSoftOne(payload, {
      endpoint: getSuffixEndpoint(SAVE_SUFFIX_ACTION),
    });
    const data = await parseJsonWithEncodingFallback<SuffixSaveResponse>(response);

    if (!response.ok && data.success !== false) {
      return jsonError(
        `Αποτυχία επικοινωνίας με το ERP (HTTP ${response.status}).`,
        response.status
      );
    }

    // A parsed failure can still include successfully saved rows, so preserve
    // its full body for the client instead of collapsing it to an HTTP error.
    return NextResponse.json(data);
  } catch (error) {
    console.error("[suffix-management:savesufix] Server error", error);
    return jsonError(
      error instanceof Error ? error.message : "Σφάλμα διακομιστή.",
      500
    );
  }
}
