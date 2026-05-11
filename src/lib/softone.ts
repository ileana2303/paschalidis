
const DEFAULT_SOFTONE_ENDPOINT = "";
const GREEK_FALLBACK_ENCODINGS = ["windows-1253", "iso-8859-7"] as const;

type SoftOnePostOptions = {
    endpoint?: string;
    endpointEnvKey?: string;
    defaultEndpoint?: string;
    fallbackToGenericEndpoint?: boolean;
};

export function sanitizeEnvValue(value: string | undefined): string {
    return value?.trim().replace(/^['"]|['"]$/g, "") ?? "";
}

export function getEnvString(name: string): string {
    return sanitizeEnvValue(process.env[name]);
}

export function getSoftOneEndpoint({
    endpointEnvKey = "S1_ENDPOINT",
    defaultEndpoint = DEFAULT_SOFTONE_ENDPOINT,
    fallbackToGenericEndpoint = true,
}: Pick<
    SoftOnePostOptions,
    "endpointEnvKey" | "defaultEndpoint" | "fallbackToGenericEndpoint"
> = {}): string {
    const configuredEndpoint = endpointEnvKey ? getEnvString(endpointEnvKey) : "";
    const genericEndpoint =
        fallbackToGenericEndpoint && endpointEnvKey && endpointEnvKey !== "S1_ENDPOINT"
            ? getEnvString("S1_ENDPOINT")
            : "";
    const endpoint = configuredEndpoint || genericEndpoint || defaultEndpoint;

    if (!endpoint) {
        throw new Error('Το endpoint του SoftOne δεν είναι ρυθμισμένο.');
    }

    return endpoint;
}

export function getSoftOneClientID(
    branch?: string | number,
    envKey = "S1_CLIENT_ID"
): string {
    const normalizedBranch = String(branch ?? "").trim();
    const branchClientID = normalizedBranch
        ? getEnvString(`${envKey}_${normalizedBranch}`)
        : "";

    return branchClientID || getEnvString(envKey);
}

export function getSoftOneSetDataClientID(
    branch?: string | number,
    { endo = false }: { endo?: boolean } = {}
): string {
    const normalizedBranch = String(branch ?? "").trim();
    const endoBranchClientID =
        endo && normalizedBranch
            ? getEnvString(`S1_ENDO_SETDATA_CLIENT_ID_${normalizedBranch}`)
            : "";
    const setDataBranchClientID = normalizedBranch
        ? getEnvString(`S1_SETDATA_CLIENT_ID_${normalizedBranch}`)
        : "";
    const setDataClientID = getEnvString("S1_SETDATA_CLIENT_ID");
    const sqlBranchClientID = normalizedBranch
        ? getEnvString(`S1_CLIENT_ID_${normalizedBranch}`)
        : "";
    const sqlClientID = getSoftOneClientID();

    return (
        endoBranchClientID ||
        setDataBranchClientID ||
        setDataClientID ||
        sqlBranchClientID ||
        sqlClientID
    );
}

function getCharset(contentType: string | null) {
    if (!contentType) {
        return null;
    }

    const match = contentType.match(/charset=([^;]+)/i);
    return match?.[1]?.trim().toLowerCase() ?? null;
}

export async function parseJsonWithEncodingFallback<T = unknown>(
    response: Response
): Promise<T> {
    const bytes = new Uint8Array(await response.arrayBuffer());
    const candidateEncodings = new Set<string>();
    const declaredCharset = getCharset(response.headers.get("content-type"));

    if (declaredCharset) {
        candidateEncodings.add(declaredCharset);
    }

    candidateEncodings.add("utf-8");

    for (const encoding of GREEK_FALLBACK_ENCODINGS) {
        candidateEncodings.add(encoding);
    }

    let lastError: Error | null = null;

    for (const encoding of candidateEncodings) {
        try {
            const text = new TextDecoder(encoding).decode(bytes);

            if (encoding === "utf-8" && text.includes("\uFFFD")) {
                continue;
            }

            return JSON.parse(text) as T;
        } catch (error) {
            lastError =
                error instanceof Error
                    ? error
                    : new Error('Αποτυχία ανάγνωσης απάντησης από το ERP.');
        }
    }

    throw lastError ?? new Error('Αποτυχία ανάγνωσης απάντησης από το ERP.');
}

export async function postSoftOne(
    payload: unknown,
    options: SoftOnePostOptions = {}
): Promise<Response> {
    const endpoint =
        sanitizeEnvValue(options.endpoint) ||
        getSoftOneEndpoint({
            endpointEnvKey: options.endpointEnvKey,
            defaultEndpoint: options.defaultEndpoint,
            fallbackToGenericEndpoint: options.fallbackToGenericEndpoint,
        });

    return fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
}
