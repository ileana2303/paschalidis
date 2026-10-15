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
  SuffixSaveKind,
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

const SUFIX_SAVE_FIELDS = [
  "SOSUFIX",
  "NAME",
  "ZGROUP_ID",
  "ZGROUP_CODE",
  "ZB2B_ID",
  "ZB2B_CODE",
  "SUPPLIER_CODE",
  "SUPPLIER_NAME",
  "PERCNT00",
  "PERCNT01",
  "PERCNT02",
  "PERCNT03",
  "PERCNT04",
  "PERCNT05",
  "PERCNT99",
  "REMARKS",
  "NOTES",
  "IS_ACTIVE",
] as const;

const GROUP_SAVE_FIELDS = [
  "ZGROUP_CODE",
  "ZGROUP_NAME",
  "DESCR",
  "SORT_ORDER",
  "IS_ACTIVE",
] as const;

const B2B_SAVE_FIELDS = [
  "ZB2B_CODE",
  "ZB2B_NAME",
  "DESCR",
  "SORT_ORDER",
  "IS_ACTIVE",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSaveKind(value: unknown): value is SuffixSaveKind {
  return value === "SUFIX" || value === "GROUP" || value === "B2B";
}

function getSaveFields(kind: SuffixSaveKind): readonly string[] {
  if (kind === "GROUP") return GROUP_SAVE_FIELDS;
  if (kind === "B2B") return B2B_SAVE_FIELDS;
  return SUFIX_SAVE_FIELDS;
}

function pickSaveFields(value: unknown, fields: readonly string[]) {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    fields
      .filter((field) => Object.prototype.hasOwnProperty.call(value, field))
      .map((field) => [field, value[field]])
  );
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

    const body = (await req.json().catch(() => ({}))) as {
      kind?: unknown;
      rows?: unknown;
    };
    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return jsonError("Απαιτείται τουλάχιστον μία γραμμή.", 400);
    }

    const kind = body.kind ?? "SUFIX";
    if (!isSaveKind(kind)) {
      return jsonError("Το kind πρέπει να είναι SUFIX, GROUP ή B2B.", 400);
    }

    const payload: SuffixSaveRequest = {
      clientID,
      kind,
      rows: body.rows.map((row) =>
        pickSaveFields(row, getSaveFields(kind))
      ) as SuffixSaveRequest["rows"],
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
