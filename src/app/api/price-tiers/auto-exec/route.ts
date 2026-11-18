import { NextRequest, NextResponse } from "next/server";
import {
    callTierSql,
    getFirstRowOutcome,
    getSessionUsername,
    jsonFailure,
} from "../_lib/shared";

/** Recalculates the automatic customer tiers without loading the management grid. */
export async function POST(req: NextRequest) {
    try {
        if (!(await getSessionUsername(req))) {
            return jsonFailure("Απαιτείται σύνδεση.", 401);
        }

        const prepared = await callTierSql(
            "TIER_AUTO_EXEC",
            {},
            "Αποτυχία ανανέωσης των αυτόματων βαθμίδων τιμών."
        );
        if (!prepared.ok) return jsonFailure(prepared.message, prepared.status);

        const outcome = getFirstRowOutcome(
            prepared.rows,
            "Αποτυχία ανανέωσης των αυτόματων βαθμίδων τιμών."
        );
        if (!outcome.ok) return jsonFailure(outcome.message, 502);

        return NextResponse.json({
            success: true,
            message: "Οι αυτόματες βαθμίδες τιμών ανανεώθηκαν.",
        });
    } catch (error) {
        console.error("[price-tiers:auto-exec] Server error", error);
        return jsonFailure(
            error instanceof Error ? error.message : "Σφάλμα διακομιστή.",
            500
        );
    }
}
