import { NextRequest } from "next/server";
import { handlePartInsightsRequest } from "@/app/api/items/part-insights";

export async function POST(req: NextRequest) {
    return handlePartInsightsRequest(req, {
        sqlName: "LAST_ORDERS_TRDR_MTRL",
        logLabel: "[items/last-orders]",
    });
}
