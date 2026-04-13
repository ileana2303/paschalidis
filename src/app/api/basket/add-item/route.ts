import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getPool } from "@/lib/db/connection";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const { basketUid, productCode, productName, productS1MTRL, qty, productPrice } =
            await req.json();

        if (!basketUid) {
            return NextResponse.json(
                { success: false, message: "Basket UID is required" },
                { status: 400 }
            );
        }

        if (!productS1MTRL || isNaN(Number(productS1MTRL))) {
            return NextResponse.json(
                { success: false, message: "Product S1 MTRL is required" },
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

        // Check if this product already exists in the basket
        const existingItem = await pool
            .request()
            .input("basketUid", basketUid)
            .input("productS1MTRL", Number(productS1MTRL))
            .query(`
                SELECT Uid, Qty FROM BasketItems
                WHERE BasketUID = @basketUid
                    AND ProductS1MTRL = @productS1MTRL
                    AND DateDeleted IS NULL
            `);

        if (existingItem.recordset.length > 0) {
            // Update quantity of existing item
            const newQty = Number(existingItem.recordset[0].Qty) + Number(qty);

            await pool
                .request()
                .input("itemUid", existingItem.recordset[0].Uid)
                .input("qty", newQty)
                .query(`
                    UPDATE BasketItems
                    SET Qty = @qty
                    WHERE Uid = @itemUid
                `);
        } else {
            // Insert new item
            const itemUid = randomUUID();

            await pool
                .request()
                .input("uid", itemUid)
                .input("basketUid", basketUid)
                .input("productCode", productCode ?? null)
                .input("productName", productName ?? null)
                .input("productS1MTRL", Number(productS1MTRL))
                .input("qty", Number(qty))
                .input("productPrice", productPrice != null ? Number(productPrice) : null)
                .query(`
                    INSERT INTO BasketItems 
                        (Uid, BasketUID, ProductCode, ProductName, ProductS1MTRL, Qty, ProductPrice, DateIn)
                    VALUES 
                        (@uid, @basketUid, @productCode, @productName, @productS1MTRL, @qty, @productPrice, GETDATE())
                `);
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
            message: "Item added to basket",
        });
    } catch (error) {
        console.error("[basket/add-item] Server error", error);

        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}
