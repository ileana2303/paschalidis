import { parseSoftOneNumber } from "@/lib/utils/number";
import type {
    BasePricePurDocument,
    BasePricePurDocumentHeader,
    IBasePricePurListRow,
} from "./types";

const HEADER_KEYS: Array<keyof BasePricePurDocumentHeader> = [
    "FINDOC",
    "FINCODE",
    "TRNDATE",
    "SOSOURCE",
    "SERIES",
    "PARASTATIKO",
    "TFPRMS",
    "TRDR_CODE",
    "PROMITHEYTIS",
    "BRANCH",
    "ELEGMENO",
    "AKSIA",
    "EIDI",
    "PROS_ANATIMISI",
    "ME_NEO_KOSTOS",
    "FTHINOTERA",
    "KOSTOS_ASYNCHRONISTO",
    "XORIS_SUFIX",
];

function pickHeader(row: IBasePricePurListRow): BasePricePurDocumentHeader {
    const header = {} as BasePricePurDocumentHeader;

    for (const key of HEADER_KEYS) {
        header[key] = row[key];
    }

    return header;
}

function compareDocumentsByWork(a: BasePricePurDocument, b: BasePricePurDocument) {
    const aWork =
        parseSoftOneNumber(a.header.PROS_ANATIMISI) ??
        Number(a.header.PROS_ANATIMISI) ??
        0;
    const bWork =
        parseSoftOneNumber(b.header.PROS_ANATIMISI) ??
        Number(b.header.PROS_ANATIMISI) ??
        0;

    if (bWork !== aWork) {
        return bWork - aWork;
    }

    const aDate = a.header.TRNDATE;
    const bDate = b.header.TRNDATE;

    return bDate.localeCompare(aDate);
}

export function groupBasePriceRowsByFindoc(
    rows: IBasePricePurListRow[]
): BasePricePurDocument[] {
    const byFindoc = new Map<string, IBasePricePurListRow[]>();

    for (const row of rows) {
        const findoc = String(row.FINDOC ?? "").trim();
        if (!findoc) continue;

        const group = byFindoc.get(findoc);
        if (group) {
            group.push(row);
        } else {
            byFindoc.set(findoc, [row]);
        }
    }

    const documents: BasePricePurDocument[] = [];

    for (const [findoc, lines] of byFindoc) {
        if (lines.length === 0) continue;

        documents.push({
            findoc,
            header: pickHeader(lines[0]),
            lines,
        });
    }

    documents.sort(compareDocumentsByWork);

    return documents;
}
