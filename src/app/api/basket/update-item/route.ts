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

        const { trdr, itemUid, qty } = await req.json();

        if (!trdr || !itemUid || isNaN(Number(trdr))) {
            return NextResponse.json(
                { success: false, message: "Customer TRDR and Item UID are required" },
                { status: 400 }
            );
        }

        if (!qty || isNaN(Number(qty)) || Number(qty) <= 0) {
            return NextResponse.json(
                { success: false, message: "Quantity must be a positive number" },
                { status: 400 }
            );
        }

        const pool = await getPool();

        const basketCheck = await pool
            .request()
            .input("trdr", Number(trdr))
            .query(`
                SELECT TOP 1 Uid
                FROM Baskets
                WHERE CustomerS1TRDR = @trdr
                    AND LinkedOrderID IS NULL
                    AND DateDeleted IS NULL
                ORDER BY DateIn DESC
            `);

        if (basketCheck.recordset.length === 0) {
            return NextResponse.json(
                { success: false, message: "Basket not found or already submitted" },
                { status: 404 }
            );
        }

        const basketUid = basketCheck.recordset[0].Uid;

        const result = await pool
            .request()
            .input("itemUid", itemUid)
            .input("basketUid", basketUid)
            .input("qty", Number(qty))
            .query(`
                UPDATE BasketItems
                SET Qty = @qty
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
            message: "Item quantity updated",
        });
    } catch (error) {
        console.error("[basket/update-item] Server error", error);

        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}
