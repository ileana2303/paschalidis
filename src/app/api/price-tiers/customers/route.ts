import { NextRequest, NextResponse } from "next/server";
import type {
    PriceTierGroupCustomer,
    PriceTierGroupCustomersResponse,
} from "@/lib/price-tiers/types";
import {
    callTierSql,
    field,
    getSessionUsername,
    jsonFailure,
    type SoftOneRow,
} from "../_lib/shared";

function toCustomer(row: SoftOneRow): PriceTierGroupCustomer {
    return {
        trdr: field(row, "TRDR"),
        code: field(row, "CODE"),
        name: field(row, "NAME"),
        email: field(row, "EMAIL"),
        phone: field(row, "PHONE01"),
        taxId: field(row, "AFM"),
        address: field(row, "MAIN_ADDRESS"),
        zip: field(row, "MAIN_ZIP"),
        city: field(row, "MAIN_CITY"),
        priceTier: field(row, "PRICE_TIER"),
        branchCount: field(row, "NUMBER_OF_BRANCHES"),
        trdpGroup: field(row, "TRDPGROUP"),
        groupCode: field(row, "GROUP_CODE"),
        groupName: field(row, "GROUP_NAME"),
    };
}

/** Lists the customers currently assigned to the requested customer group. */
export async function POST(req: NextRequest) {
    try {
        if (!(await getSessionUsername(req))) {
            return jsonFailure("Απαιτείται σύνδεση.", 401);
        }

        const body = (await req.json().catch(() => ({}))) as {
            trdpGroup?: unknown;
        };
        const trdpGroup = String(body.trdpGroup ?? "").trim();

        if (!trdpGroup) {
            return jsonFailure("Επιλέξτε ομάδα πελάτη.", 400);
        }

        const result = await callTierSql(
            "BCUSTOMERS_BY_GROUP",
            { GRP: trdpGroup },
            "Αποτυχία φόρτωσης των πελατών της ομάδας."
        );
        if (!result.ok) return jsonFailure(result.message, result.status);

        const customers = result.rows.map(toCustomer).filter((customer) => customer.trdr);
        const response: PriceTierGroupCustomersResponse = {
            success: true,
            totalCount: customers.length,
            customers,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("[price-tiers:customers] Server error", error);
        return jsonFailure(
            error instanceof Error ? error.message : "Σφάλμα διακομιστή.",
            500
        );
    }
}
