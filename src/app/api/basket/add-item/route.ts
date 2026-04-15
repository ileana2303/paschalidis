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

        const {
            TRDR,
            MTRL,
            QTY,
            PRICE_ERP,
            PRICE_REQ,
            CODE,
            NAME,
        } =
            await req.json();

        if (!TRDR || isNaN(Number(TRDR))) {
            return NextResponse.json(
                { success: false, message: "Customer TRDR is required" },
                { status: 400 }
            );
        }

        if (!MTRL || isNaN(Number(MTRL))) {
            return NextResponse.json(
                { success: false, message: "Product S1 MTRL is required" },
                { status: 400 }
            );
        }

        if (!QTY || isNaN(Number(QTY)) || Number(QTY) <= 0) {
            return NextResponse.json(
                { success: false, message: "Quantity must be a positive number" },
                { status: 400 }
            );
        }

        const pool = await getPool();

        const existingBasket = await pool
            .request()
            .input("trdr", Number(TRDR))
            .query(`
                SELECT TOP 1 Uid
                FROM Baskets
                WHERE CustomerS1TRDR = @trdr
                    AND LinkedOrderID IS NULL
                    AND DateDeleted IS NULL
                ORDER BY DateIn DESC
            `);

        let basketUid = existingBasket.recordset[0]?.Uid as string | undefined;

        if (!basketUid) {
            basketUid = randomUUID();

            await pool
                .request()
                .input("uid", basketUid)
                .input("trdr", Number(TRDR))
                .input("userUID", session.userUID)
                .query(`
                    INSERT INTO Baskets (Uid, CustomerS1TRDR, CountProducts, TotalCost, CreatedByUID, DateIn)
                    VALUES (@uid, @trdr, 0, 0, @userUID, GETDATE())
                `);
        }

        const existingItem = await pool
            .request()
            .input("basketUid", basketUid)
            .input("productS1MTRL", Number(MTRL))
            .query(`
                SELECT Uid, Qty FROM BasketItems
                WHERE BasketUID = @basketUid
                    AND ProductS1MTRL = @productS1MTRL
                    AND DateDeleted IS NULL
            `);

        if (existingItem.recordset.length > 0) {
            const newQty = Number(existingItem.recordset[0].Qty) + Number(QTY);

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
                .input("productCode", CODE ?? null)
                .input("productName", NAME ?? null)
                .input("productS1MTRL", Number(MTRL))
                .input("qty", Number(QTY))
                .input("productPrice", PRICE_ERP != null ? Number(PRICE_ERP) : null)
                .input(
                    "productBargainPrice",
                    PRICE_REQ != null && Number(PRICE_REQ) !== Number(PRICE_ERP)
                        ? Number(PRICE_REQ)
                        : null
                )
                .query(`
                    INSERT INTO BasketItems 
                        (
                            Uid,
                            BasketUID,
                            ProductCode,
                            ProductName,
                            ProductS1MTRL,
                            Qty,
                            ProductPrice,
                            ProductBargainPrice,
                            DateIn
                        )
                    VALUES 
                        (
                            @uid,
                            @basketUid,
                            @productCode,
                            @productName,
                            @productS1MTRL,
                            @qty,
                            @productPrice,
                            @productBargainPrice,
                            GETDATE()
                        )
                `);
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
