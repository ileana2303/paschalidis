import { NextRequest, NextResponse } from "next/server";
import type { PriceTierGroupsResponse } from "@/lib/price-tiers/types";
import { callTierSql, field, getSessionUsername, jsonFailure } from "../_lib/shared";

/** Active customer groups (TIER_TRDPGROUP) for the assignment dropdown. */
export async function POST(req: NextRequest) {
    try {
        if (!(await getSessionUsername(req))) {
            return jsonFailure("Απαιτείται σύνδεση.", 401);
        }

        const result = await callTierSql(
            "TIER_TRDPGROUP",
            {},
            "Αποτυχία φόρτωσης των ομάδων πελατών."
        );
        if (!result.ok) return jsonFailure(result.message, result.status);

        const response: PriceTierGroupsResponse = {
            success: true,
            groups: result.rows
                .map((row) => ({
                    trdpGroup: field(row, "TRDPGROUP"),
                    code: field(row, "CODE"),
                    name: field(row, "NAME") || field(row, "TRD_NAME"),
                }))
                .filter((group) => group.trdpGroup),
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("[price-tiers:groups] Server error", error);
        return jsonFailure(
            error instanceof Error ? error.message : "Σφάλμα διακομιστή.",
            500
        );
    }
}
