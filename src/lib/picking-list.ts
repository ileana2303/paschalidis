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
  TrnDate?: string;
  COMMENTS?: string;
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
  transactionDate: string;
  comments: string;
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
  const index = PICKING_STATUSES.indexOf(status);
  return index >= 0 && index < PICKING_STATUSES.length - 1
    ? PICKING_STATUSES[index + 1]
    : null;
}

export function getFirstInteractionStatus(
  status: PickingStatus
): PickingStatus | undefined {
  return status === "S1" ? "LOADED" : undefined;
}

function toDetail(row: PickingListLine): PickingListDetail | null {
  const lineNumber = text(row.LineNum);
  const code = text(row.DETAIL_CODE);
  const description = text(row.DETAIL_EIDOS);
  const quantity = text(row.Qty1);
  const positions = [row.THESIS1, row.THESIS2, row.THESIS3]
    .map(text)
    .filter(Boolean);

  if (!lineNumber && !code && !description && !quantity && positions.length === 0) {
    return null;
  }

  return {
    lineNumber,
    code,
    description,
    quantity,
    positions,
  };
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
        transactionDate: text(row.TrnDate),
        comments: text(row.COMMENTS),
        pickerComment: text(row.VARCHAR01),
        status: normalizePickingStatus(row.VARCHAR02, fallbackStatus),
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
      order.transactionDate ||= text(row.TrnDate);
      order.comments ||= text(row.COMMENTS);
      order.pickerComment ||= text(row.VARCHAR01);

      if (isPickingStatus(row.VARCHAR02)) {
        order.status = normalizePickingStatus(row.VARCHAR02);
      }
    }

    const detail = toDetail(row);
    if (detail) order.details.push(detail);
  });

  return Array.from(orders.values());
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
    order.comments,
    order.pickerComment,
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
