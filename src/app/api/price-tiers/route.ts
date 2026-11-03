import { NextRequest, NextResponse } from "next/server";
import { normalizeTierValue } from "@/lib/price-tiers/grid";
import type { PriceTierCell, PriceTierGridResponse } from "@/lib/price-tiers/types";
import {
    callTierSql,
    field,
    getFirstRowOutcome,
    getSessionUsername,
    jsonFailure,
    type SoftOneRow,
} from "./_lib/shared";

function toCell(row: SoftOneRow): PriceTierCell {
    const lastUser = field(row, "CCCAPPUSER");

    return {
        autoId: field(row, "AUTOID"),
        mtrGroup: field(row, "MTRGROUP"),
        mtrCode: field(row, "MTR_CODE"),
        mtrName: field(row, "MTR_NAME"),
        trdpGroup: field(row, "TRDPGROUP"),
        trdCode: field(row, "TRD_CODE"),
        trdName: field(row, "TRD_NAME"),
        tier: normalizeTierValue(field(row, "PRICE_TIER", "0")),
        isActive: field(row, "ISACTIVE", "TRUE").toUpperCase() === "TRUE",
        ...(lastUser ? { lastUser } : {}),
    };
}

/** Loads the grid: TIER_AUTO_EXEC fills in missing cells, then TIER_LIST_ALL. */
export async function POST(req: NextRequest) {
    try {
        if (!(await getSessionUsername(req))) {
            return jsonFailure("Απαιτείται σύνδεση.", 401);
        }

        const prepared = await callTierSql(
            "TIER_AUTO_EXEC",
            {},
            "Αποτυχία προετοιμασίας του πλέγματος βαθμίδων."
        );
        if (!prepared.ok) return jsonFailure(prepared.message, prepared.status);

        const preparedOutcome = getFirstRowOutcome(
            prepared.rows,
            "Αποτυχία προετοιμασίας του πλέγματος βαθμίδων."
        );
        if (!preparedOutcome.ok) return jsonFailure(preparedOutcome.message, 502);

        const listed = await callTierSql(
            "TIER_LIST_ALL",
            {},
            "Αποτυχία φόρτωσης του πλέγματος βαθμίδων."
        );
        if (!listed.ok) return jsonFailure(listed.message, listed.status);

        const response: PriceTierGridResponse = {
            success: true,
            cells: listed.rows.map(toCell).filter((cell) => cell.autoId),
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("[price-tiers:load] Server error", error);
        return jsonFailure(
            error instanceof Error ? error.message : "Σφάλμα διακομιστή.",
            500
        );
    }
}
