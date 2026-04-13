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

        const { basketUid, itemUid } = await req.json();

        if (!basketUid || !itemUid) {
            return NextResponse.json(
                { success: false, message: "Basket UID and Item UID are required" },
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

        // Soft-delete the item
        const result = await pool
            .request()
            .input("itemUid", itemUid)
            .input("basketUid", basketUid)
            .query(`
                UPDATE BasketItems
                SET DateDeleted = GETDATE()
                WHERE Uid = @itemUid
                    AND BasketUID = @basketUid
                    AND DateDeleted IS NULL
            `);

        if (result.rowsAffected[0] === 0) {
            return NextResponse.json(
                { success: false, message: "Item not found in basket" },
                { status: 404 }
            );
        }

        // Update basket totals
        await pool
            .request()
            .input("basketUid", basketUid)
            .query(`
                UPDATE Baskets
                SET CountProducts = (
                        SELECT COUNT(*) FROM BasketItems
                        WHERE BasketUID = @basketUid AND DateDeleted IS NULL
                    ),
                    TotalCost = (
                        SELECT ISNULL(SUM(Qty * ISNULL(ProductBargainPrice, ProductPrice)), 0)
                        FROM BasketItems
                        WHERE BasketUID = @basketUid AND DateDeleted IS NULL
                    )
                WHERE Uid = @basketUid
            `);

        return NextResponse.json({
            success: true,
            message: "Item removed from basket",
        });
    } catch (error) {
        console.error("[basket/remove-item] Server error", error);

        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}
