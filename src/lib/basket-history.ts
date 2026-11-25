export const BASKET_HISTORY_PATH = "/basket-history";
export const BASKET_HISTORY_ERROR = "Αποτυχία φόρτωσης ιστορικού παραγγελιών.";

export const BASKET_HISTORY_FIELDS = [
  "PIGI",
  "S1_FINDOC",
  "DATE_DELETED",
  "PARASTATIKO",
  "SEIRA",
  "SEIRA_PERIGRAFI",
  "IMEROMINIA",
  "REMARKS",
  "COMMENTS",
  "KATASTASI",
  "TRDR",
  "TRDBRANCH",
  "BRANCH",
] as const;

export type BasketHistoryRow = Record<(typeof BASKET_HISTORY_FIELDS)[number], string>;

export type BasketHistoryResponse = {
  success: boolean;
  totalcount: number;
  rows: BasketHistoryRow[];
  message?: string;
};

export const BASKET_HISTORY_ORDER_ERROR = "Αποτυχία φόρτωσης παραστατικού.";

export function basketHistoryShowsPrices(source: string) {
  const normalized = source.trim().toLocaleUpperCase("el-GR");
  return Boolean(normalized) &&
    normalized !== "ΕΝΔΟΔΙΑΚΙΝΗΣΗ" && normalized !== "ΑΝΑΤΡΟΦΟΔΟΣΙΑ";
}

export const BASKET_HISTORY_ORDER_SECTIONS = {
  SALDOC: {
    title: "Παραστατικό",
    fields: {
      COMPANY: "Εταιρεία",
      FINDOC: "FINDOC",
      SERIES: "Σειρά",
      SERIESNUM: "Αριθμός σειράς",
      BRANCH: "Κατάστημα",
      TRDR: "Συναλλασσόμενος",
      TRDBRANCH_TRDBRANCH_CODE: "Κωδικός υποκαταστήματος",
      TRDBRANCH: "Υποκατάστημα συναλλασσόμενου",
      PAYMENT: "Πληρωμή",
      TRUCKS: "Όχημα",
      DELIVDATE: "Ημερομηνία παράδοσης",
      COMMENTS: "Σχόλια",
      REMARKS: "Παρατηρήσεις",
      SHIPKIND: "Σκοπός διακίνησης",
      SOCASH: "Ταμείο",
      VARCHAR02: "Κατάσταση",
      CCCEXTUSER: "Χρήστης",
    },
  },
  MTRDOC: {
    title: "Διακίνηση",
    fields: {
      QTY: "Ποσότητα",
      WHOUSESEC: "Αποθήκη προορισμού",
      BRANCHSEC: "Κατάστημα προορισμού",
      WHOUSE: "Αποθήκη",
    },
  },
  MTRLINES: {
    title: "Γραμμές ειδών",
    fields: { LINENUM: "Γραμμή", MTRL: "ID είδους", MTRL_MTRL_CODE: "Κωδικός είδους" },
  },
  ITELINES: {
    title: "Ποσότητες και τιμές",
    fields: { MTRL: "ID είδους", QTY1: "Ποσότητα", PRICE: "Τιμή" },
  },
} as const;

export type BasketHistoryOrderDetails = Partial<
  Record<keyof typeof BASKET_HISTORY_ORDER_SECTIONS, Record<string, string>[]>
>;

export type BasketHistoryOrderResponse =
  | { success: true; data: BasketHistoryOrderDetails }
  | { success: false; message: string };

export function mergeBasketHistoryOrderLines(data?: BasketHistoryOrderDetails) {
  const products = data?.MTRLINES ?? [];
  const amounts = data?.ITELINES ?? [];
  const amountIndicesByItem = new Map<string, number[]>();
  amounts.forEach((row, index) => {
    if (!row.MTRL) return;
    const indices = amountIndicesByItem.get(row.MTRL) ?? [];
    indices.push(index);
    amountIndicesByItem.set(row.MTRL, indices);
  });

  const usedAmounts = new Set<number>();
  const matchedIndices = products.map((product) => {
    const index = amountIndicesByItem.get(product.MTRL)?.shift();
    if (index !== undefined) usedAmounts.add(index);
    return index;
  });

  // Some responses omit MTRL from ITELINES and return parallel lists.
  // Only use position when the lists align in length and no IDs conflict.
  if (products.length === amounts.length) {
    products.forEach((product, index) => {
      if (matchedIndices[index] !== undefined || usedAmounts.has(index)) return;
      if (product.MTRL && amounts[index].MTRL) return;
      matchedIndices[index] = index;
      usedAmounts.add(index);
    });
  }

  function toLine(product?: Record<string, string>, amount?: Record<string, string>) {
    return {
      code: product?.MTRL_MTRL_CODE || product?.MTRL || amount?.MTRL || "",
      quantity: amount?.QTY1 ?? "",
      price: amount?.PRICE ?? "",
    };
  }

  return [
    ...products.map((product, index) => {
      const amountIndex = matchedIndices[index];
      return toLine(product, amountIndex === undefined ? undefined : amounts[amountIndex]);
    }),
    ...amounts.flatMap((amount, index) =>
      usedAmounts.has(index) ? [] : [toLine(undefined, amount)]
    ),
  ];
}
