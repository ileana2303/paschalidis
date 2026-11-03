import { NextRequest, NextResponse } from "next/server";
import { isPriceTierValue, normalizeTierValue } from "@/lib/price-tiers/grid";
import type { PriceTierSaveResponse } from "@/lib/price-tiers/types";
import {
    callTierSql,
    field,
    getFirstRowOutcome,
    getSessionUsername,
    jsonFailure,
} from "../_lib/shared";

/** Saves the tier of a single cell through TIER_SAVE. */
export async function POST(req: NextRequest) {
    try {
        const username = await getSessionUsername(req);
        if (!username) return jsonFailure("Απαιτείται σύνδεση.", 401);

        const body = (await req.json().catch(() => ({}))) as {
            autoId?: unknown;
            tier?: unknown;
        };
        const autoId = String(body.autoId ?? "").trim();
        const tier = normalizeTierValue(body.tier);

        if (!/^\d+$/.test(autoId)) {
            return jsonFailure("Μη έγκυρο κελί βαθμίδας.", 400);
        }

        if (!isPriceTierValue(tier)) {
            return jsonFailure("ΜΗ ΑΠΟΔΕΚΤΗ ΒΑΘΜΙΔΑ", 400);
        }

        const result = await callTierSql(
            "TIER_SAVE",
            { AUTOID: autoId, TIER: tier, APPUSER: username },
            "Η αποθήκευση της βαθμίδας απέτυχε."
        );
        if (!result.ok) return jsonFailure(result.message, result.status);

        const outcome = getFirstRowOutcome(result.rows, "Η αποθήκευση της βαθμίδας απέτυχε.");
        if (!outcome.ok) return jsonFailure(outcome.message, 422);

        const response: PriceTierSaveResponse = {
            success: true,
            autoId: field(outcome.row, "AUTOID", autoId),
            tier: normalizeTierValue(field(outcome.row, "PRICE_TIER", tier)),
            appUser: username,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("[price-tiers:save] Server error", error);
        return jsonFailure(
            error instanceof Error ? error.message : "Σφάλμα διακομιστή.",
            500
        );
    }
}
