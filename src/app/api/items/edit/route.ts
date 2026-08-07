import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
    getSoftOneClientID,
    getSoftOneSetDataClientID,
    parseJsonWithEncodingFallback,
    postSoftOne,
} from "@/lib/softone";

type EditableValue = string | number | boolean | null;
type ItemFields = Record<string, EditableValue>;

const EDITABLE_FIELD_NAMES = new Set([
    "CODE",
    "CODE1",
    "CODE2",
    "MTRUNIT1",
    "NAME",
    "PRICEW",
    "PRICEW01",
    "PRICEW02",
    "PRICEW03",
    "PRICEW04",
    "PRICEW05",
    "MTRMANFCTR",
    "VARCHAR1",
    "VARCHAR2",
    "VARCHAR3",
    "BOOL03",
    "CCCSUFIX",
]);

const ITEEXTRA_EDITABLE_FIELD_NAMES = new Set([
    "VARCHAR01",
    "VARCHAR02",
    "VARCHAR03",
    "BOOL03",
    "DATE03",
]);

const EMPTY_ITEEXTRA_FIELDS: ItemFields = {
    VARCHAR01: "",
    VARCHAR02: "",
    VARCHAR03: "",
    BOOL03: "",
    DATE03: "",
};

function normalizeKey(value: unknown): string {
    return typeof value === "string" || typeof value === "number"
        ? String(value).trim()
        : "";
}

function isAuthenticated(req: NextRequest): boolean {
    return Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value?.trim());
}

function isEditableValue(value: unknown): value is EditableValue {
    return (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null
    );
}

function normalizeFields(
    value: unknown,
    allowedNames: Set<string>
): ItemFields | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }

    const fields: ItemFields = {};

    for (const [rawName, rawValue] of Object.entries(value)) {
        const name = rawName.trim().toUpperCase();

        if (!/^[A-Z][A-Z0-9_]*$/.test(name)) {
            return null;
        }
        if (!allowedNames.has(name)) {
            continue;
        }
        if (!isEditableValue(rawValue)) {
            return null;
        }

        fields[name] = rawValue;
    }

    return fields;
}

function asItemFields(value: unknown): ItemFields | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }

    const fields: ItemFields = {};

    for (const [rawName, rawValue] of Object.entries(value)) {
        const name = rawName.trim().toUpperCase();

        if (!/^[A-Z][A-Z0-9_]*$/.test(name) || !isEditableValue(rawValue)) {
            continue;
        }

        fields[name] = rawValue;
    }

    return fields;
}

function pickItemExtra(value: unknown): ItemFields {
    const source = asItemFields(value) ?? {};

    return {
        ...EMPTY_ITEEXTRA_FIELDS,
        ...Object.fromEntries(
            Object.entries(source).filter(([name]) =>
                ITEEXTRA_EDITABLE_FIELD_NAMES.has(name)
            )
        ),
        ...(source.LINENUM != null ? { LINENUM: source.LINENUM } : {}),
        ...(source.MTRL != null ? { MTRL: source.MTRL } : {}),
    };
}

