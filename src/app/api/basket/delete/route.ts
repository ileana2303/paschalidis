import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getPool } from "@/lib/db/connection";

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const { basketUid } = await req.json();

        if (!basketUid) {
            return NextResponse.json(
                { success: false, message: "Basket UID is required" },
                { status: 400 }
            );
        }

        const pool = await getPool();

        // Verify the basket exists and is active
        const basketCheck = await pool
            .request()
            .input("basketUid", basketUid)
            .query(`
                SELECT Uid FROM Baskets
                WHERE Uid = @basketUid
                    AND LinkedOrderID IS NULL
                    AND DateDeleted IS NULL
            `);

        if (basketCheck.recordset.length === 0) {
            return NextResponse.json(
                { success: false, message: "Basket not found or already submitted" },
                { status: 404 }
            );
        }

        // Soft-delete the basket
        await pool
            .request()
            .input("basketUid", basketUid)
            .query(`
                UPDATE Baskets
                SET DateDeleted = GETDATE()
                WHERE Uid = @basketUid;

                UPDATE BasketItems
                SET DateDeleted = GETDATE()
                WHERE BasketUID = @basketUid
                    AND DateDeleted IS NULL;
            `);

        return NextResponse.json({
            success: true,
            message: "Basket deleted",
        });
    } catch (error) {
        console.error("[basket/delete] Server error", error);

        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}
