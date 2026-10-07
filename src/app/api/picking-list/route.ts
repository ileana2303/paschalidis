import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
  getSoftOneClientID,
  getSoftOneSetDataClientID,
  parseJsonWithEncodingFallback,
  postSoftOne,
} from "@/lib/softone";
import {
  isPickingStatus,
  type PickingListLine,
  type PickingListResponse,
  type PickingListUpdatePayload,
  type PickingListUpdateResponse,
  type PickingStatus,
} from "@/lib/picking-list";

const S1_APP_ID = "1305";
const DEFAULT_SQL_NAME = "PICKING_LIST_TO_DO";
const FILTERED_SQL_NAME = "PICKING_W_FILTER";

function hasSession(req: NextRequest) {
  return Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value?.trim());
}

function unauthorizedResponse() {
  return NextResponse.json(
    {
      success: false,
      message: "Απαιτείται σύνδεση.",
    },
    { status: 401 }
  );
}

function getUpstreamMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback;

  const record = data as Record<string, unknown>;
  const message = [record.message, record.error, record.errorcode].find(
    (value) => typeof value === "string" && value.trim()
  );

  return typeof message === "string" ? message.trim() : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeRow(row: Record<string, unknown>): PickingListLine {
  const normalizedRow = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      value == null ? "" : String(value),
    ])
  ) as PickingListLine;
  const submittedBy = Object.entries(normalizedRow).find(
    ([key]) => key.trim().toUpperCase() === "CCCEXTUSER"
  )?.[1];

  return {
    ...normalizedRow,
    CCCEXTUSER: String(submittedBy ?? "").trim(),
  };
}

export async function POST(req: NextRequest) {
  try {
    if (!hasSession(req)) return unauthorizedResponse();

    const body = (await req.json().catch(() => ({}))) as { status?: unknown };
    const rawStatus = String(body.status ?? "").trim().toUpperCase();

    if (rawStatus && !isPickingStatus(rawStatus)) {
      return NextResponse.json(
        {
          success: false,
          message: "Μη έγκυρη κατάσταση Picking List.",
          totalcount: 0,
          rows: [],
        },
        { status: 400 }
      );
    }

    const status = rawStatus as PickingStatus | "";
    const clientID = getSoftOneClientID();

    if (!clientID) {
      return NextResponse.json(
        {
          success: false,
          message: "Δεν έχει ρυθμιστεί ο πελάτης SoftOne.",
          totalcount: 0,
          rows: [],
        },
        { status: 500 }
      );
    }

    const payload = status
      ? {
          service: "SqlData" as const,
          clientID,
          appId: S1_APP_ID,
          SqlName: FILTERED_SQL_NAME,
          STATUS: status,
        }
      : {
          service: "SqlData" as const,
          clientID,
          appId: S1_APP_ID,
          SqlName: DEFAULT_SQL_NAME,
        };

    const upstreamResponse = await postSoftOne(payload);

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      console.error("[picking-list:list] Upstream error body:", errorText);

      return NextResponse.json(
        {
          success: false,
          message: `Αποτυχία επικοινωνίας με το ERP (HTTP ${upstreamResponse.status}).`,
          totalcount: 0,
          rows: [],
        },
        { status: upstreamResponse.status }
      );
    }

    const upstreamData = (await parseJsonWithEncodingFallback(
      upstreamResponse
    )) as {
      success?: boolean;
      message?: string;
      totalcount?: number;
      rows?: unknown[];
    };

    if (upstreamData?.success === false) {
      return NextResponse.json(
        {
          success: false,
          message: getUpstreamMessage(
            upstreamData,
            "Αποτυχία φόρτωσης Picking List."
          ),
          totalcount: 0,
          rows: [],
        },
        { status: 502 }
      );
    }

    const rows = Array.isArray(upstreamData?.rows)
      ? upstreamData.rows.filter(isRecord).map(normalizeRow)
      : [];
    const response: PickingListResponse = {
      success: true,
      message: upstreamData?.message,
      totalcount:
        typeof upstreamData?.totalcount === "number"
          ? upstreamData.totalcount
          : rows.length,
      rows,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[picking-list:list] Server error", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Σφάλμα διακομιστή.",
        totalcount: 0,
        rows: [],
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!hasSession(req)) return unauthorizedResponse();

    const body = (await req.json().catch(() => ({}))) as PickingListUpdatePayload;
    const findoc = String(body.findoc ?? "").trim();
    const hasPickerComment = Object.prototype.hasOwnProperty.call(
      body,
      "pickerComment"
    );
    const pickerComment = hasPickerComment
      ? String(body.pickerComment ?? "").trim()
      : undefined;
    const rawStatus = String(body.status ?? "").trim().toUpperCase();
    const status = rawStatus && isPickingStatus(rawStatus) ? rawStatus : undefined;

    if (
      !findoc ||
      (!hasPickerComment && !status) ||
      (rawStatus && !status)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Μη έγκυρα δεδομένα ενημέρωσης Picking List.",
        },
        { status: 400 }
      );
    }

    const clientID = getSoftOneSetDataClientID();

    if (!clientID) {
      return NextResponse.json(
        {
          success: false,
          message: "Δεν έχει ρυθμιστεί ο πελάτης setData SoftOne.",
        },
        { status: 500 }
      );
    }

    const fields: { VARCHAR01?: string; VARCHAR02?: PickingStatus } = {};
    if (hasPickerComment) fields.VARCHAR01 = pickerComment;
    if (status) fields.VARCHAR02 = status;

    const upstreamResponse = await postSoftOne({
      service: "setData",
      clientID,
      appId: S1_APP_ID,
      OBJECT: "SALDOC",
      KEY: findoc,
      data: {
        SALDOC: [fields],
      },
    });

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      console.error("[picking-list:update] Upstream error body:", errorText);

      return NextResponse.json(
        {
          success: false,
          message: `Αποτυχία επικοινωνίας με το ERP (HTTP ${upstreamResponse.status}).`,
        },
        { status: upstreamResponse.status }
      );
    }

    const upstreamData = (await parseJsonWithEncodingFallback(
      upstreamResponse
    )) as {
      success?: boolean;
      message?: string;
    };

    if (upstreamData?.success === false) {
      return NextResponse.json(
        {
          success: false,
          message: getUpstreamMessage(
            upstreamData,
            "Αποτυχία ενημέρωσης Picking List."
          ),
        },
        { status: 502 }
      );
    }

    const response: PickingListUpdateResponse = {
      success: true,
      message: upstreamData?.message ?? "Η παραγγελία ενημερώθηκε.",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[picking-list:update] Server error", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Σφάλμα διακομιστή.",
      },
      { status: 500 }
    );
  }
}
