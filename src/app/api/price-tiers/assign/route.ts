import { NextRequest, NextResponse } from "next/server";
import type { PriceTierAssignResponse } from "@/lib/price-tiers/types";
import {
    callTierSql,
    field,
    getFirstRowOutcome,
    getSessionUsername,
    jsonFailure,
} from "../_lib/shared";

/** Assigns a customer group to a customer through TIER_SET_TO_CUSTOMER. */
export async function POST(req: NextRequest) {
    try {
        if (!(await getSessionUsername(req))) {
            return jsonFailure("Απαιτείται σύνδεση.", 401);
        }

        const body = (await req.json().catch(() => ({}))) as {
            trdr?: unknown;
            trdpGroup?: unknown;
        };
        const trdr = String(body.trdr ?? "").trim();
        const trdpGroup = String(body.trdpGroup ?? "").trim();

        if (!trdr) return jsonFailure("Επιλέξτε πελάτη.", 400);
        if (!trdpGroup) return jsonFailure("Επιλέξτε ομάδα πελάτη.", 400);

        const result = await callTierSql(
            "TIER_SET_TO_CUSTOMER",
            { TRDR: trdr, TRDPGROUP: trdpGroup },
            "Η ανάθεση ομάδας απέτυχε."
        );
        if (!result.ok) return jsonFailure(result.message, result.status);

        const outcome = getFirstRowOutcome(result.rows, "Η ανάθεση ομάδας απέτυχε.");
        if (!outcome.ok) return jsonFailure(outcome.message, 422);

        const response: PriceTierAssignResponse = {
            success: true,
            trdr: field(outcome.row, "TRDR", trdr),
            trdpGroup: field(outcome.row, "TRDPGROUP", trdpGroup),
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("[price-tiers:assign] Server error", error);
        return jsonFailure(
            error instanceof Error ? error.message : "Σφάλμα διακομιστή.",
            500
        );
    }
}
