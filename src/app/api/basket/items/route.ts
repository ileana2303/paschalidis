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

        const { trdr, TRDR } = await req.json();
        const normalizedTrdr = trdr ?? TRDR;

        if (!normalizedTrdr || isNaN(Number(normalizedTrdr))) {
            return NextResponse.json(
                { success: false, message: "Customer TRDR is required", totalcount: 0, rows: [] },
                { status: 400 }
            );
        }

        const pool = await getPool();

        const basketResult = await pool
            .request()
            .input("trdr", Number(normalizedTrdr))
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
                totalcount: 0,
                rows: [],
            });
        }

        const basket = basketResult.recordset[0];

        const itemsResult = await pool
            .request()
            .input("trdr", Number(normalizedTrdr))
            .input("basketUID", basket.Uid)
            .query(`
                SELECT 
                    Uid AS BASKETID,
                    CAST(@trdr AS NVARCHAR(50)) AS TRDR,
                    CAST(ProductS1MTRL AS NVARCHAR(50)) AS MTRL,
                    CAST(Qty AS NVARCHAR(50)) AS QTY,
                    CAST(ISNULL(ProductPrice, 0) AS NVARCHAR(50)) AS PRICE_ERP,
                    CAST(ISNULL(ProductBargainPrice, ProductPrice) AS NVARCHAR(50)) AS PRICE_REQ,
                    '' AS BRANCH,
                    '' AS TRD_BRANCH,
                    CAST(ISNULL(BargainStatus, '') AS NVARCHAR(50)) AS IS_APROVED,
                    CAST('' AS NVARCHAR(255)) AS APPUSER_ID,
                    '' AS BASKET_DATE,
                    '' AS INS_DATE,
                    '' AS COMPANY,
                    ISNULL(ProductCode, '') AS CODE,
                    ISNULL(ProductName, '') AS NAME,
                    '' AS CODE2,
                    '' AS CUST_NAME
                FROM BasketItems
                WHERE BasketUID = @basketUID
                    AND DateDeleted IS NULL
                ORDER BY DateIn DESC
            `);

        return NextResponse.json({
            success: true,
            totalcount: basket.CountProducts ?? itemsResult.recordset.length,
            rows: itemsResult.recordset,
        });
    } catch (error) {
        console.error("[basket/items] Server error", error);

        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}
