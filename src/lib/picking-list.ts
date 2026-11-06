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

export const PICKING_ORDER_TYPES = [
  "WHOLESALE",
  "RETAIL",
  "REPLENISHMENT",
  "INTERNAL_TRANSFER",
] as const;

export type PickingOrderType =
  | (typeof PICKING_ORDER_TYPES)[number]
  | "OTHER";
export type PickingOrderTypeFilter = "ALL" | PickingOrderType;
export type PickingOrderSortKey = "customerName" | "date" | "orderType";
export type PickingOrderSortDirection = "asc" | "desc";

export const PICKING_ORDER_TYPE_OPTIONS: ReadonlyArray<{
  value: (typeof PICKING_ORDER_TYPES)[number];
  label: string;
  tone: string;
  selectedTone: string;
  borderTone: string;
}> = [
  {
    value: "WHOLESALE",
    label: "Χονδρική",
    tone:
      "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/30",
    selectedTone:
      "bg-sky-600 text-white ring-sky-600 shadow-theme-xs dark:bg-sky-500 dark:ring-sky-500",
    borderTone: "border-l-sky-500 dark:border-l-sky-500",
  },
  {
    value: "RETAIL",
    label: "Λιανική",
    tone:
      "bg-violet-50 text-violet-800 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-200 dark:ring-violet-500/30",
    selectedTone:
      "bg-violet-600 text-white ring-violet-600 shadow-theme-xs dark:bg-violet-500 dark:ring-violet-500",
    borderTone: "border-l-violet-500 dark:border-l-violet-500",
  },
  {
    value: "REPLENISHMENT",
    label: "Ανατροφοδοσία",
    tone:
      "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30",
    selectedTone:
      "bg-amber-500 text-white ring-amber-500 shadow-theme-xs dark:bg-amber-500 dark:ring-amber-500",
    borderTone: "border-l-amber-500 dark:border-l-amber-500",
  },
  {
    value: "INTERNAL_TRANSFER",
    label: "Ενδοδιακίνηση",
    tone:
      "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/30",
    selectedTone:
      "bg-emerald-600 text-white ring-emerald-600 shadow-theme-xs dark:bg-emerald-500 dark:ring-emerald-500",
    borderTone: "border-l-emerald-500 dark:border-l-emerald-500",
  },
];

export const PICKING_OTHER_ORDER_TYPE_OPTION = {
  value: "OTHER" as const,
  label: "Άλλο",
  tone:
    "bg-gray-100 text-gray-700 ring-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700",
  selectedTone:
    "bg-gray-700 text-white ring-gray-700 shadow-theme-xs dark:bg-gray-200 dark:text-gray-900 dark:ring-gray-200",
  borderTone: "border-l-gray-400 dark:border-l-gray-500",
};

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
  branch: string;
  pickerComment?: string;
  status?: PickingStatus;
};

export type PickingListUpdateResponse = {
  success: boolean;
  message?: string;
};

export type PickingListDeletePayload = {
  findoc: string;
  branch: string;
};

export type PickingListDeleteResponse = {
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

export function getPickingOrderTimestamp(order: PickingListOrder) {
  const value = order.submittedAt || order.transactionDate;
  const normalizedValue = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? value.replace(" ", "T")
    : value;
  const timestamp = Date.parse(normalizedValue);

  return Number.isNaN(timestamp) ? null : timestamp;
}

export function getPickingOrderType(
  order: Pick<PickingListOrder, "comments">
): PickingOrderType {
  const comments = order.comments.toLocaleUpperCase("el-GR");

  if (comments.includes("ΑΝΑΤΡΟΦΟΔΟΣ")) return "REPLENISHMENT";
  if (
    comments.includes("ΕΝΔΟΔΙΑΚ") ||
    (comments.includes("ΠΑΡΑΣΤΑΤΙΚΟ") && /-{1,2}>/u.test(comments))
  ) {
    return "INTERNAL_TRANSFER";
  }
  if (comments.includes("ΛΙΑΝΙΚ") || comments.includes("ΑΠΟΔΕΙΞ")) {
    return "RETAIL";
  }
  if (comments.includes("ΧΟΝΔΡΙΚ") || comments.includes("B2B")) {
    return "WHOLESALE";
  }

  return "OTHER";
}

export function getPickingOrderTypeOption(type: PickingOrderType) {
  return (
    PICKING_ORDER_TYPE_OPTIONS.find((option) => option.value === type) ??
    PICKING_OTHER_ORDER_TYPE_OPTION
  );
}

const PICKING_ORDER_TYPE_RANK: Record<PickingOrderType, number> = {
  WHOLESALE: 0,
  RETAIL: 1,
  REPLENISHMENT: 2,
  INTERNAL_TRANSFER: 3,
  OTHER: 4,
};

export function sortPickingOrders(
  orders: PickingListOrder[],
  sortKey: PickingOrderSortKey,
  direction: PickingOrderSortDirection
) {
  const directionMultiplier = direction === "asc" ? 1 : -1;

  return orders
    .map((order, index) => ({ order, index }))
    .sort((left, right) => {
      let comparison = 0;

      if (sortKey === "customerName") {
        comparison = left.order.customerName.localeCompare(
          right.order.customerName,
          "el",
          { numeric: true, sensitivity: "base" }
        );
      } else if (sortKey === "date") {
        const leftTimestamp = getPickingOrderTimestamp(left.order);
        const rightTimestamp = getPickingOrderTimestamp(right.order);

        if (leftTimestamp === null && rightTimestamp !== null) return 1;
        if (leftTimestamp !== null && rightTimestamp === null) return -1;
        comparison = (leftTimestamp ?? 0) - (rightTimestamp ?? 0);
      } else {
        comparison =
          PICKING_ORDER_TYPE_RANK[getPickingOrderType(left.order)] -
          PICKING_ORDER_TYPE_RANK[getPickingOrderType(right.order)];
      }

      if (comparison !== 0) return comparison * directionMultiplier;

      const leftTimestamp = getPickingOrderTimestamp(left.order) ?? 0;
      const rightTimestamp = getPickingOrderTimestamp(right.order) ?? 0;
      const timestampComparison = rightTimestamp - leftTimestamp;

      return timestampComparison || left.index - right.index;
    })
    .map(({ order }) => order);
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

    return rightTimestamp - leftTimestamp;
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
