import {
  getStorageThesiByBranchCode,
  type StorageThesi,
} from "@/lib/auth/branches";

export const PICKING_STATUSES = [
  "S1",
  "LOADED",
  "SEEN",
  "PICKED_IT_UP",
] as const;

export type PickingStatus = (typeof PICKING_STATUSES)[number];
export type PickingStatusFilter = "ALL" | PickingStatus;

export const PICKING_STATUS_FILTERS: Array<{
  value: PickingStatusFilter;
  label: string;
}> = [
    { value: "ALL", label: "All" },
    ...PICKING_STATUSES.map((status) => ({ value: status, label: status })),
  ];

export const PICKER_COMMENT_SUGGESTIONS = [
  "TEST",
  "PENDING",
  "URGENT",
  "WAITING",
] as const;

export type PickingListLine = {
  [key: string]: string | undefined;
  FINDOC?: string;
  FINCODE?: string;
  SERIES?: string;
  SERIESNUM?: string;
  PARASTATIKO?: string;
  Mtrl?: string;
  CODE?: string;
  AFM?: string;
  NAME?: string;
  BRANCH?: string;
  CCCEXTUSER?: string;
  TrnDate?: string;
  InsDate?: string;
  STATUS_ORDER?: string;
  COMMENTS?: string;
  LPELATIS?: string;
  REMARKS?: string;
  VARCHAR01?: string;
  VARCHAR02?: string;
  LineNum?: string;
  DETAIL_CODE?: string;
  DETAIL_EIDOS?: string;
  Qty1?: string;
  THESIS1?: string;
  THESIS2?: string;
  THESIS3?: string;
};

export type PickingListDetail = {
  lineNumber: string;
  code: string;
  description: string;
  quantity: string;
  positions: string[];
  positionsByLocation: Record<StorageThesi, string>;
};

export type PickingListOrder = {
  findoc: string;
  fincode: string;
  series: string;
  seriesNumber: string;
  parastatiko: string;
  customerCode: string;
  customerName: string;
  afm: string;
  branch: string;
  submittedBy: string;
  transactionDate: string;
  submittedAt: string;
  comments: string;
  retailCustomerName: string;
  remarks: string;
  pickerComment: string;
  status: PickingStatus;
  details: PickingListDetail[];
};

export type PickingListResponse = {
  success: boolean;
  message?: string;
  totalcount: number;
  rows: PickingListLine[];
};

export type PickingListUpdatePayload = {
  findoc: string;
  pickerComment?: string;
  status?: PickingStatus;
};

