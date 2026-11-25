import {
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";
import type { ICustomerInfo } from "@/lib/interface";

const S1_APP_ID = "1305";
const S1_SQL_NAME = "BCUSTOMERS";

// BCUSTOMERS matches customer-facing fields (name, code, ΑΦΜ, ...) through SEA
// and does not reliably match the internal TRDR identifier, so a lookup by TRDR
// is resolved by searching with the terms BCUSTOMERS does understand and then
// picking the row whose TRDR is the one we asked for. Candidates are tried from
// the most specific to the broadest and we stop at the first exact TRDR hit.
const MIN_TERM_LENGTH = 3;
const MAX_TERMS = 4;
const MAX_NAME_LENGTH = 120;

// Resolved customers are cached briefly so repeated row clicks (and the hover
// prefetch the client does) never pay for the same ERP round trip twice.
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 300;

type CacheEntry = { customer: ICustomerInfo; expiresAt: number };

const customerCache = new Map<string, CacheEntry>();
const inFlightLookups = new Map<string, Promise<ICustomerInfo | null>>();

function readCache(trdr: string): ICustomerInfo | null {
    const entry = customerCache.get(trdr);

    if (!entry) {
        return null;
    }

    if (entry.expiresAt <= Date.now()) {
        customerCache.delete(trdr);
        return null;
    }

    return entry.customer;
}

function writeCache(trdr: string, customer: ICustomerInfo) {
    if (customerCache.size >= CACHE_MAX_ENTRIES) {
        const oldestKey = customerCache.keys().next().value;

        if (oldestKey !== undefined) {
            customerCache.delete(oldestKey);
        }
    }

    customerCache.set(trdr, { customer, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function normalizeCustomerLookupText(value: unknown, maxLength: number) {
    return typeof value === "string"
        ? value.trim().replace(/\s+/g, " ").slice(0, maxLength)
        : "";
}

function matchesTrdr(value: unknown, trdr: string) {
    const candidate = String(value ?? "").trim();

    if (!candidate) {
        return false;
    }

    if (candidate === trdr) {
        return true;
    }

    const candidateNumber = Number(candidate);
    const trdrNumber = Number(trdr);

    return (
        Number.isFinite(candidateNumber) &&
        Number.isFinite(trdrNumber) &&
        candidateNumber === trdrNumber
    );
}

function buildSearchTerms(trdr: string, name: string) {
    const terms: string[] = [];

    const addTerm = (value: string, minLength = MIN_TERM_LENGTH) => {
        const term = value.trim();

        if (term.length >= minLength && !terms.includes(term)) {
            terms.push(term);
        }
    };

    if (name) {
        addTerm(name);

        // Names coming from the basket list can carry extra wording that the
        // customer record does not have (legal suffixes, punctuation), which
        // makes the full-name search come back empty - the leading tokens are
        // the part that reliably exists in BCUSTOMERS.
        const tokens = name
            .split(" ")
            .filter((token) => token.replace(/[^\p{L}\p{N}]/gu, "").length >= MIN_TERM_LENGTH);

        if (tokens.length > 1) {
            addTerm(tokens.slice(0, 2).join(" "));
        }

        if (tokens.length > 0) {
            addTerm(tokens[0]);
        }
    }

    // Last resort: some installations do index the identifier.
    addTerm(trdr, 1);

    return terms.slice(0, MAX_TERMS);
}

async function searchCustomersByTerm(clientID: string, term: string) {
    const response = await postSoftOne({
        service: "SqlData",
        clientID,
        appId: S1_APP_ID,
        SqlName: S1_SQL_NAME,
        SEA: term,
    });

    if (!response.ok) {
        throw new Error(`Αποτυχία επικοινωνίας με το ERP (HTTP ${response.status}).`);
    }

    const data = (await parseJsonWithEncodingFallback(response)) as {
        success?: boolean;
        message?: string;
        rows?: ICustomerInfo[];
    } | null;

    if (data?.success === false) {
        throw new Error(data.message?.trim() || 'Αποτυχία αναζήτησης πελατών.');
    }

    return Array.isArray(data?.rows) ? data.rows : [];
}

async function resolveCustomer(clientID: string, trdr: string, name: string) {
    for (const term of buildSearchTerms(trdr, name)) {
        const rows = await searchCustomersByTerm(clientID, term);
        const match = rows.find((customer) => matchesTrdr(customer?.TRDR, trdr));

        if (match) {
            return match;
        }
    }

    return null;
}

export async function findCustomerByTrdr(clientID: string, trdr: string, nameHint?: unknown) {
    const cached = readCache(trdr);
    if (cached) return cached;

    const name = normalizeCustomerLookupText(nameHint, MAX_NAME_LENGTH);
    // Concurrent requests with the same search hints share the ERP lookup.
    const lookupKey = `${trdr}::${name}`;
    let lookup = inFlightLookups.get(lookupKey);
    if (!lookup) {
        lookup = resolveCustomer(clientID, trdr, name).finally(() => {
            inFlightLookups.delete(lookupKey);
        });
        inFlightLookups.set(lookupKey, lookup);
    }

    const customer = await lookup;
    if (customer) writeCache(trdr, customer);
    return customer;
}
