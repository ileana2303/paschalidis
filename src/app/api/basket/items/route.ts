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

        const { trdr } = await req.json();

        if (!trdr || isNaN(Number(trdr))) {
            return NextResponse.json(
                { success: false, message: "Customer TRDR is required" },
                { status: 400 }
            );
        }

        const pool = await getPool();

        // Find the active basket for this customer (not submitted, not deleted)
        const basketResult = await pool
            .request()
            .input("trdr", Number(trdr))
            .input("userUID", session.userUID)
            .query(`
                SELECT TOP 1 
                    Uid, CustomerS1TRDR, CountProducts, TotalCost
                FROM Baskets
                WHERE CustomerS1TRDR = @trdr
                    AND LinkedOrderID IS NULL
                    AND DateDeleted IS NULL
                ORDER BY DateIn DESC
            `);

        if (basketResult.recordset.length === 0) {
            return NextResponse.json({
                success: true,
                basket: null,
            });
        }

        const basket = basketResult.recordset[0];

        // Fetch basket items
        const itemsResult = await pool
            .request()
            .input("basketUID", basket.Uid)
            .query(`
                SELECT 
                    Uid,
                    ProductCode,
                    ProductName,
                    ProductS1MTRL,
                    Qty,
                    ProductPrice,
                    ProductBargainPrice,
                    BargainStatus
                FROM BasketItems
                WHERE BasketUID = @basketUID
                    AND DateDeleted IS NULL
                ORDER BY DateIn DESC
            `);

        return NextResponse.json({
            success: true,
            basket: {
                Uid: basket.Uid,
                CustomerS1TRDR: basket.CustomerS1TRDR,
                CountProducts: basket.CountProducts ?? 0,
                TotalCost: basket.TotalCost ?? 0,
                Items: itemsResult.recordset,
            },
        });
    } catch (error) {
        console.error("[basket/items] Server error", error);

        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}