export type PickingListUpdateResponse = {
  success: boolean;
  message?: string;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

export function isPickingStatus(value: unknown): value is PickingStatus {
  return PICKING_STATUSES.includes(text(value).toUpperCase() as PickingStatus);
}

export function normalizePickingStatus(
  value: unknown,
  fallback: PickingStatus = "S1"
): PickingStatus {
  const normalized = text(value).toUpperCase();
  return isPickingStatus(normalized) ? normalized : fallback;
}

export function getNextPickingStatus(
  status: PickingStatus
): PickingStatus | null {
  if (status === "LOADED") return "SEEN";
  if (status === "SEEN") return "PICKED_IT_UP";
  return null;
}

export function getAutomaticPickingStatus(
  status: PickingStatus
): PickingStatus | undefined {
  return status === "S1" ? "LOADED" : undefined;
}

export function getFirstInteractionStatus(
  status: PickingStatus
): PickingStatus | undefined {
  return status === "LOADED" ? "SEEN" : undefined;
}

function toDetail(row: PickingListLine): PickingListDetail | null {
  const lineNumber = text(row.LineNum);
  const code = text(row.DETAIL_CODE);
  const description = text(row.DETAIL_EIDOS);
  const quantity = text(row.Qty1);
  const positionsByLocation = {
    P: text(row.THESIS1),
    C: text(row.THESIS2),
    M: text(row.THESIS3),
  };
  const positions = Object.values(positionsByLocation).filter(Boolean);

  if (!lineNumber && !code && !description && !quantity && positions.length === 0) {
    return null;
  }

  return {
    lineNumber,
    code,
    description,
    quantity,
    positions,
    positionsByLocation,
  };
}

function formatPickingPosition(value: string) {
  return value
    .replace(/^[PCM]\s*>/iu, "")
    .split(">")
    .map((segment) => segment.trim().replace(/^-+|-+$/g, ""))
    .filter(Boolean)
    .join(" · ");
}

export function getPickingPositionsForBranch(
  detail: PickingListDetail,
  branch: string
) {
  const location = getStorageThesiByBranchCode(branch);
  const position = location
    ? formatPickingPosition(detail.positionsByLocation[location])
    : "";

  return position ? [position] : [];
}

function getPickingOrderTimestamp(order: PickingListOrder) {
  const value = order.submittedAt || order.transactionDate;
  const normalizedValue = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? value.replace(" ", "T")
    : value;
  const timestamp = Date.parse(normalizedValue);

  return Number.isNaN(timestamp) ? null : timestamp;
}

export function groupPickingListRows(
  rows: PickingListLine[],
  fallbackStatus: PickingStatus = "S1"
): PickingListOrder[] {
  const orders = new Map<string, PickingListOrder>();

  rows.forEach((row) => {
    const findoc = text(row.FINDOC);
    if (!findoc) return;

    let order = orders.get(findoc);

    if (!order) {
      order = {
        findoc,
        fincode: text(row.FINCODE),
        series: text(row.SERIES),
        seriesNumber: text(row.SERIESNUM),
        parastatiko: text(row.PARASTATIKO),
        customerCode: text(row.CODE),
        customerName: text(row.NAME),
        afm: text(row.AFM),
        branch: text(row.BRANCH),
        submittedBy: text(row.CCCEXTUSER),
        transactionDate: text(row.TrnDate),
        submittedAt: text(row.InsDate),
        comments: text(row.COMMENTS),
        retailCustomerName: text(row.LPELATIS),
        remarks: text(row.REMARKS),
        pickerComment: text(row.VARCHAR01),
        status: normalizePickingStatus(
          row.STATUS_ORDER || row.VARCHAR02,
          fallbackStatus
        ),
        details: [],
      };
      orders.set(findoc, order);
    } else {
      order.fincode ||= text(row.FINCODE);
      order.series ||= text(row.SERIES);
      order.seriesNumber ||= text(row.SERIESNUM);
      order.parastatiko ||= text(row.PARASTATIKO);
      order.customerCode ||= text(row.CODE);
      order.customerName ||= text(row.NAME);
      order.afm ||= text(row.AFM);
      order.branch ||= text(row.BRANCH);
      order.submittedBy ||= text(row.CCCEXTUSER);
      order.transactionDate ||= text(row.TrnDate);
      order.submittedAt ||= text(row.InsDate);
      order.comments ||= text(row.COMMENTS);
      order.retailCustomerName ||= text(row.LPELATIS);
      order.remarks ||= text(row.REMARKS);
      order.pickerComment ||= text(row.VARCHAR01);

      const rowStatus = row.STATUS_ORDER || row.VARCHAR02;
      if (isPickingStatus(rowStatus)) {
        order.status = normalizePickingStatus(rowStatus);
      }
    }

    const detail = toDetail(row);
    if (detail) order.details.push(detail);
  });

  return Array.from(orders.values()).sort((left, right) => {
    const leftTimestamp = getPickingOrderTimestamp(left);
    const rightTimestamp = getPickingOrderTimestamp(right);

    if (leftTimestamp === null && rightTimestamp === null) return 0;
    if (leftTimestamp === null) return 1;
    if (rightTimestamp === null) return -1;

    return leftTimestamp - rightTimestamp;
  });
}

export function shouldShowRetailCustomerName(
  order: Pick<PickingListOrder, "comments" | "retailCustomerName">
) {
  if (!order.retailCustomerName) return false;

  const orderType = order.comments.toLocaleUpperCase("el-GR");
  const isWholesale = orderType.includes("ΧΟΝΔΡΙΚ");
  const isReceipt =
    orderType.includes("ΛΙΑΝΙΚ") || orderType.includes("ΑΠΟΔΕΙΞ");

  return !isWholesale && isReceipt;
}

export function formatPickingOrderComments(comments: string) {
  if (!comments.toLocaleUpperCase("el-GR").includes("ΛΙΑΝΙΚ")) {
    return comments;
  }

  return comments.replace(/([ΑA]\/[ΑA])\s*(\d+)/gu, "$1 $2");
}

export function matchesPickingOrderSearch(
  order: PickingListOrder,
  search: string
) {
  const normalizedSearch = search.trim().toLocaleLowerCase("el-GR");
  if (!normalizedSearch) return true;

  const orderText = [
    order.parastatiko,
    order.findoc,
    order.customerName,
    order.customerCode,
    order.afm,
    order.submittedBy,
    order.comments,
    shouldShowRetailCustomerName(order) ? order.retailCustomerName : "",
    order.remarks,
    order.pickerComment,
    order.submittedAt,
    ...order.details.flatMap((detail) => [
      detail.code,
      detail.description,
      ...detail.positions,
    ]),
  ]
    .join(" ")
    .toLocaleLowerCase("el-GR");

  return orderText.includes(normalizedSearch);
}
