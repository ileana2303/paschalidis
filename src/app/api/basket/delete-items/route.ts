import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import type { BasketActionResponse, BasketMassDeleteRoutePayload } from "@/app/lib/interface";
import { callMassDelete, MassDeleteError } from "@/app/api/_lib/mass-delete";

const DEFAULT_DELETE_TABLE_ACTION = "USRCUST";
const DEFAULT_DELETE_METHOD = "DELETE";
const DEFAULT_DELETE_S1_KEY = "1305";
const DEFAULT_DELETE_APPUSER_ID = "00000001-0001-0001-0001-000000000001";

function getClientID() {
    return process.env.S1_CLIENT_ID?.trim().replace(/^['"]|['"]$/g, "");
}

export async function DELETE(req: NextRequest) {
    try {
        const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
        if (!sessionCookie?.trim()) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await req.json() as BasketMassDeleteRoutePayload;
        const clientID = getClientID();

        if (!clientID) {
            return NextResponse.json(
                { success: false, message: "S1 client is not configured" },
                { status: 500 }
            );
        }

        const basketIds = Array.isArray(body.basketIds)
            ? body.basketIds
                .map((id) => String(id).trim())
                .filter(Boolean)
            : [];

        if (basketIds.length === 0) {
            return NextResponse.json(
                { success: false, message: "No BASKET IDs provided" },
                { status: 400 }
            );
        }

        const result = await callMassDelete({
            clientID,
            basketIds,
            tableAction: body.tableAction?.trim() || DEFAULT_DELETE_TABLE_ACTION,
            method: body.method?.trim() || DEFAULT_DELETE_METHOD,
            s1Key: String(body.s1Key ?? DEFAULT_DELETE_S1_KEY).trim() || DEFAULT_DELETE_S1_KEY,
            appUserId: body.appUserId?.trim() || DEFAULT_DELETE_APPUSER_ID,
            logLabel: "[basket/delete-items]",
        });

        const responseData: BasketActionResponse = {
            success: true,
            message: result.message ?? "Οι επιλεγμένες γραμμές αφαιρέθηκαν",
        };

        return NextResponse.json(responseData);
    } catch (error) {
        if (error instanceof MassDeleteError) {
            return NextResponse.json(
                { success: false, message: error.message },
                { status: error.status }
            );
        }

        console.error("[basket/delete-items] Server error", error);

        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}