export async function POST(req: NextRequest) {
    try {
        if (!isAuthenticated(req)) {
            return NextResponse.json(
                { success: false, message: "Απαιτείται σύνδεση." },
                { status: 401 }
            );
        }

        const { key: rawKey } = (await req.json()) as { key?: unknown };
        const key = normalizeKey(rawKey);
        const clientID = getSoftOneClientID();

        if (!key) {
            return NextResponse.json(
                { success: false, message: "Απαιτείται το KEY του προϊόντος." },
                { status: 400 }
            );
        }

        if (!clientID) {
            return NextResponse.json(
                { success: false, message: "Δεν έχει ρυθμιστεί ο πελάτης SoftOne." },
                { status: 500 }
            );
        }

        const response = await postSoftOne({
            service: "getData",
            clientID,
            appId: "1305",
            OBJECT: "ITEM",
            KEY: key,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[items/edit] getData upstream error:", errorText);
            return NextResponse.json(
                { success: false, message: "Αποτυχία επικοινωνίας με το ERP." },
                { status: response.status }
            );
        }

        const data = await parseJsonWithEncodingFallback<{
            success?: boolean;
            message?: string;
            data?: { ITEM?: unknown[]; ITEEXTRA?: unknown[] };
        }>(response);

        if (data?.success === false) {
            return NextResponse.json(
                {
                    success: false,
                    message: data.message || "Το προϊόν δεν βρέθηκε.",
                },
                { status: 404 }
            );
        }

        const item = data?.data?.ITEM?.[0];

        if (!item || typeof item !== "object" || Array.isArray(item)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Η απάντηση του SoftOne δεν περιέχει στοιχεία ITEM.",
                },
                { status: 502 }
            );
        }

        const itemExtra = pickItemExtra(data?.data?.ITEEXTRA?.[0]);

        return NextResponse.json({ success: true, key, item, itemExtra });
    } catch (error) {
        console.error("[items/edit] getData server error:", error);
        return NextResponse.json(
            { success: false, message: "Σφάλμα διακομιστή." },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest) {
    try {
        if (!isAuthenticated(req)) {
            return NextResponse.json(
                { success: false, message: "Απαιτείται σύνδεση." },
                { status: 401 }
            );
        }

        const body = (await req.json()) as {
            key?: unknown;
            fields?: unknown;
            itemExtra?: unknown;
        };
        const key = normalizeKey(body.key);
        const fields = body.fields
            ? normalizeFields(body.fields, EDITABLE_FIELD_NAMES)
            : null;
        const itemExtra = body.itemExtra
            ? normalizeFields(body.itemExtra, ITEEXTRA_EDITABLE_FIELD_NAMES)
            : null;
        const clientID = getSoftOneSetDataClientID();

        if (!key) {
            return NextResponse.json(
                { success: false, message: "Απαιτείται το KEY του προϊόντος." },
                { status: 400 }
            );
        }

        const hasItemFields = Boolean(fields && Object.keys(fields).length > 0);
        const hasItemExtraFields = Boolean(
            itemExtra && Object.keys(itemExtra).length > 0
        );

        if (!hasItemFields && !hasItemExtraFields) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Δεν υπάρχουν έγκυρα πεδία για αποθήκευση.",
                },
                { status: 400 }
            );
        }

        if (!clientID) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Δεν έχει ρυθμιστεί ο πελάτης setData του SoftOne.",
                },
                { status: 500 }
            );
        }

        const setDataPayload: {
            ITEM?: ItemFields[];
            ITEEXTRA?: ItemFields[];
        } = {};

        if (hasItemFields && fields) {
            setDataPayload.ITEM = [fields];
        }

        if (hasItemExtraFields && itemExtra) {
            const identity = asItemFields(body.itemExtra) ?? {};
            setDataPayload.ITEEXTRA = [
                {
                    ...(identity.LINENUM != null
                        ? { LINENUM: identity.LINENUM }
                        : {}),
                    ...(identity.MTRL != null ? { MTRL: identity.MTRL } : {}),
                    ...itemExtra,
                },
            ];
        }

        const response = await postSoftOne({
            service: "setData",
            clientID,
            appId: "1305",
            OBJECT: "ITEM",
            KEY: key,
            data: setDataPayload,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[items/edit] setData upstream error:", errorText);
            return NextResponse.json(
                { success: false, message: "Αποτυχία επικοινωνίας με το ERP." },
                { status: response.status }
            );
        }

        const data = await parseJsonWithEncodingFallback<{
            success?: boolean;
            message?: string;
            id?: string | number;
        }>(response);

        if (data?.success === false) {
            return NextResponse.json(
                {
                    ...data,
                    message:
                        data.message || "Το SoftOne απέρριψε την ενημέρωση.",
                },
                { status: 502 }
            );
        }

        return NextResponse.json({
            ...data,
            success: true,
            message: "Το προϊόν ενημερώθηκε επιτυχώς.",
        });
    } catch (error) {
        console.error("[items/edit] setData server error:", error);
        return NextResponse.json(
            { success: false, message: "Σφάλμα διακομιστή." },
            { status: 500 }
        );
    }
}
