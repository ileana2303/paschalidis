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
} from "@/lib/suffix-management/types";

const SUFFIX_SERVICE_PATH = "/JS/SiteData.SUFIX";
const GET_LIST_ACTION = "getlist";

function getSuffixListEndpoint() {
  const configuredEndpoint = getEnvString("S1_SUFFIX_GETLIST_ENDPOINT");

  if (configuredEndpoint) {
    return configuredEndpoint;
  }

  const baseEndpoint = getSoftOneEndpoint().replace(/\/+$/, "");

  if (baseEndpoint.endsWith(SUFFIX_SERVICE_PATH)) {
    return `${baseEndpoint}/${GET_LIST_ACTION}`;
  }

  return `${baseEndpoint}${SUFFIX_SERVICE_PATH}/${GET_LIST_ACTION}`;
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalPositiveInteger(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function sanitizeFilters(body: Partial<Record<keyof SuffixListFilters, unknown>>) {
  const sosufix = optionalText(body.sosufix);
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
      endpoint: getSuffixListEndpoint(),
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
